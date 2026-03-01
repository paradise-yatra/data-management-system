import mongoose from 'mongoose';
import { getLeadsPoolConnection } from '../config/db.js';

const connection = getLeadsPoolConnection();

const poolLeadSchema = new mongoose.Schema({
    uniqueId: {
        type: String,
        unique: true,
        index: true,
    },
    leadName: {
        type: String,
        trim: true,
    },
    phone: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    email: {
        type: String,
        trim: true,
        default: '',
    },
    source: {
        type: String,
        trim: true,
        default: 'Manual',
        index: true,
    },
    destination: {
        type: String,
        trim: true,
    },
    duration: {
        type: String,
        trim: true,
    },
    travelDate: {
        type: String,
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
        index: true,
    },
    nextFollowUp: {
        type: String,
    },
    remarks: {
        type: String,
        trim: true,
        default: '',
    },
    addedBy: {
        type: String,
        default: 'System',
    },
    addedById: {
        type: String,
    },
    dateAdded: {
        type: String,
        required: true,
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true,
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    assignedAt: {
        type: Date,
        default: null,
    },
    externalRefs: {
        telecallerLeadId: {
            type: String,
            index: true,
            default: null,
        },
        telecallerUniqueId: {
            type: String,
            index: true,
            default: null,
        },
    },
    syncMeta: {
        lastSyncedAt: {
            type: Date,
            default: null,
        },
        lastSyncedFrom: {
            type: String,
            enum: ['pool', 'telecaller', null],
            default: null,
        },
        lastEventId: {
            type: String,
            default: null,
        },
    },
    isDeleted: {
        type: Boolean,
        default: false,
        index: true,
    },
    deletedAt: {
        type: Date,
        default: null,
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

poolLeadSchema.index({ source: 1, 'externalRefs.telecallerLeadId': 1 }, { unique: false });

poolLeadSchema.pre('save', function (next) {
    this.updatedAt = Date.now();

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

poolLeadSchema.pre('save', async function (next) {
    if (this.isNew && !this.uniqueId) {
        try {
            const LeadModel = this.constructor;
            const lastLead = await LeadModel.findOne({}, { uniqueId: 1 }).sort({ createdAt: -1 });

            let nextNum = 1;
            if (lastLead && lastLead.uniqueId) {
                const match = lastLead.uniqueId.match(/PYLP-(\d+)/);
                if (match) {
                    nextNum = parseInt(match[1], 10) + 1;
                }
            }

            this.uniqueId = `PYLP-${nextNum}`;
        } catch (error) {
            console.error('Error generating pool uniqueId:', error);
            this.uniqueId = `PYLP-${Date.now()}`;
        }
    }
    next();
});

const PoolLead = connection.model('PoolLead', poolLeadSchema, 'pool_leads');

export default PoolLead;
