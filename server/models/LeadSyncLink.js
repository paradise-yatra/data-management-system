import mongoose from 'mongoose';
import { getLeadsPoolConnection } from '../config/db.js';

const connection = getLeadsPoolConnection();

const leadSyncLinkSchema = new mongoose.Schema({
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
    targetSystem: {
        type: String,
        enum: ['telecaller', 'pool'],
        required: true,
    },
    targetLeadId: {
        type: String,
        required: true,
    },
    targetUniqueId: {
        type: String,
        default: null,
    },
    syncState: {
        type: String,
        enum: ['active', 'error', 'disabled'],
        default: 'active',
    },
    lastSyncedAt: {
        type: Date,
        default: Date.now,
    },
    lastEventId: {
        type: String,
        default: null,
    },
}, {
    timestamps: true,
});

leadSyncLinkSchema.index(
    { sourceSystem: 1, sourceLeadId: 1, targetSystem: 1 },
    { unique: true }
);
leadSyncLinkSchema.index({ targetSystem: 1, targetLeadId: 1 });

const LeadSyncLink = connection.model('LeadSyncLink', leadSyncLinkSchema, 'lead_sync_links');

export default LeadSyncLink;
