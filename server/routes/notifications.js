import express from 'express';
import Notification from '../models/Notification.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/notifications - Get notifications for logged-in user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { limit = 20, skip = 0, unreadOnly = false } = req.query;
        const userId = req.user._id;

        const query = { recipient: userId };
        if (unreadOnly === 'true') {
            query.isRead = false;
        }

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .lean();

        const unreadCount = await Notification.countDocuments({
            recipient: userId,
            isRead: false
        });

        const totalCount = await Notification.countDocuments({ recipient: userId });

        res.json({
            notifications,
            unreadCount,
            totalCount,
            hasMore: parseInt(skip) + notifications.length < totalCount
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// GET /api/notifications/unread-count - Get unread count only
router.get('/unread-count', authenticateToken, async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            recipient: req.user._id,
            isRead: false
        });
        res.json({ count });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({ error: 'Failed to fetch unread count' });
    }
});

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user._id },
            { isRead: true, readAt: new Date() },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ notification });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

// PUT /api/notifications/read-all - Mark all as read
router.put('/read-all', authenticateToken, async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, isRead: false },
            { isRead: true, readAt: new Date() }
        );

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Failed to mark all as read' });
    }
});

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            recipient: req.user._id
        });

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ message: 'Notification deleted' });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});

// DELETE /api/notifications - Delete all notifications
router.delete('/', authenticateToken, async (req, res) => {
    try {
        await Notification.deleteMany({ recipient: req.user._id });
        res.json({ message: 'All notifications deleted' });
    } catch (error) {
        console.error('Error deleting notifications:', error);
        res.status(500).json({ error: 'Failed to delete notifications' });
    }
});

export default router;
