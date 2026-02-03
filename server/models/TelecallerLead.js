import mongoose from 'mongoose';
import { getTelecallingConnection } from '../config/db.js';

const connection = getTelecallingConnection();

const telecallerLeadSchema = new mongoose.Schema({
    uniqueId: {
        type: String,
        unique: true,
    },
    leadName: {
        type: String,
        trim: true,
    },
    phone: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        trim: true,
        default: '',
    },
    destination: {
        type: String, // Store name or ID, but will be a dropdown in UI
    },
    duration: {
        type: String,
        trim: true,
    },
    travelDate: {
        type: String, // String format for flexibility or ISO date
    },
    budget: {
        type: Number,
    },
    paxCount: {
        type: Number,
    },
    adults: {
        type: Number,
    },
    children: {
        type: Number,
    },
    status: {
        type: String,
        enum: ['Hot', 'Cold', 'Not Reachable', 'Not Interested', 'Follow-up'],
        default: 'Hot',
    },
    nextFollowUp: {
        type: String,
    },
    remarks: {
        type: String,
        default: '',
        trim: true,
    },
    dateAdded: {
        type: String,
        required: true,
    },
    addedBy: {
        type: String,
        default: 'System',
    },
    addedById: {
        type: String,
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Update the updatedAt field and format name before saving
telecallerLeadSchema.pre('save', function (next) {
    this.updatedAt = Date.now();

    // Format leadName to Title Case
    if (this.leadName) {
        this.leadName = this.leadName
            .trim()
            .toLowerCase()
            .split(/\s+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    next();
});

// Auto-increment uniqueId before saving a new document
telecallerLeadSchema.pre('save', async function (next) {
    if (this.isNew && !this.uniqueId) {
        try {
            const LeadModel = this.constructor;
            const lastLead = await LeadModel.findOne({}, { uniqueId: 1 }).sort({ createdAt: -1 });

            let nextNum = 1;
            if (lastLead && lastLead.uniqueId) {
                const match = lastLead.uniqueId.match(/PYTC-(\d+)/);
                if (match) {
                    nextNum = parseInt(match[1], 10) + 1;
                }
            }

            this.uniqueId = `PYTC-${nextNum}`;
        } catch (error) {
            console.error('Error generating uniqueId:', error);
            this.uniqueId = 'PYTC-1'; // Fallback
        }
    }
    next();
});

const TelecallerLead = connection.model('TelecallerLead', telecallerLeadSchema, 'telecaller_leads');

export default TelecallerLead;
