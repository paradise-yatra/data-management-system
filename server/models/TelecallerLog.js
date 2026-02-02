import mongoose from 'mongoose';
import { getTelecallingConnection } from '../config/db.js';

const connection = getTelecallingConnection();

const telecallerLogSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        enum: ['CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'TRANSFER']
    },
    entityId: {
        type: String, // The uniqueId (PYTC-XXX) or _id of the lead
        required: true
    },
    entityName: {
        type: String, // Snapshot of lead name for easy reference
    },
    performedBy: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        role: String
    },
    details: {
        type: Object, // Specific changes
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Index for faster queries
telecallerLogSchema.index({ timestamp: -1 });
telecallerLogSchema.index({ 'performedBy.userId': 1 });
telecallerLogSchema.index({ action: 1 });

const TelecallerLog = connection.model('TelecallerLog', telecallerLogSchema, 'telecaller_logs');

export default TelecallerLog;
