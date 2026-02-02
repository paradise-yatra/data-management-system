import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['lead_assignment', 'lead_update', 'system_alert', 'reminder', 'mention'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    link: {
        type: String,
        default: null
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true
    },
    readAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// Virtual for time ago
notificationSchema.virtual('timeAgo').get(function () {
    const now = new Date();
    const diff = now - this.createdAt;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return this.createdAt.toLocaleDateString();
});

notificationSchema.set('toJSON', { virtuals: true });
notificationSchema.set('toObject', { virtuals: true });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
