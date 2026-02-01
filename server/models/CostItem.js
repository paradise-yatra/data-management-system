import mongoose from 'mongoose';
import { getParadiseYatraCRMConnection } from '../config/db.js';

const costItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['hotel', 'transfer', 'activity', 'sightseeing', 'other'],
      required: [true, 'Type is required'],
    },
    destination: {
      type: String,
      required: [true, 'Destination is required'],
      trim: true,
    },
    costType: {
      type: String,
      enum: ['per_person', 'per_night', 'per_vehicle', 'flat'],
      required: [true, 'Cost type is required'],
    },
    baseCost: {
      type: Number,
      required: [true, 'Base cost is required'],
      min: [0, 'Base cost must be positive'],
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    validityStart: {
      type: Date,
      default: null,
    },
    validityEnd: {
      type: Date,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      default: '',
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

// Indexes
costItemSchema.index({ type: 1, destination: 1, isActive: 1 });
costItemSchema.index({ name: 1 });
costItemSchema.index({ destination: 1 });

const crmDb = getParadiseYatraCRMConnection();
const CostItem = crmDb.model('CostItem', costItemSchema, 'costitems');

export default CostItem;


