import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    User,
    Settings,
    Shield,
    Camera,
    Moon,
    Sun,
    Monitor,
    Check,
    Mail,
    Calendar,
    CircleDot
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type TabType = 'account' | 'appearance' | 'security' | 'notifications';

export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();
    const [activeTab, setActiveTab] = useState<TabType>('account');
    const [isUpdatingTheme, setIsUpdatingTheme] = useState(false);

    const menuItems = [
        { id: 'account', label: 'My Account', icon: <User className="h-4 w-4" /> },
        { id: 'appearance', label: 'Appearance', icon: <Settings className="h-4 w-4" /> },
    ];

    const themeOptions = [
        { id: 'light', label: 'Light', icon: <Sun className="h-6 w-6" />, color: 'bg-white' },
        { id: 'dark', label: 'Dark', icon: <Moon className="h-6 w-6" />, color: 'bg-slate-950' },
        { id: 'abyss', label: 'Abyss', icon: <CircleDot className="h-6 w-6" />, color: 'bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700' },
        { id: 'vscode-dark-plus', label: 'VS Code Dark+', icon: <CircleDot className="h-6 w-6" />, color: 'bg-gradient-to-br from-[#1e1e1e] via-[#252526] to-[#007acc]' },
        { id: 'discord-graphite', label: 'Discord Graphite', icon: <CircleDot className="h-6 w-6" />, color: 'bg-gradient-to-br from-[#1e1f22] via-[#2b2d31] to-[#5865f2]' },
        { id: 'nord', label: 'Nord', icon: <CircleDot className="h-6 w-6" />, color: 'bg-gradient-to-br from-[#2e3440] via-[#3b4252] to-[#88c0d0]' },
        { id: 'tokyo-night', label: 'Tokyo Night', icon: <CircleDot className="h-6 w-6" />, color: 'bg-gradient-to-br from-[#1a1b26] via-[#24283b] to-[#7aa2f7]' },
        { id: 'catppuccin-mocha', label: 'Catppuccin', icon: <CircleDot className="h-6 w-6" />, color: 'bg-gradient-to-br from-[#1e1e2e] via-[#313244] to-[#89b4fa]' },
        { id: 'one-dark-pro', label: 'One Dark Pro', icon: <CircleDot className="h-6 w-6" />, color: 'bg-gradient-to-br from-[#282c34] via-[#353b45] to-[#61afef]' },
        { id: 'dracula', label: 'Dracula', icon: <CircleDot className="h-6 w-6" />, color: 'bg-gradient-to-br from-[#282a36] via-[#343746] to-[#bd93f9]' },
        { id: 'gruvbox-dark', label: 'Gruvbox Dark', icon: <CircleDot className="h-6 w-6" />, color: 'bg-gradient-to-br from-[#282828] via-[#3c3836] to-[#fabd2f]' },
        { id: 'solarized-dark', label: 'Solarized Dark', icon: <CircleDot className="h-6 w-6" />, color: 'bg-gradient-to-br from-[#002b36] via-[#073642] to-[#268bd2]' },
        { id: 'synthwave', label: 'Synthwave', icon: <CircleDot className="h-6 w-6" />, color: 'bg-gradient-to-br from-[#241b2f] via-[#34294f] to-[#ff7edb]' },
        { id: 'system', label: 'System', icon: <Monitor className="h-6 w-6" />, color: 'bg-gradient-to-br from-white to-slate-950' }
    ] as const;

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl h-[85vh] max-h-[640px] min-h-[480px] p-0 gap-0 overflow-hidden border border-border bg-background shadow-lg">
                <div className="flex h-full">
                    {/* Left Sidebar */}
                    <div className="w-52 border-r border-border/50 bg-muted/30 p-3 flex flex-col gap-2.5">
                        <div className="flex items-center gap-2 px-2 pb-4 border-b border-border/30">
                            <Settings className="h-5 w-5 text-primary" />
                            <h2 className="font-semibold text-base text-foreground tracking-tight">Settings</h2>
                        </div>
                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id as TabType)}
                                        className={cn(
                                            "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all",
                                            activeTab === item.id
                                                ? "bg-primary/10 text-foreground shadow-sm"
                                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                        )}
                            >
                                {item.icon}
                                {item.label}
                                {activeTab === item.id && (
                                    <motion.div
                                        layoutId="active-tab"
                                        className="ml-auto"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                    >
                                        <Check className="h-3 w-3" />
                                    </motion.div>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Right Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 relative bg-card/40">
                        <AnimatePresence mode="wait">
                            {activeTab === 'account' && (
                                <motion.div
                                    key="account"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-8"
                                >
                                    <div>
                                        <h3 className="text-xl font-semibold text-foreground">My Account</h3>
                                        <p className="text-xs text-muted-foreground mt-1">Manage your personal information and profile settings.</p>
                                    </div>

                                    {/* Profile Image Section */}
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl bg-muted/40 border border-border/40">
                                        <div className="relative group">
                                            <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                                                <AvatarImage src="" />
                                                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                                                    {user?.name?.charAt(0) || 'U'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <button className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground shadow hover:scale-105 transition-transform">
                                                <Camera className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-semibold text-foreground">Profile Picture</h4>
                                            <p className="text-[11px] text-muted-foreground max-w-xs">JPG, GIF or PNG. Max size 2MB.</p>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" className="h-8 text-xs px-3">Upload</Button>
                                                <Button size="sm" variant="ghost" className="h-8 text-xs px-3 text-destructive hover:text-destructive hover:bg-destructive/10">Remove</Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Details Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 py-2">
                                        <div className="space-y-1.5 border-b border-border/40 pb-3">
                                            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-bold">Full Name</Label>
                                            <div className="flex items-center gap-3">
                                                <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <User className="h-3 w-3 text-primary" />
                                                </div>
                                                <span className="text-sm font-semibold text-foreground">{user?.name || 'N/A'}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5 border-b border-border/40 pb-3">
                                            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-bold">Email Address</Label>
                                            <div className="flex items-center gap-3">
                                                <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <Mail className="h-3 w-3 text-primary" />
                                                </div>
                                                <span className="text-sm font-semibold text-foreground">{user?.email || 'N/A'}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5 border-b border-border/40 pb-3">
                                            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-bold">User Role</Label>
                                            <div className="flex items-center gap-3">
                                                <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <Shield className="h-3 w-3 text-primary" />
                                                </div>
                                                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] capitalize font-bold text-primary bg-primary/10 border-primary/20">
                                                    {user?.role || 'User'}
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5 border-b border-border/40 pb-3">
                                            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-bold">Account Status</Label>
                                            <div className="flex items-center gap-3">
                                                <div className="h-4 w-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                                    <CircleDot className="h-3 w-3 text-emerald-500" />
                                                </div>
                                                <span className="text-sm font-bold text-emerald-500">Active</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-border/50 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between flex-wrap">
                                        <div className="space-y-1">
                                                <p className="text-xs font-medium text-foreground flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                                    Created on {formatDate(user?.createdAt)}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground">Last updated {formatDate(user?.updatedAt)}</p>
                                            </div>
                                            <Button
                                                onClick={() => {
                                                    toast.success('Changes saved successfully');
                                                    onClose();
                                                }}
                                                className="bg-primary hover:bg-primary/90 shadow-md px-4 py-2 rounded-lg text-sm w-full sm:w-auto"
                                            >
                                                Save Changes
                                            </Button>
                                        </div>
                                </motion.div>
                            )}

                            {activeTab === 'appearance' && (
                                <motion.div
                                    key="appearance"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-8"
                                >
                                    <div>
                                        <h3 className="text-2xl font-bold text-foreground">Appearance</h3>
                                        <p className="text-muted-foreground text-sm mt-1">Customize how the CRM looks on your device.</p>
                                    </div>

                                    <div className="space-y-4">
                                        <Label className="text-sm font-semibold">Theme Preference</Label>
                                        <div className="max-h-[360px] overflow-y-auto pr-1">
                                            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                                            {themeOptions.map((t) => (
                                                <button
                                                    key={t.id}
                                                    onClick={async () => {
                                                        if (isUpdatingTheme) return;
                                                        setIsUpdatingTheme(true);
                                                        try {
                                                            await setTheme(t.id);
                                                        } catch (error) {
                                                            console.error('Failed to update theme:', error);
                                                        } finally {
                                                            setIsUpdatingTheme(false);
                                                        }
                                                    }}
                                                    disabled={isUpdatingTheme}
                                                    className={cn(
                                                        "group flex flex-col items-center gap-2 p-3 rounded-xl border transition-all relative overflow-hidden",
                                                        theme === t.id
                                                            ? "border-primary bg-primary/5 shadow-inner"
                                                            : "border-border/50 hover:border-border hover:bg-muted/50",
                                                        isUpdatingTheme && "opacity-50 cursor-not-allowed"
                                                    )}
                                                >
                                                    <div className={cn("w-full h-20 rounded-lg flex items-center justify-center border border-border shadow-sm mb-2", t.color)}>
                                                        <div className={cn(
                                                            "transition-transform duration-300 group-hover:scale-110",
                                                            theme === t.id ? "text-primary" : "text-muted-foreground"
                                                        )}>
                                                            {t.icon}
                                                        </div>
                                                    </div>
                                                    <span className={cn(
                                                        "text-sm font-medium",
                                                        theme === t.id ? "text-foreground" : "text-muted-foreground"
                                                    )}>
                                                        {t.label}
                                                    </span>
                                                    {theme === t.id && (
                                                        <div className="absolute top-2 right-2 h-5 w-5 bg-primary rounded-full flex items-center justify-center shadow-lg">
                                                            <Check className="h-3 w-3 text-primary-foreground" />
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                            </div>
                                        </div>
                                    </div>

                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
