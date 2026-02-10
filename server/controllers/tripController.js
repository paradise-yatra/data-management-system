import { performance } from 'node:perf_hooks';
import { z } from 'zod';
import mongoose from 'mongoose';
import Trip from '../models/Trip.js';
import Place from '../models/Place.js';
import PlaceClosure from '../models/PlaceClosure.js';
import { autoScheduleDay } from '../services/logicService.js';
import { getOrCalculateRoute } from '../services/routeCacheService.js';
import {
  getNumericSettingValue,
  getStringSettingValue,
} from '../services/itineraryBuilderSettingsService.js';
import { createTripVersionSnapshot, writeLogicRunLog } from '../services/tripAuditService.js';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const STATUSES = ['DRAFT', 'IN_PROGRESS', 'READY', 'CONFIRMED', 'CANCELLED'];

const createTripSchema = z.object({
  userId: z.string().optional(),
  name: z.string().trim().min(1).optional().default('Untitled Trip'),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  status: z.enum(STATUSES).optional().default('DRAFT'),
});

const updateTripSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    startDate: z.string().min(1).optional(),
    endDate: z.string().min(1).optional(),
    status: z.enum(STATUSES).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be updated',
  });

const tripDayEventSchema = z.object({
  placeId: z.string().refine((value) => mongoose.Types.ObjectId.isValid(value), {
    message: 'Invalid placeId',
  }),
  order: z.number().int().min(0),
});

const upsertTripDaySchema = z.object({
  date: z.string().min(1),
  events: z.array(tripDayEventSchema),
  dayStartTime: z.string().regex(TIME_PATTERN).optional(),
  transitionBufferMin: z.number().int().min(0).optional(),
});

const listTripQuerySchema = z.object({
  userId: z.string().optional(),
  status: z.enum(STATUSES).optional(),
  page: z
    .string()
    .optional()
    .transform((value) => (value == null ? 1 : Number(value))),
  limit: z
    .string()
    .optional()
    .transform((value) => (value == null ? 25 : Number(value))),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

function parseDateOrThrow(value, errorCode = 'INVALID_DATE') {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(errorCode);
  }
  return date;
}

function getDayRange(dateValue) {
  const dayStart = new Date(dateValue);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return { dayStart, dayEnd };
}

function getRequestUserId(req) {
  return req.user?._id || req.user?.id || null;
}

function toObjectId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }
  return new mongoose.Types.ObjectId(id);
}

async function fetchPlacesAndClosuresForDate(events, date) {
  const placeIds = [...new Set(events.map((event) => String(event.placeId)))];
  const objectIds = placeIds.map(toObjectId).filter(Boolean);

  const [places, closures] = await Promise.all([
    Place.find({ _id: { $in: objectIds } }).lean(),
    (async () => {
      const { dayStart, dayEnd } = getDayRange(date);
      return PlaceClosure.find({
        placeId: { $in: objectIds },
        date: { $gte: dayStart, $lt: dayEnd },
      })
        .sort({ createdAt: -1 })
        .lean();
    })(),
  ]);

  const placeMap = new Map(places.map((place) => [String(place._id), place]));
  const closureMap = new Map();
  for (const closure of closures) {
    const key = String(closure.placeId);
    if (!closureMap.has(key)) {
      closureMap.set(key, closure);
    }
  }
  return { placeMap, closureMap };
}

async function buildScheduledEvents(payload) {
  const { date, events, dayStartTime, transitionBufferMin } = payload;
  const scheduleDate = parseDateOrThrow(date, 'INVALID_DATE');
  const { placeMap, closureMap } = await fetchPlacesAndClosuresForDate(events, scheduleDate);

  const startTime =
    dayStartTime || (await getStringSettingValue('day_start_time', '09:00'));
  const bufferMin =
    transitionBufferMin ??
    (await getNumericSettingValue('default_transition_buffer_min', 10));
  const logicTimeZone = await getStringSettingValue('logic_timezone', 'Asia/Kolkata');
  const osrmBaseUrl = await getStringSettingValue(
    'osrm_base_url',
    process.env.OSRM_BASE_URL || 'https://router.project-osrm.org'
  );

  const warnings = [];
  const prepared = events.map((event) => {
    const place = placeMap.get(String(event.placeId)) || null;
    if (!place) {
      warnings.push(`PLACE_NOT_FOUND:${event.placeId}`);
    }
    return {
      placeId: String(event.placeId),
      order: event.order,
      place,
    };
  });

  const scheduled = await autoScheduleDay(prepared, {
    date: scheduleDate,
    dayStartTime: startTime,
    transitionBufferMin: bufferMin,
    closuresByPlaceId: closureMap,
    calculateLogisticsFn: (origin, destination) =>
      getOrCalculateRoute(origin, destination, { osrmBaseUrl }),
    routingConfig: { osrmBaseUrl },
    timeZone: logicTimeZone,
  });

  const eventsForStorage = scheduled.map(({ place, ...event }, index) => ({
    placeId: event.placeId,
    order: index,
    startTime: event.startTime,
    endTime: event.endTime,
    travelTimeMin: event.travelTimeMin,
    distanceKm: event.distanceKm,
    validationStatus: event.validationStatus,
    validationReason: event.validationReason,
    routeProvider: event.routeProvider,
  }));

  return {
    eventsForStorage,
    warnings,
  };
}

export async function listTrips(req, res) {
  try {
    const parsed = listTripQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: parsed.error.flatten(),
      });
    }

    const { userId, status, page, limit, startDate, endDate } = parsed.data;
    const query = {};

    if (status) query.status = status;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      query.userId = new mongoose.Types.ObjectId(userId);
    }

    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = parseDateOrThrow(startDate);
      if (endDate) query.startDate.$lte = parseDateOrThrow(endDate);
    }

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 25));
    const skip = (safePage - 1) * safeLimit;

    const [data, total] = await Promise.all([
      Trip.find(query).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
      Trip.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit),
      },
    });
  } catch (error) {
    if (error.message === 'INVALID_DATE') {
      return res.status(400).json({
        success: false,
        message: 'Invalid date in filters',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to list trips',
      error: error.message,
    });
  }
}

export async function getTrip(req, res) {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found',
      });
    }

    return res.json({
      success: true,
      data: trip,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch trip',
      error: error.message,
    });
  }
}

export async function createTrip(req, res) {
  try {
    const parsed = createTripSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload',
        errors: parsed.error.flatten(),
      });
    }

    const payload = parsed.data;
    const startDate = parseDateOrThrow(payload.startDate);
    const endDate = parseDateOrThrow(payload.endDate);

    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate must be before or equal to endDate',
      });
    }

    const userId = getRequestUserId(req) || payload.userId;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid userId is required',
      });
    }

    const trip = await Trip.create({
      userId: new mongoose.Types.ObjectId(userId),
      name: payload.name,
      startDate,
      endDate,
      status: payload.status,
      days: [],
      createdBy: getRequestUserId(req),
      updatedBy: getRequestUserId(req),
    });

    await createTripVersionSnapshot(trip, {
      reason: 'TRIP_CREATED',
      createdBy: getRequestUserId(req),
    });

    return res.status(201).json({
      success: true,
      data: trip,
      message: 'Trip created successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create trip',
      error: error.message,
    });
  }
}

export async function updateTrip(req, res) {
  try {
    const parsed = updateTripSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload',
        errors: parsed.error.flatten(),
      });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found',
      });
    }

    const updates = parsed.data;
    if (updates.startDate) trip.startDate = parseDateOrThrow(updates.startDate);
    if (updates.endDate) trip.endDate = parseDateOrThrow(updates.endDate);
    if (trip.startDate > trip.endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate must be before or equal to endDate',
      });
    }
    if (updates.name !== undefined) trip.name = updates.name;
    if (updates.status !== undefined) trip.status = updates.status;
    trip.updatedBy = getRequestUserId(req);

    await trip.save();
    await createTripVersionSnapshot(trip, {
      reason: 'TRIP_UPDATED',
      createdBy: getRequestUserId(req),
    });

    return res.json({
      success: true,
      data: trip,
      message: 'Trip updated successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update trip',
      error: error.message,
    });
  }
}

export async function upsertTripDay(req, res) {
  try {
    const dayIndex = Number(req.params.dayIndex);
    if (!Number.isInteger(dayIndex) || dayIndex < 0) {
      return res.status(400).json({
        success: false,
        message: 'dayIndex must be a non-negative integer',
      });
    }

    const parsed = upsertTripDaySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload',
        errors: parsed.error.flatten(),
      });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found',
      });
    }

    const scheduleStart = performance.now();
    const { eventsForStorage, warnings } = await buildScheduledEvents(parsed.data);
    const scheduleDuration = Math.round(performance.now() - scheduleStart);
    const dayDate = parseDateOrThrow(parsed.data.date);

    const existingDayIndex = trip.days.findIndex((day) => day.dayIndex === dayIndex);
    const payload = {
      dayIndex,
      date: dayDate,
      events: eventsForStorage,
    };

    if (existingDayIndex >= 0) {
      trip.days[existingDayIndex] = payload;
    } else {
      trip.days.push(payload);
    }

    trip.days = trip.days.sort((a, b) => a.dayIndex - b.dayIndex);
    trip.updatedBy = getRequestUserId(req);
    await trip.save();

    await createTripVersionSnapshot(trip, {
      reason: 'SAVE_DAY',
      createdBy: getRequestUserId(req),
    });

    await writeLogicRunLog({
      tripId: trip._id,
      dayIndex,
      triggeredBy: getRequestUserId(req),
      triggerType: 'SAVE_DAY',
      inputEventCount: parsed.data.events.length,
      outputEventCount: eventsForStorage.length,
      warnings,
      timingsMs: {
        schedule: scheduleDuration,
        total: scheduleDuration,
      },
    });

    return res.json({
      success: true,
      data: trip,
      warnings,
      message: 'Trip day saved and auto-scheduled successfully',
    });
  } catch (error) {
    if (error.message === 'INVALID_DATE') {
      return res.status(400).json({
        success: false,
        message: 'Invalid date in payload',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to save trip day',
      error: error.message,
    });
  }
}

export async function autoScheduleTripDay(req, res) {
  try {
    const dayIndex = Number(req.params.dayIndex);
    if (!Number.isInteger(dayIndex) || dayIndex < 0) {
      return res.status(400).json({
        success: false,
        message: 'dayIndex must be a non-negative integer',
      });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found',
      });
    }

    const day = trip.days.find((item) => item.dayIndex === dayIndex);
    if (!day) {
      return res.status(404).json({
        success: false,
        message: 'Trip day not found',
      });
    }

    const payload = {
      date: day.date.toISOString(),
      events: day.events.map((event) => ({
        placeId: String(event.placeId),
        order: Number(event.order),
      })),
    };

    const { eventsForStorage, warnings } = await buildScheduledEvents(payload);
    day.events = eventsForStorage;
    trip.updatedBy = getRequestUserId(req);
    await trip.save();

    await createTripVersionSnapshot(trip, {
      reason: 'AUTO_SCHEDULE',
      createdBy: getRequestUserId(req),
    });

    await writeLogicRunLog({
      tripId: trip._id,
      dayIndex,
      triggeredBy: getRequestUserId(req),
      triggerType: 'SAVE_DAY',
      inputEventCount: payload.events.length,
      outputEventCount: eventsForStorage.length,
      warnings,
    });

    return res.json({
      success: true,
      data: trip,
      warnings,
      message: 'Trip day auto-scheduled successfully',
    });
  } catch (error) {
    if (error.message === 'INVALID_DATE') {
      return res.status(400).json({
        success: false,
        message: 'Invalid trip day date',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to auto-schedule trip day',
      error: error.message,
    });
  }
}

export async function recalculateAllTripDays(req, res) {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found',
      });
    }

    const warnings = [];
    for (const day of trip.days) {
      const payload = {
        date: day.date.toISOString(),
        events: day.events.map((event) => ({
          placeId: String(event.placeId),
          order: Number(event.order),
        })),
      };
      const result = await buildScheduledEvents(payload);
      day.events = result.eventsForStorage;
      warnings.push(...result.warnings.map((item) => `day-${day.dayIndex}:${item}`));
    }

    trip.updatedBy = getRequestUserId(req);
    await trip.save();

    await createTripVersionSnapshot(trip, {
      reason: 'RECALC_ALL',
      createdBy: getRequestUserId(req),
    });

    await writeLogicRunLog({
      tripId: trip._id,
      triggeredBy: getRequestUserId(req),
      triggerType: 'RECALC_ALL',
      inputEventCount: trip.days.reduce((sum, day) => sum + day.events.length, 0),
      outputEventCount: trip.days.reduce((sum, day) => sum + day.events.length, 0),
      warnings,
    });

    return res.json({
      success: true,
      data: trip,
      warnings,
      message: 'All trip days recalculated successfully',
    });
  } catch (error) {
    if (error.message === 'INVALID_DATE') {
      return res.status(400).json({
        success: false,
        message: 'Invalid trip day date',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to recalculate trip days',
      error: error.message,
    });
  }
}

export async function deleteTrip(req, res) {
  try {
    const trip = await Trip.findByIdAndDelete(req.params.id);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found',
      });
    }

    return res.json({
      success: true,
      message: 'Trip deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete trip',
      error: error.message,
    });
  }
}
