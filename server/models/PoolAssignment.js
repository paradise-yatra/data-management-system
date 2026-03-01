import mongoose from 'mongoose';
import { getLeadsPoolConnection } from '../config/db.js';

const connection = getLeadsPoolConnection();

const poolAssignmentSchema = new mongoose.Schema({
    leadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PoolLead',
        required: true,
        index: true,
    },
    fromUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    toUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    sourceSystem: {
        type: String,
        enum: ['pool', 'telecaller'],
        default: 'pool',
    },
    assignedAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
});

poolAssignmentSchema.index({ toUser: 1, assignedAt: -1 });

const PoolAssignment = connection.model('PoolAssignment', poolAssignmentSchema, 'pool_assignments');

export default PoolAssignment;
