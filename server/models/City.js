import mongoose from 'mongoose';
import { getParadiseYatraCRMConnection } from '../config/db.js';

const citySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'City name is required'],
      unique: true,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
citySchema.index({ name: 1 }, { unique: true });
citySchema.index({ isActive: 1 });

const crmDb = getParadiseYatraCRMConnection();
const City = crmDb.model('City', citySchema, 'cities');

export default City;



