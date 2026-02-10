import mongoose from 'mongoose';
import { getParadiseYatraCRMConnection } from '../config/db.js';

const tripVersionSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
    },
    version: {
      type: Number,
      required: true,
      min: 1,
    },
    snapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    reason: {
      type: String,
      default: 'UNSPECIFIED',
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

tripVersionSchema.index({ tripId: 1, version: -1 });
tripVersionSchema.index({ tripId: 1, createdAt: -1 });

const crmDb = getParadiseYatraCRMConnection();
const TripVersion = crmDb.model('TripVersion', tripVersionSchema, 'trip_versions');

export default TripVersion;

