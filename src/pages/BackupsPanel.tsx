import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import {
    Database,
    Download,
    Trash2,
    RefreshCw,
    Play,
    Clock,
    HardDrive,
    FileArchive,
    Calendar,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    Timer
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Backup {
    filename: string;
    sizeBytes: number;
    sizeFormatted: string;
    createdAt: string;
    month: string;
    day: string;
    time: string;
}

interface BackupsResponse {
    backups: Backup[];
    totalCount: number;
    totalSize: string;
    totalSizeBytes: number;
}

interface ScheduleResponse {
    nextBackup: string;
    timeUntilNextMs: number;
    timeUntilNextFormatted: string;
    schedule: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export default function BackupsPanel() {
    const [backups, setBackups] = useState<Backup[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [totalSize, setTotalSize] = useState('0 Bytes');
    const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
    const [countdown, setCountdown] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<Backup | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchBackups = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/backups`, {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch backups');
            const data: BackupsResponse = await response.json();
            setBackups(data.backups);
            setTotalCount(data.totalCount);
            setTotalSize(data.totalSize);
        } catch (error) {
            console.error('Error fetching backups:', error);
            toast.error('Failed to fetch backups');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchSchedule = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/backups/schedule`, {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch schedule');
            const data: ScheduleResponse = await response.json();
            setSchedule(data);
        } catch (error) {
            console.error('Error fetching schedule:', error);
        }
    }, []);

    const triggerBackup = async () => {
        setIsBackingUp(true);
        try {
            const response = await fetch(`${API_BASE_URL}/backups/trigger`, {
                method: 'POST',
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to trigger backup');
            toast.success('Backup started! It may take a few minutes to complete.');
            // Wait a bit then refresh the list
            setTimeout(() => {
                fetchBackups();
                setIsBackingUp(false);
            }, 30000); // Wait 30 seconds before refreshing
        } catch (error) {
            console.error('Error triggering backup:', error);
            toast.error('Failed to start backup');
            setIsBackingUp(false);
        }
    };

    const deleteBackup = async (backup: Backup) => {
        setIsDeleting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/backups/${backup.filename}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to delete backup');
            toast.success('Backup deleted successfully');
            setDeleteConfirm(null);
            fetchBackups();
        } catch (error) {
            console.error('Error deleting backup:', error);
            toast.error('Failed to delete backup');
        } finally {
            setIsDeleting(false);
        }
    };

    const downloadBackup = async (backup: Backup) => {
        try {
            toast.info('Starting download...');
            const response = await fetch(`${API_BASE_URL}/backups/download/${backup.filename}`, {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to download backup');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = backup.filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Download started');
        } catch (error) {
            console.error('Error downloading backup:', error);
            toast.error('Failed to download backup');
        }
    };

    // Countdown timer
    useEffect(() => {
        if (!schedule) return;

        const updateCountdown = () => {
            const now = new Date().getTime();
            const next = new Date(schedule.nextBackup).getTime();
            const diff = next - now;

            if (diff <= 0) {
                setCountdown('Backup running...');
                fetchSchedule();
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setCountdown(`${hours}h ${minutes}m ${seconds}s`);
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [schedule, fetchSchedule]);

    useEffect(() => {
        fetchBackups();
        fetchSchedule();
    }, [fetchBackups, fetchSchedule]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar />
            <main className="flex-1 p-6 lg:p-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-7xl mx-auto space-y-6"
                >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Database Backups</h1>
                            <p className="text-muted-foreground mt-1">
                                Manage MongoDB backups for your cluster
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsLoading(true);
                                    fetchBackups();
                                    fetchSchedule();
                                }}
                                disabled={isLoading}
                            >
                                <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                                Refresh
                            </Button>
                            <Button
                                onClick={triggerBackup}
                                disabled={isBackingUp}
                                className="bg-primary"
                            >
                                {isBackingUp ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Play className="h-4 w-4 mr-2" />
                                )}
                                Backup Now
                            </Button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-2">
                                    <FileArchive className="h-4 w-4" />
                                    Total Backups
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold">{totalCount}</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-2">
                                    <HardDrive className="h-4 w-4" />
                                    Storage Used
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold">{totalSize}</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-2">
                                    <Timer className="h-4 w-4" />
                                    Next Backup In
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold text-primary">{countdown || 'Loading...'}</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Schedule
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-lg font-medium">Every 6 Hours</p>
                                <p className="text-xs text-muted-foreground mt-1">00:00, 06:00, 12:00, 18:00 UTC</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Backups Table */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Database className="h-5 w-5" />
                                        Backup History
                                    </CardTitle>
                                    <CardDescription>
                                        All database backups are automatically deleted after 30 days
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : backups.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <Database className="h-12 w-12 text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-medium">No backups found</h3>
                                    <p className="text-muted-foreground mt-1">
                                        Click "Backup Now" to create your first backup
                                    </p>
                                </div>
                            ) : (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Filename</TableHead>
                                                <TableHead>Created</TableHead>
                                                <TableHead>Size</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <AnimatePresence>
                                                {backups.map((backup, index) => (
                                                    <motion.tr
                                                        key={backup.filename}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, x: -10 }}
                                                        transition={{ delay: index * 0.05 }}
                                                        className="border-b transition-colors hover:bg-muted/50"
                                                    >
                                                        <TableCell className="font-medium">
                                                            <div className="flex items-center gap-2">
                                                                <FileArchive className="h-4 w-4 text-primary" />
                                                                {backup.filename}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                                <Calendar className="h-4 w-4" />
                                                                {formatDate(backup.createdAt)}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="font-medium">{backup.sizeFormatted}</span>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => downloadBackup(backup)}
                                                                            className="h-8 w-8 p-0"
                                                                        >
                                                                            <Download className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Download backup</TooltipContent>
                                                                </Tooltip>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => setDeleteConfirm(backup)}
                                                                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Delete backup</TooltipContent>
                                                                </Tooltip>
                                                            </div>
                                                        </TableCell>
                                                    </motion.tr>
                                                ))}
                                            </AnimatePresence>
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Info Card */}
                    <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="pt-6">
                            <div className="flex gap-4">
                                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium">Automatic Backup System Active</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Backups run every 6 hours and are stored on the VPS at <code className="bg-muted px-1.5 py-0.5 rounded text-xs">/root/Backups/Mongodb</code>.
                                        Backups older than 30 days are automatically deleted.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Delete Confirmation Dialog */}
                <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                                Delete Backup
                            </DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete this backup? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        {deleteConfirm && (
                            <div className="bg-muted/50 rounded-lg p-4 my-4">
                                <p className="font-medium">{deleteConfirm.filename}</p>
                                <p className="text-sm text-muted-foreground">
                                    Size: {deleteConfirm.sizeFormatted} • Created: {formatDate(deleteConfirm.createdAt)}
                                </p>
                            </div>
                        )}
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setDeleteConfirm(null)}
                                disabled={isDeleting}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => deleteConfirm && deleteBackup(deleteConfirm)}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Trash2 className="h-4 w-4 mr-2" />
                                )}
                                Delete Backup
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}
