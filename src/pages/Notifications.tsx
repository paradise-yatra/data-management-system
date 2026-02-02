import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, CheckCheck, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useNotifications } from '@/contexts/NotificationContext';
import { cn } from '@/lib/utils';

interface NotificationItemProps {
    notification: {
        _id: string;
        type: string;
        title: string;
        message: string;
        link?: string;
        isRead: boolean;
        createdAt: string;
        timeAgo?: string;
    };
    onMarkAsRead: (id: string) => void;
    onDelete: (id: string) => void;
}

const getNotificationIcon = (type: string) => {
    switch (type) {
        case 'lead_assignment':
            return '🎯';
        case 'lead_update':
            return '📝';
        case 'system_alert':
            return '⚠️';
        case 'reminder':
            return '⏰';
        case 'mention':
            return '💬';
        default:
            return '🔔';
    }
};

const getNotificationColor = (type: string) => {
    switch (type) {
        case 'lead_assignment':
            return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        case 'lead_update':
            return 'bg-green-500/10 text-green-500 border-green-500/20';
        case 'system_alert':
            return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
        case 'reminder':
            return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
        case 'mention':
            return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
        default:
            return 'bg-muted text-muted-foreground';
    }
};

function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
    const navigate = useNavigate();

    const handleClick = () => {
        if (!notification.isRead) {
            onMarkAsRead(notification._id);
        }
        if (notification.link) {
            navigate(notification.link);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={cn(
                "p-4 border rounded-lg transition-all cursor-pointer group",
                notification.isRead
                    ? "bg-card/50 border-border/50"
                    : "bg-card border-primary/20 shadow-sm"
            )}
            onClick={handleClick}
        >
            <div className="flex items-start gap-4">
                <div className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full text-lg",
                    getNotificationColor(notification.type)
                )}>
                    {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className={cn(
                            "font-medium truncate",
                            !notification.isRead && "text-foreground"
                        )}>
                            {notification.title}
                        </h4>
                        {!notification.isRead && (
                            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                        {notification.timeAgo || formatDate(notification.createdAt)}
                    </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notification.isRead && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onMarkAsRead(notification._id);
                                    }}
                                >
                                    <Check className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Mark as read</TooltipContent>
                        </Tooltip>
                    )}
                    {notification.link && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(notification.link!);
                                    }}
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Go to link</TooltipContent>
                        </Tooltip>
                    )}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(notification._id);
                                }}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </motion.div>
    );
}

export default function Notifications() {
    const {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAllNotifications,
        isConnected
    } = useNotifications();

    const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
    const [isClearing, setIsClearing] = useState(false);

    const filteredNotifications = activeTab === 'unread'
        ? notifications.filter(n => !n.isRead)
        : notifications;

    const handleClearAll = async () => {
        setIsClearing(true);
        await clearAllNotifications();
        setIsClearing(false);
    };

    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar />
            <main className="flex-1 p-6 lg:p-8 overflow-auto">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <Bell className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">Notifications</h1>
                                <p className="text-sm text-muted-foreground">
                                    {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                                    {isConnected && (
                                        <span className="ml-2 inline-flex items-center gap-1 text-green-500">
                                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                            Live
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <Button variant="outline" size="sm" onClick={markAllAsRead}>
                                    <CheckCheck className="h-4 w-4 mr-2" />
                                    Mark all as read
                                </Button>
                            )}
                            {notifications.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleClearAll}
                                    disabled={isClearing}
                                    className="text-destructive hover:text-destructive"
                                >
                                    {isClearing ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4 mr-2" />
                                    )}
                                    Clear all
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Tabs */}
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'unread')}>
                        <TabsList className="mb-6">
                            <TabsTrigger value="all" className="relative">
                                All
                                <Badge variant="secondary" className="ml-2">
                                    {notifications.length}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger value="unread" className="relative">
                                Unread
                                {unreadCount > 0 && (
                                    <Badge className="ml-2 bg-primary">
                                        {unreadCount}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value={activeTab} className="space-y-3">
                            <AnimatePresence mode="popLayout">
                                {filteredNotifications.length === 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-center py-12"
                                    >
                                        <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                                        <h3 className="text-lg font-medium text-muted-foreground">
                                            {activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                                        </h3>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {activeTab === 'unread'
                                                ? "You're all caught up!"
                                                : "When you receive notifications, they'll appear here."}
                                        </p>
                                    </motion.div>
                                ) : (
                                    filteredNotifications.map((notification) => (
                                        <NotificationItem
                                            key={notification._id}
                                            notification={notification}
                                            onMarkAsRead={markAsRead}
                                            onDelete={deleteNotification}
                                        />
                                    ))
                                )}
                            </AnimatePresence>
                        </TabsContent>
                    </Tabs>
                </div>
            </main>
        </div>
    );
}
