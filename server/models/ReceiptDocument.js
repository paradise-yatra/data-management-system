import mongoose from 'mongoose';
import { getFinanceConnection } from '../config/db.js';

const receiptDocumentSchema = new mongoose.Schema(
  {
    receiptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Receipt',
      required: true,
      index: true,
    },
    version: {
      type: Number,
      required: true,
      min: 1,
    },
    templateVersion: {
      type: String,
      trim: true,
      required: true,
      default: 'FINANCE_RECEIPT_A4_V1',
    },
    renderMode: {
      type: String,
      trim: true,
      required: true,
      default: 'LOCKED_A4_PUPPETEER',
    },
    format: {
      type: String,
      enum: ['PDF', 'PNG', 'JPG'],
      required: true,
      index: true,
    },
    storagePath: {
      type: String,
      trim: true,
      required: true,
    },
    checksum: {
      type: String,
      trim: true,
      required: true,
    },
    pageCount: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    widthPx: {
      type: Number,
      default: null,
      min: 1,
    },
    heightPx: {
      type: Number,
      default: null,
      min: 1,
    },
    fileSizeBytes: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED'],
      required: true,
      default: 'SUCCESS',
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    failureReason: {
      type: String,
      trim: true,
      default: null,
    },
    renderValidationReport: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    requestSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

receiptDocumentSchema.index({ receiptId: 1, version: -1 }, { unique: true });
receiptDocumentSchema.index({ receiptId: 1, createdAt: -1 });

const financeDb = getFinanceConnection();
const ReceiptDocument = financeDb.model('ReceiptDocument', receiptDocumentSchema, 'receipt_documents');

export default ReceiptDocument;
