import mongoose from 'mongoose';
import { getParadiseYatraCRMConnection } from '../config/db.js';

const timeRangeSchema = new mongoose.Schema(
  {
    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
  },
  {
    _id: false,
  }
);

const placeClosureSchema = new mongoose.Schema(
  {
    placeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Place',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      default: '',
      trim: true,
    },
    isClosedFullDay: {
      type: Boolean,
      default: true,
    },
    closedRanges: {
      type: [timeRangeSchema],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

placeClosureSchema.index({ placeId: 1, date: 1 });

const crmDb = getParadiseYatraCRMConnection();
const PlaceClosure = crmDb.model('PlaceClosure', placeClosureSchema, 'place_closures');

export default PlaceClosure;

