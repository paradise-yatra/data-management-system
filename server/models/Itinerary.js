import mongoose from 'mongoose';
import { getParadiseYatraCRMConnection } from '../config/db.js';

const serviceItemSchema = new mongoose.Schema({
  costItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CostItem',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  costType: {
    type: String,
    required: true,
  },
  baseCost: {
    type: Number,
    required: true,
  },
}, { _id: false });

const transferItemSchema = new mongoose.Schema({
  costItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CostItem',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  costType: {
    type: String,
    required: true,
  },
  baseCost: {
    type: Number,
    required: true,
  },
  tripCount: {
    type: Number,
    default: 1,
    min: 1,
  },
}, { _id: false });

const daySchema = new mongoose.Schema({
  dayNumber: {
    type: Number,
    required: true,
    min: 1,
  },
  date: {
    type: Date,
    default: null,
  },
  hotel: {
    type: {
      costItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CostItem',
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      costType: {
        type: String,
        required: true,
      },
      baseCost: {
        type: Number,
        required: true,
      },
    },
    default: null,
  },
  activities: {
    type: [serviceItemSchema],
    default: [],
  },
  transfers: {
    type: [transferItemSchema],
    default: [],
  },
  sightseeings: {
    type: [serviceItemSchema],
    default: [],
  },
  otherServices: {
    type: [serviceItemSchema],
    default: [],
  },
  notes: {
    type: String,
    trim: true,
    default: '',
  },
}, { _id: false });

const itinerarySchema = new mongoose.Schema(
  {
    itineraryNumber: {
      type: String,
      unique: true,
      trim: true,
    },
    clientName: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
    },
    clientEmail: {
      type: String,
      trim: true,
      default: '',
    },
    clientPhone: {
      type: String,
      trim: true,
      default: '',
    },
    destinations: {
      type: [String],
      required: [true, 'At least one destination is required'],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one destination is required',
      },
    },
    travelDates: {
      startDate: {
        type: Date,
        required: [true, 'Start date is required'],
      },
      endDate: {
        type: Date,
        required: [true, 'End date is required'],
      },
    },
    pax: {
      adults: {
        type: Number,
        required: [true, 'Number of adults is required'],
        min: [1, 'At least one adult is required'],
      },
      children: {
        type: Number,
        default: 0,
        min: [0, 'Children cannot be negative'],
      },
      total: {
        type: Number,
        default: function() {
          return (this.pax?.adults || 0) + (this.pax?.children || 0);
        },
      },
    },
    nights: {
      type: Number,
      required: [true, 'Number of nights is required'],
      min: [1, 'At least one night is required'],
    },
    rooms: {
      type: Number,
      required: [true, 'Number of rooms is required'],
      min: [1, 'At least one room is required'],
    },
    days: {
      type: [daySchema],
      default: [],
    },
    pricing: {
      subtotal: {
        type: Number,
        default: 0,
      },
      markup: {
        percentage: {
          type: Number,
          default: 0,
          min: [0, 'Markup percentage cannot be negative'],
        },
        amount: {
          type: Number,
          default: 0,
        },
        isCustom: {
          type: Boolean,
          default: false,
        },
      },
      total: {
        type: Number,
        default: 0,
      },
      currency: {
        type: String,
        default: 'INR',
      },
      lastCalculatedAt: {
        type: Date,
        default: null,
      },
      calculationVersion: {
        type: Number,
        default: 1,
      },
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'confirmed', 'cancelled'],
      default: 'draft',
    },
    lockedAt: {
      type: Date,
      default: null,
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

// Calculate total pax before saving
itinerarySchema.pre('save', function(next) {
  if (this.pax) {
    this.pax.total = (this.pax.adults || 0) + (this.pax.children || 0);
  }
  next();
});

// Indexes
itinerarySchema.index({ itineraryNumber: 1 }, { unique: true });
itinerarySchema.index({ clientName: 1 });
itinerarySchema.index({ status: 1, createdAt: -1 });
itinerarySchema.index({ createdBy: 1 });
itinerarySchema.index({ 'travelDates.startDate': 1 });

const crmDb = getParadiseYatraCRMConnection();
const Itinerary = crmDb.model('Itinerary', itinerarySchema, 'itineraries');

export default Itinerary;


