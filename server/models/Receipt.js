import mongoose from 'mongoose';
import { getFinanceConnection } from '../config/db.js';

const activityEntrySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    actorName: {
      type: String,
      trim: true,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    _id: true,
  }
);

const receiptSchema = new mongoose.Schema(
  {
    receiptNumber: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'ISSUED', 'VOID'],
      default: 'DRAFT',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['ADVANCE', 'PARTIAL', 'FULL'],
      default: 'ADVANCE',
      required: true,
    },
    linkedLeadId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    linkedTripId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    customer: {
      leadName: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
      email: { type: String, trim: true, default: '' },
      address: { type: String, trim: true, default: '' },
    },
    tripDetails: {
      tripName: { type: String, trim: true, default: '' },
      destination: { type: String, trim: true, default: '' },
      travelStartDate: { type: Date, default: null },
      travelEndDate: { type: Date, default: null },
    },
    payment: {
      paymentDate: { type: Date, default: Date.now, required: true },
      paymentMode: {
        type: String,
        enum: ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other'],
        default: 'UPI',
        required: true,
      },
      transactionReference: { type: String, trim: true, default: '' },
      receivedAmount: { type: Number, min: 0, default: 0, required: true },
    },
    totals: {
      packageAmount: { type: Number, min: 0, default: 0, required: true },
      previousPayments: { type: Number, min: 0, default: 0, required: true },
      totalReceived: { type: Number, min: 0, default: 0, required: true },
      pendingAmount: { type: Number, min: 0, default: 0, required: true },
    },
    notes: {
      publicNote: { type: String, trim: true, default: '' },
      internalNote: { type: String, trim: true, default: '' },
      voidReason: { type: String, trim: true, default: '' },
    },
    brandingSnapshot: {
      companyName: { type: String, trim: true, default: '' },
      companyAddress: { type: String, trim: true, default: '' },
      companyPhone: { type: String, trim: true, default: '' },
      companyEmail: { type: String, trim: true, default: '' },
      companyWebsite: { type: String, trim: true, default: '' },
      companyGstin: { type: String, trim: true, default: '' },
      logoUrl: { type: String, trim: true, default: '' },
      footerNote: { type: String, trim: true, default: '' },
      primaryColor: { type: String, trim: true, default: '#0f766e' },
      accentColor: { type: String, trim: true, default: '#7c2d12' },
      currencyCode: { type: String, trim: true, default: 'INR' },
      locale: { type: String, trim: true, default: 'en-IN' },
      timezone: { type: String, trim: true, default: 'Asia/Kolkata' },
    },
    issuedAt: {
      type: Date,
      default: null,
      index: true,
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    voidedAt: {
      type: Date,
      default: null,
    },
    voidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    activityTrail: {
      type: [activityEntrySchema],
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
    createdByName: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

receiptSchema.index({ receiptNumber: 1 }, { unique: true, sparse: true });
receiptSchema.index({ status: 1, issuedAt: -1 });
receiptSchema.index({ 'customer.leadName': 1 });
receiptSchema.index({ 'tripDetails.destination': 1 });
receiptSchema.index({ 'payment.paymentMode': 1 });

const financeDb = getFinanceConnection();
const Receipt = financeDb.model('Receipt', receiptSchema, 'receipts');

export default Receipt;
