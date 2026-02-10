import mongoose from 'mongoose';
import { getParadiseYatraCRMConnection } from '../config/db.js';

const routeCacheSchema = new mongoose.Schema(
  {
    originHash: {
      type: String,
      required: true,
      trim: true,
    },
    destinationHash: {
      type: String,
      required: true,
      trim: true,
    },
    distanceKm: {
      type: Number,
      required: true,
      min: 0,
    },
    travelTimeMin: {
      type: Number,
      required: true,
      min: 0,
    },
    provider: {
      type: String,
      enum: ['OSRM', 'HAVERSINE', 'STATIC'],
      required: true,
    },
    computedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

routeCacheSchema.index({ originHash: 1, destinationHash: 1 }, { unique: true });
routeCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const crmDb = getParadiseYatraCRMConnection();
const RouteCache = crmDb.model('RouteCache', routeCacheSchema, 'route_cache');

export default RouteCache;

