import mongoose from 'mongoose';
import { getParadiseYatraCRMConnection } from '../config/db.js';

const timingsSchema = new mongoose.Schema(
  {
    validation: {
      type: Number,
      default: 0,
      min: 0,
    },
    route: {
      type: Number,
      default: 0,
      min: 0,
    },
    schedule: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    _id: false,
  }
);

const logicRunLogSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      default: null,
    },
    dayIndex: {
      type: Number,
      default: null,
      min: 0,
    },
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    triggerType: {
      type: String,
      enum: ['DRAG_DROP', 'SAVE_DAY', 'RECALC_ALL', 'API_MANUAL'],
      default: 'API_MANUAL',
    },
    inputEventCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    outputEventCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    warnings: {
      type: [String],
      default: [],
    },
    errorMessages: {
      type: [String],
      default: [],
    },
    timingsMs: {
      type: timingsSchema,
      default: () => ({}),
    },
  },
  {
    suppressReservedKeysWarning: true,
    timestamps: { createdAt: true, updatedAt: false },
  }
);

logicRunLogSchema.index({ tripId: 1, createdAt: -1 });
logicRunLogSchema.index({ triggerType: 1, createdAt: -1 });

const crmDb = getParadiseYatraCRMConnection();
const LogicRunLog = crmDb.model('LogicRunLog', logicRunLogSchema, 'logic_run_logs');

export default LogicRunLog;
