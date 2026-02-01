import mongoose from 'mongoose';
import { getParadiseYatraCRMConnection } from '../config/db.js';

const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Setting key is required'],
      unique: true,
      trim: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Setting value is required'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
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

// Index
settingSchema.index({ key: 1 }, { unique: true });

const crmDb = getParadiseYatraCRMConnection();
const Setting = crmDb.model('Setting', settingSchema, 'settings');

export default Setting;


