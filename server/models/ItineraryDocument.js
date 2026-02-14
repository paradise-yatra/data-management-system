import mongoose from 'mongoose';
import { getParadiseYatraCRMConnection } from '../config/db.js';

const itineraryDocumentSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
    },
    version: {
      type: Number,
      required: true,
      min: 1,
    },
    templateVersion: {
      type: String,
      required: true,
      trim: true,
      default: 'A4_BROCHURE_V1',
    },
    renderMode: {
      type: String,
      required: true,
      trim: true,
      default: 'LOCKED_A4_PUPPETEER',
    },
    storagePath: {
      type: String,
      required: true,
      trim: true,
    },
    checksum: {
      type: String,
      required: true,
      trim: true,
    },
    pageCount: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED'],
      default: 'SUCCESS',
      required: true,
    },
    fileSizeBytes: {
      type: Number,
      default: 0,
      min: 0,
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
      default: null,
      trim: true,
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

itineraryDocumentSchema.index({ tripId: 1, version: -1 }, { unique: true });
itineraryDocumentSchema.index({ tripId: 1, createdAt: -1 });

const crmDb = getParadiseYatraCRMConnection();
const ItineraryDocument = crmDb.model(
  'ItineraryDocument',
  itineraryDocumentSchema,
  'itinerary_documents'
);

export default ItineraryDocument;
