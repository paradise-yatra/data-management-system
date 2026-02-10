import { performance } from 'node:perf_hooks';
import { z } from 'zod';
import mongoose from 'mongoose';
import Place from '../models/Place.js';
import PlaceClosure from '../models/PlaceClosure.js';
import { autoScheduleDay, validateEvent } from '../services/logicService.js';
import { getOrCalculateRoute } from '../services/routeCacheService.js';
import {
  getNumericSettingValue,
  getStringSettingValue,
} from '../services/itineraryBuilderSettingsService.js';
import { writeLogicRunLog } from '../services/tripAuditService.js';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const validateEventSchema = z.object({
  placeId: z.string().optional(),
  place: z
    .object({
      name: z.string(),
      category: z.string(),
      location: z.object({
        type: z.string().optional(),
        coordinates: z.tuple([z.number(), z.number()]),
      }),
      avgDurationMin: z.number(),
      opensAt: z.string().regex(TIME_PATTERN),
      closesAt: z.string().regex(TIME_PATTERN),
      closedDays: z.array(z.string()).optional().default([]),
    })
    .optional(),
  date: z.string().min(1),
  time: z.string().regex(TIME_PATTERN),
});

const routeSchema = z.object({
  origin: z.tuple([z.number(), z.number()]),
  destination: z.tuple([z.number(), z.number()]),
});

const scheduleEventSchema = z.object({
  placeId: z.string().min(1),
  order: z.number().int().min(0),
});

const schedulePayloadSchema = z.object({
  date: z.string().min(1),
  dayStartTime: z.string().regex(TIME_PATTERN).optional(),
  transitionBufferMin: z.number().int().min(0).optional(),
  events: z.array(scheduleEventSchema),
  tripId: z.string().optional(),
  dayIndex: z.number().int().min(0).optional(),
  triggerType: z.enum(['DRAG_DROP', 'SAVE_DAY', 'RECALC_ALL', 'API_MANUAL']).optional(),
});

function getDayRange(dateValue) {
  const base = new Date(dateValue);
  if (Number.isNaN(base.getTime())) {
    throw new Error('INVALID_DATE');
  }
  const dayStart = new Date(base);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return { dayStart, dayEnd };
}

async function fetchPlacesAndClosuresForDate(placeIds, dateValue) {
  const uniquePlaceIds = [...new Set(placeIds.map((id) => String(id)))].filter(Boolean);
  const objectIds = uniquePlaceIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const [places, closures] = await Promise.all([
    Place.find({ _id: { $in: objectIds } }).lean(),
    (async () => {
      const { dayStart, dayEnd } = getDayRange(dateValue);
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

async function runAutoSchedule(payload, userId = null) {
  const totalStart = performance.now();
  const warnings = [];
  const errors = [];

  const date = new Date(payload.date);
  if (Number.isNaN(date.getTime())) {
    throw new Error('INVALID_DATE');
  }

  const placeIds = payload.events.map((event) => event.placeId);
  const { placeMap, closureMap } = await fetchPlacesAndClosuresForDate(placeIds, date);

  const dayStartTime =
    payload.dayStartTime || (await getStringSettingValue('day_start_time', '09:00'));
  const transitionBufferMin =
    payload.transitionBufferMin ??
    (await getNumericSettingValue('default_transition_buffer_min', 10));
  const logicTimeZone = await getStringSettingValue('logic_timezone', 'Asia/Kolkata');
  const osrmBaseUrl = await getStringSettingValue(
    'osrm_base_url',
    process.env.OSRM_BASE_URL || 'https://router.project-osrm.org'
  );

  const eventsWithPlaces = payload.events.map((event) => {
    const place = placeMap.get(String(event.placeId)) || null;
    if (!place) {
      warnings.push(`PLACE_NOT_FOUND:${event.placeId}`);
    }
    return {
      ...event,
      placeId: String(event.placeId),
      place,
    };
  });

  const scheduledEvents = await autoScheduleDay(eventsWithPlaces, {
    date,
    dayStartTime,
    transitionBufferMin,
    closuresByPlaceId: closureMap,
    calculateLogisticsFn: (origin, destination) =>
      getOrCalculateRoute(origin, destination, { osrmBaseUrl }),
    routingConfig: { osrmBaseUrl },
    timeZone: logicTimeZone,
  });

  const responseEvents = scheduledEvents.map(({ place, ...rest }) => rest);
  const invalidCount = responseEvents.filter((event) => event.validationStatus === 'INVALID').length;
  if (invalidCount > 0) {
    warnings.push(`INVALID_EVENTS:${invalidCount}`);
  }

  const totalMs = Math.round(performance.now() - totalStart);

  await writeLogicRunLog({
    tripId: payload.tripId || null,
    dayIndex: payload.dayIndex,
    triggeredBy: userId || null,
    triggerType: payload.triggerType || 'API_MANUAL',
    inputEventCount: payload.events.length,
    outputEventCount: responseEvents.length,
    warnings,
    errors,
    timingsMs: {
      validate: 0,
      route: 0,
      schedule: totalMs,
      total: totalMs,
    },
  });

  return { events: responseEvents, warnings };
}

export async function validateLogicEvent(req, res) {
  try {
    const parsed = validateEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload',
        errors: parsed.error.flatten(),
      });
    }

    const payload = parsed.data;
    const date = new Date(payload.date);
    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_DATE',
        message: 'Invalid date value',
      });
    }

    let place = payload.place;
    let closure = null;

    if (!place && payload.placeId) {
      place = await Place.findById(payload.placeId).lean();
      if (!place) {
        return res.status(404).json({
          success: false,
          code: 'PLACE_NOT_FOUND',
          message: 'Place not found',
        });
      }

      const { dayStart, dayEnd } = getDayRange(date);
      closure = await PlaceClosure.findOne({
        placeId: place._id,
        date: { $gte: dayStart, $lt: dayEnd },
      })
        .sort({ createdAt: -1 })
        .lean();
    }

    const logicTimeZone = await getStringSettingValue('logic_timezone', 'Asia/Kolkata');
    const result = validateEvent(place, date, payload.time, {
      closure,
      timeZone: logicTimeZone,
    });
    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to validate event',
      error: error.message,
    });
  }
}

export async function calculateRoute(req, res) {
  try {
    const parsed = routeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload',
        errors: parsed.error.flatten(),
      });
    }

    const osrmBaseUrl = await getStringSettingValue(
      'osrm_base_url',
      process.env.OSRM_BASE_URL || 'https://router.project-osrm.org'
    );
    const route = await getOrCalculateRoute(parsed.data.origin, parsed.data.destination, { osrmBaseUrl });

    return res.json({
      success: true,
      data: route,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate route',
      error: error.message,
    });
  }
}

export async function autoScheduleDayEndpoint(req, res) {
  try {
    const parsed = schedulePayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload',
        errors: parsed.error.flatten(),
      });
    }

    const data = await runAutoSchedule(parsed.data, req.user?._id || req.user?.id || null);
    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    if (error.message === 'INVALID_DATE') {
      return res.status(400).json({
        success: false,
        code: 'INVALID_DATE',
        message: 'Invalid date value',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to auto-schedule day',
      error: error.message,
    });
  }
}

export async function reorderAndRecalculate(req, res) {
  try {
    const parsed = schedulePayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload',
        errors: parsed.error.flatten(),
      });
    }

    const data = await runAutoSchedule(
      { ...parsed.data, triggerType: 'DRAG_DROP' },
      req.user?._id || req.user?.id || null
    );
    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    if (error.message === 'INVALID_DATE') {
      return res.status(400).json({
        success: false,
        code: 'INVALID_DATE',
        message: 'Invalid date value',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to reorder and recalculate',
      error: error.message,
    });
  }
}
