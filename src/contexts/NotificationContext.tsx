import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';

interface Notification {
    _id: string;
    recipient: string;
    type: 'lead_assignment' | 'lead_update' | 'system_alert' | 'reminder' | 'mention';
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, unknown>;
    isRead: boolean;
    readAt?: string;
    createdAt: string;
    timeAgo?: string;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    isConnected: boolean;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
    clearAllNotifications: () => Promise<void>;
    fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : '');

// Notification sound
const playNotificationSound = () => {
    try {
        // Using a reliable external URL for the notification sound
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.5;
        audio.play().catch((err) => {
            console.warn('Autoplay prevented:', err);
        });
    } catch (error) {
        console.warn('Could not play notification sound:', error);
    }
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { token, isAuthenticated, user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    // Fetch notifications from API
    const fetchNotifications = useCallback(async () => {
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/notifications?limit=50`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                setNotifications(data.notifications);
                setUnreadCount(data.unreadCount);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    }, [token]);

    // Mark single notification as read
    const markAsRead = useCallback(async (id: string) => {
        if (!token) return;

        try {
            await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                credentials: 'include',
            });

            setNotifications(prev =>
                prev.map(n => (n._id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    }, [token]);

    // Mark all as read
    const markAllAsRead = useCallback(async () => {
        if (!token) return;

        try {
            await fetch(`${API_BASE_URL}/notifications/read-all`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                credentials: 'include',
            });

            setNotifications(prev =>
                prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
            );
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    }, [token]);

    // Delete notification
    const deleteNotification = useCallback(async (id: string) => {
        if (!token) return;

        try {
            await fetch(`${API_BASE_URL}/notifications/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                credentials: 'include',
            });

            const notification = notifications.find(n => n._id === id);
            setNotifications(prev => prev.filter(n => n._id !== id));
            if (notification && !notification.isRead) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    }, [token, notifications]);

    // Clear all notifications
    const clearAllNotifications = useCallback(async () => {
        if (!token) return;

        try {
            await fetch(`${API_BASE_URL}/notifications`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                credentials: 'include',
            });

            setNotifications([]);
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to clear notifications:', error);
        }
    }, [token]);

    // Initialize socket connection
    useEffect(() => {
        if (!isAuthenticated || !token) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setIsConnected(false);
            }
            return;
        }

        // Connect to socket
        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Socket connected');
            setIsConnected(true);
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
            setIsConnected(false);
        });

        socket.on('new_notification', (notification: Notification) => {
            console.log('New notification received:', notification);

            // Add to state
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);

            // Play sound
            playNotificationSound();

            // Show toast
            toast(notification.title, {
                description: notification.message,
                action: notification.link ? {
                    label: 'View',
                    onClick: () => {
                        window.location.href = notification.link!;
                    },
                } : undefined,
                duration: 5000,
            });
        });

        socket.on('unread_count_update', ({ count }: { count: number }) => {
            setUnreadCount(count);
        });

        // Fetch initial notifications
        fetchNotifications();

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [isAuthenticated, token, fetchNotifications]);

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                isConnected,
                markAsRead,
                markAllAsRead,
                deleteNotification,
                clearAllNotifications,
                fetchNotifications,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
}
