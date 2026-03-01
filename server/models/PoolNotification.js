import mongoose from 'mongoose';
import { getLeadsPoolConnection } from '../config/db.js';

const connection = getLeadsPoolConnection();

const poolNotificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: ['lead_assignment', 'lead_update', 'system_alert', 'reminder', 'mention'],
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    link: {
        type: String,
        default: null,
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true,
    },
    readAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
});

poolNotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const PoolNotification = connection.model('PoolNotification', poolNotificationSchema, 'pool_notifications');

export default PoolNotification;
