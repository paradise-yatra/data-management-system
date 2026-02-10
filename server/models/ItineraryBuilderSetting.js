import mongoose from 'mongoose';
import { getParadiseYatraCRMConnection } from '../config/db.js';

const itineraryBuilderSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
);

const crmDb = getParadiseYatraCRMConnection();
const ItineraryBuilderSetting = crmDb.model(
  'ItineraryBuilderSetting',
  itineraryBuilderSettingSchema,
  'itinerary_builder_settings'
);

export default ItineraryBuilderSetting;
