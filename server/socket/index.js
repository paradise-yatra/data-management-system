import jwt from 'jsonwebtoken';

// Store connected users: userId -> Set of socketIds
const connectedUsers = new Map();

export const initializeSocket = (io) => {
    // Middleware to authenticate socket connections
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

        if (!token) {
            return next(new Error('Authentication required'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.userId;
            next();
        } catch (error) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.userId;
        console.log(`User connected: ${userId} (socket: ${socket.id})`);

        // Add user to connected users map
        if (!connectedUsers.has(userId)) {
            connectedUsers.set(userId, new Set());
        }
        connectedUsers.get(userId).add(socket.id);

        // Join user's personal room for targeted notifications
        socket.join(`user:${userId}`);

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log(`User disconnected: ${userId} (socket: ${socket.id})`);
            const userSockets = connectedUsers.get(userId);
            if (userSockets) {
                userSockets.delete(socket.id);
                if (userSockets.size === 0) {
                    connectedUsers.delete(userId);
                }
            }
        });

        // Optional: Mark notification as read in real-time
        socket.on('mark_read', async (notificationId) => {
            try {
                const Notification = (await import('../models/Notification.js')).default;
                await Notification.findOneAndUpdate(
                    { _id: notificationId, recipient: userId },
                    { isRead: true, readAt: new Date() }
                );
                // Emit updated unread count
                const unreadCount = await Notification.countDocuments({
                    recipient: userId,
                    isRead: false
                });
                socket.emit('unread_count_update', { count: unreadCount });
            } catch (error) {
                console.error('Error marking notification as read:', error);
            }
        });
    });

    return io;
};

// Helper function to send notification to a specific user
export const sendNotificationToUser = async (io, userId, notification) => {
    // Emit to user's room (all their connected devices/tabs)
    io.to(`user:${userId}`).emit('new_notification', notification);
};

// Check if user is currently online
export const isUserOnline = (userId) => {
    return connectedUsers.has(userId) && connectedUsers.get(userId).size > 0;
};

// Get all online user IDs
export const getOnlineUsers = () => {
    return Array.from(connectedUsers.keys());
};
