import axios from 'axios';
import { getDistance } from 'geolib';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

function assertValidCoordinates(coords) {
  if (
    !Array.isArray(coords) ||
    coords.length !== 2 ||
    !Number.isFinite(Number(coords[0])) ||
    !Number.isFinite(Number(coords[1]))
  ) {
    throw new Error('INVALID_COORDINATES');
  }
}

export function timeToMinutes(timeString) {
  if (!TIME_PATTERN.test(timeString)) {
    throw new Error('INVALID_TIME_FORMAT');
  }
  const [hour, minute] = timeString.split(':').map(Number);
  return hour * 60 + minute;
}

export function minutesToTime(totalMinutes) {
  const safeMinutes = Math.min(1439, Math.max(0, Math.floor(Number(totalMinutes) || 0)));
  const hour = Math.floor(safeMinutes / 60);
  const minute = safeMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function getDayName(dateValue, timeZone = 'Asia/Kolkata') {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    throw new Error('INVALID_DATE');
  }

  try {
    const weekday = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      timeZone,
    }).format(date);
    return String(weekday).toUpperCase();
  } catch (error) {
    return DAY_NAMES[date.getDay()];
  }
}

function doesRangeOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

export function validateEvent(place, dateValue, timeString, options = {}) {
  if (!place) {
    return { valid: false, reason: 'PLACE_NOT_FOUND' };
  }

  let eventStartMin;
  try {
    eventStartMin = timeToMinutes(timeString);
  } catch (error) {
    return { valid: false, reason: 'INVALID_TIME_FORMAT' };
  }

  const durationMin = Math.max(0, Number(place.avgDurationMin) || 0);
  const eventEndMin = eventStartMin + durationMin;

  let dayOfWeek;
  try {
    dayOfWeek = getDayName(dateValue, options.timeZone || 'Asia/Kolkata');
  } catch (error) {
    return { valid: false, reason: 'INVALID_DATE' };
  }

  if (Array.isArray(place.closedDays) && place.closedDays.includes(dayOfWeek)) {
    return { valid: false, reason: 'CLOSED_ON_DAY' };
  }

  const closure = options.closure || null;
  if (closure) {
    if (closure.isClosedFullDay) {
      return { valid: false, reason: 'CLOSED_SPECIAL_DATE' };
    }

    if (Array.isArray(closure.closedRanges)) {
      for (const range of closure.closedRanges) {
        if (!range?.startTime || !range?.endTime) {
          continue;
        }
        try {
          const rangeStart = timeToMinutes(range.startTime);
          const rangeEnd = timeToMinutes(range.endTime);
          if (doesRangeOverlap(eventStartMin, eventEndMin, rangeStart, rangeEnd)) {
            return { valid: false, reason: 'CLOSED_SPECIAL_DATE' };
          }
        } catch (error) {
          return { valid: false, reason: 'INVALID_CLOSURE_RANGE' };
        }
      }
    }
  }

  let opensAtMin;
  let closesAtMin;
  try {
    opensAtMin = timeToMinutes(place.opensAt);
    closesAtMin = timeToMinutes(place.closesAt);
  } catch (error) {
    return { valid: false, reason: 'INVALID_PLACE_HOURS' };
  }

  if (eventStartMin < opensAtMin || eventStartMin >= closesAtMin || eventEndMin > closesAtMin) {
    return { valid: false, reason: 'CLOSED_AT_TIME' };
  }

  return { valid: true };
}

async function calculateViaOsrm(origin, destination, options = {}) {
  const baseUrl = String(options.osrmBaseUrl || process.env.OSRM_BASE_URL || 'https://router.project-osrm.org')
    .replace(/\/+$/, '');

  const url = `${baseUrl}/route/v1/driving/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?overview=false`;
  const timeout = Number(options.osrmTimeoutMs || process.env.OSRM_TIMEOUT_MS || 4500);

  const response = await axios.get(url, { timeout });
  const route = response?.data?.routes?.[0];

  if (!route || response?.data?.code !== 'Ok') {
    throw new Error('OSRM_ROUTE_UNAVAILABLE');
  }

  return {
    distanceKm: Number((route.distance / 1000).toFixed(2)),
    travelTimeMin: Math.max(1, Math.round(route.duration / 60)),
    provider: 'OSRM',
  };
}

function calculateViaHaversine(origin, destination, options = {}) {
  const distanceMeters = getDistance(
    { longitude: Number(origin[0]), latitude: Number(origin[1]) },
    { longitude: Number(destination[0]), latitude: Number(destination[1]) }
  );

  const distanceKm = Number((distanceMeters / 1000).toFixed(2));
  const fallbackSpeedKmH = Number(options.fallbackSpeedKmH || process.env.FALLBACK_SPEED_KMH || 30);
  const travelTimeMin = distanceKm === 0 ? 0 : Math.max(1, Math.round((distanceKm / fallbackSpeedKmH) * 60));

  return {
    distanceKm,
    travelTimeMin,
    provider: 'HAVERSINE',
  };
}

export async function calculateLogistics(origin, destination, options = {}) {
  assertValidCoordinates(origin);
  assertValidCoordinates(destination);

  const normalizedOrigin = [Number(origin[0]), Number(origin[1])];
  const normalizedDestination = [Number(destination[0]), Number(destination[1])];

  if (
    normalizedOrigin[0] === normalizedDestination[0] &&
    normalizedOrigin[1] === normalizedDestination[1]
  ) {
    return { distanceKm: 0, travelTimeMin: 0, provider: 'STATIC' };
  }

  try {
    return await calculateViaOsrm(normalizedOrigin, normalizedDestination, options);
  } catch (error) {
    return calculateViaHaversine(normalizedOrigin, normalizedDestination, options);
  }
}

export async function autoScheduleDay(events = [], options = {}) {
  if (!Array.isArray(events) || events.length === 0) {
    return [];
  }

  const sortedEvents = [...events].sort((a, b) => Number(a.order) - Number(b.order));
  const dayStartTime = options.dayStartTime || '09:00';
  const transitionBufferMin = Math.max(0, Number(options.transitionBufferMin ?? 10));
  const dateValue = options.date || new Date();
  const closuresByPlaceId = options.closuresByPlaceId || new Map();
  const routeFn =
    typeof options.calculateLogisticsFn === 'function'
      ? options.calculateLogisticsFn
      : calculateLogistics;

  let nextStartMin = timeToMinutes(dayStartTime);
  const outputEvents = [];

  for (let index = 0; index < sortedEvents.length; index += 1) {
    const current = sortedEvents[index];
    const placeId = String(current.placeId || current.place?._id || '');
    const place = current.place || null;
    const startTime = minutesToTime(nextStartMin);
    const durationMin = Math.max(0, Number(place?.avgDurationMin ?? current.avgDurationMin ?? 0));
    const endMin = nextStartMin + durationMin;
    const endTime = minutesToTime(endMin);

    const closure =
      closuresByPlaceId instanceof Map ? closuresByPlaceId.get(placeId) : closuresByPlaceId[placeId];

    const validation = validateEvent(place, dateValue, startTime, {
      closure,
      timeZone: options.timeZone || 'Asia/Kolkata',
    });

    const scheduledEvent = {
      ...current,
      placeId,
      order: index,
      startTime,
      endTime,
      travelTimeMin: 0,
      distanceKm: 0,
      routeProvider: 'STATIC',
      validationStatus: validation.valid ? 'VALID' : 'INVALID',
      validationReason: validation.valid ? null : validation.reason,
    };

    if (index < sortedEvents.length - 1) {
      const nextPlace = sortedEvents[index + 1]?.place;
      const currentCoords = place?.location?.coordinates;
      const nextCoords = nextPlace?.location?.coordinates;

      if (currentCoords && nextCoords) {
        try {
          const route = await routeFn(currentCoords, nextCoords, options.routingConfig || {});
          scheduledEvent.travelTimeMin = Math.max(0, Number(route.travelTimeMin) || 0);
          scheduledEvent.distanceKm = Math.max(0, Number(route.distanceKm) || 0);
          scheduledEvent.routeProvider = route.provider || 'STATIC';
        } catch (error) {
          scheduledEvent.travelTimeMin = 0;
          scheduledEvent.distanceKm = 0;
          scheduledEvent.routeProvider = 'STATIC';
        }
      }
    }

    outputEvents.push(scheduledEvent);
    nextStartMin = endMin + scheduledEvent.travelTimeMin + transitionBufferMin;
  }

  return outputEvents;
}
