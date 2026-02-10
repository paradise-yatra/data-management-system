import mongoose from 'mongoose';
import { getParadiseYatraCRMConnection } from '../config/db.js';

const CATEGORIES = ['SIGHTSEEING', 'FOOD', 'ADVENTURE', 'RELAXATION', 'SHOPPING'];
const WEEK_DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

const placeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      enum: CATEGORIES,
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator(value) {
            return (
              Array.isArray(value) &&
              value.length === 2 &&
              Number.isFinite(value[0]) &&
              Number.isFinite(value[1])
            );
          },
          message: 'Coordinates must be [longitude, latitude]',
        },
      },
    },
    avgDurationMin: {
      type: Number,
      required: true,
      min: 1,
    },
    opensAt: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    closesAt: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    closedDays: {
      type: [String],
      enum: WEEK_DAYS,
      default: [],
    },
    priceForeigner: {
      type: Number,
      default: 0,
      min: 0,
    },
    priceDomestic: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
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

placeSchema.index({ location: '2dsphere' });
placeSchema.index({ category: 1, name: 1 });
placeSchema.index({ isActive: 1, category: 1 });

const crmDb = getParadiseYatraCRMConnection();
const Place = crmDb.model('Place', placeSchema, 'places');

export default Place;

