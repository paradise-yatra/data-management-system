import mongoose from 'mongoose';
import { getParadiseYatraCRMConnection } from '../config/db.js';

const itineraryEventSchema = new mongoose.Schema(
  {
    placeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Place',
      required: true,
    },
    order: {
      type: Number,
      required: true,
      min: 0,
    },
    startTime: {
      type: String,
      default: null,
      match: /^([01]\d|2[0-3]):([0-5]\d)$|^$/,
    },
    endTime: {
      type: String,
      default: null,
      match: /^([01]\d|2[0-3]):([0-5]\d)$|^$/,
    },
    travelTimeMin: {
      type: Number,
      default: 0,
      min: 0,
    },
    distanceKm: {
      type: Number,
      default: 0,
      min: 0,
    },
    validationStatus: {
      type: String,
      enum: ['VALID', 'INVALID'],
      default: 'VALID',
    },
    validationReason: {
      type: String,
      default: null,
    },
    routeProvider: {
      type: String,
      enum: ['OSRM', 'HAVERSINE', 'STATIC'],
      default: 'STATIC',
    },
  },
  {
    _id: true,
  }
);

const tripDaySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    dayIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    events: {
      type: [itineraryEventSchema],
      default: [],
    },
  },
  {
    _id: false,
  }
);

const tripSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'IN_PROGRESS', 'READY', 'CONFIRMED', 'CANCELLED'],
      default: 'DRAFT',
    },
    days: {
      type: [tripDaySchema],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

tripSchema.index({ userId: 1, status: 1, startDate: -1 });
tripSchema.index({ 'days.date': 1 });

const crmDb = getParadiseYatraCRMConnection();
const Trip = crmDb.model('Trip', tripSchema, 'trips');

export default Trip;

