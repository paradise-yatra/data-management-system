import mongoose from 'mongoose';
import { getFinanceConnection } from '../config/db.js';

const receiptSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const financeDb = getFinanceConnection();
const ReceiptSetting = financeDb.model('ReceiptSetting', receiptSettingSchema, 'receipt_settings');

export default ReceiptSetting;
