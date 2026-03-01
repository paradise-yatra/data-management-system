import mongoose from 'mongoose';
import { getLeadsPoolConnection } from '../config/db.js';

const connection = getLeadsPoolConnection();

const poolLeadActivitySchema = new mongoose.Schema({
    leadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PoolLead',
        required: true,
        index: true,
    },
    action: {
        type: String,
        required: true,
        enum: ['CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'TRANSFER', 'COMMENT', 'SYNC'],
    },
    entityId: {
        type: String,
        required: true,
    },
    entityName: {
        type: String,
    },
    performedBy: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        role: String,
    },
    details: {
        type: Object,
        default: {},
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

poolLeadActivitySchema.index({ leadId: 1, timestamp: -1 });
poolLeadActivitySchema.index({ action: 1 });
poolLeadActivitySchema.index({ 'performedBy.userId': 1 });

const PoolLeadActivity = connection.model('PoolLeadActivity', poolLeadActivitySchema, 'pool_lead_activities');

export default PoolLeadActivity;
