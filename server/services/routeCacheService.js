import RouteCache from '../models/RouteCache.js';
import { calculateLogistics } from './logicService.js';
import { getNumericSettingValue } from './itineraryBuilderSettingsService.js';

export function coordinatesToHash(coordinates) {
  const lon = Number(coordinates[0]).toFixed(6);
  const lat = Number(coordinates[1]).toFixed(6);
  return `${lon},${lat}`;
}

export async function getCachedRoute(origin, destination) {
  const originHash = coordinatesToHash(origin);
  const destinationHash = coordinatesToHash(destination);

  const cacheEntry = await RouteCache.findOne({
    originHash,
    destinationHash,
    expiresAt: { $gt: new Date() },
  }).lean();

  return cacheEntry;
}

export async function saveRouteCache(origin, destination, route, ttlHours = null) {
  const originHash = coordinatesToHash(origin);
  const destinationHash = coordinatesToHash(destination);

  const effectiveTtlHours =
    ttlHours == null
      ? await getNumericSettingValue('route_cache_ttl_hours', 168)
      : Number(ttlHours);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + Math.max(1, effectiveTtlHours) * 60 * 60 * 1000);

  await RouteCache.updateOne(
    { originHash, destinationHash },
    {
      $set: {
        originHash,
        destinationHash,
        distanceKm: route.distanceKm,
        travelTimeMin: route.travelTimeMin,
        provider: route.provider,
        computedAt: now,
        expiresAt,
      },
    },
    { upsert: true }
  );
}

export async function getOrCalculateRoute(origin, destination, options = {}) {
  const cached = await getCachedRoute(origin, destination);
  if (cached) {
    return {
      distanceKm: cached.distanceKm,
      travelTimeMin: cached.travelTimeMin,
      provider: cached.provider,
      cached: true,
    };
  }

  const route = await calculateLogistics(origin, destination, options);
  await saveRouteCache(origin, destination, route);
  return { ...route, cached: false };
}

