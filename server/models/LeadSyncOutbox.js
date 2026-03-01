import mongoose from 'mongoose';
import { getLeadsPoolConnection } from '../config/db.js';

const connection = getLeadsPoolConnection();

const leadSyncOutboxSchema = new mongoose.Schema({
    eventId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    eventType: {
        type: String,
        required: true,
        enum: ['lead.created', 'lead.updated', 'lead.transferred', 'lead.deleted', 'lead.restored', 'lead.commented'],
    },
    sourceSystem: {
        type: String,
        required: true,
        enum: ['telecaller', 'pool'],
    },
    sourceLeadId: {
        type: String,
        required: true,
        index: true,
    },
    sourceUniqueId: {
        type: String,
        default: null,
    },
    payload: {
        type: Object,
        required: true,
        default: {},
    },
    actor: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        name: { type: String, default: 'System' },
        role: { type: String, default: 'System' },
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'dead'],
        default: 'pending',
        index: true,
    },
    retryCount: {
        type: Number,
        default: 0,
    },
    error: {
        type: String,
        default: null,
    },
    nextAttemptAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
    processedAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
});

leadSyncOutboxSchema.index({ status: 1, nextAttemptAt: 1 });
leadSyncOutboxSchema.index({ sourceSystem: 1, sourceLeadId: 1, createdAt: -1 });

const LeadSyncOutbox = connection.model('LeadSyncOutbox', leadSyncOutboxSchema, 'lead_sync_outbox');

export default LeadSyncOutbox;
