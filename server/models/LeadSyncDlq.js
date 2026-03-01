import mongoose from 'mongoose';
import { getLeadsPoolConnection } from '../config/db.js';

const connection = getLeadsPoolConnection();

const leadSyncDlqSchema = new mongoose.Schema({
    eventId: {
        type: String,
        required: true,
        index: true,
    },
    eventType: {
        type: String,
        required: true,
    },
    sourceSystem: {
        type: String,
        enum: ['telecaller', 'pool'],
        required: true,
    },
    sourceLeadId: {
        type: String,
        required: true,
    },
    sourceUniqueId: {
        type: String,
        default: null,
    },
    payload: {
        type: Object,
        default: {},
    },
    actor: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        name: { type: String, default: 'System' },
        role: { type: String, default: 'System' },
    },
    retryCount: {
        type: Number,
        default: 0,
    },
    error: {
        type: String,
        required: true,
    },
    errorHistory: [{
        message: { type: String },
        at: { type: Date, default: Date.now },
    }],
    movedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

leadSyncDlqSchema.index({ movedAt: -1 });

const LeadSyncDlq = connection.model('LeadSyncDlq', leadSyncDlqSchema, 'lead_sync_dlq');

export default LeadSyncDlq;
