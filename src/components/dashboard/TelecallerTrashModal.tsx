import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, RotateCcw, Trash2, Search, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { telecallerTrashAPI } from '@/services/api';
import { TelecallerTrashRecord } from '@/types/telecaller';
import { createPortal } from 'react-dom';
import { showToast } from '@/utils/notifications';
import { format } from 'date-fns';

interface TelecallerTrashModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRestore: () => void; // Callback to refresh main list if needed
}

export function TelecallerTrashModal({ isOpen, onClose, onRestore }: TelecallerTrashModalProps) {
    const [trashItems, setTrashItems] = useState<TelecallerTrashRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Delete Confirmation State
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const fetchTrash = async () => {
        setIsLoading(true);
        try {
            const data = await telecallerTrashAPI.getAll();
            setTrashItems(data);
        } catch (error) {
            console.error(error);
            showToast.error('Failed to load trash items');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchTrash();
            setSearch('');
            setDeleteConfirm(null);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const handleRestore = async (id: string) => {
        setActionLoading(id);
        try {
            await telecallerTrashAPI.restore(id);
            showToast.success('Lead restored successfully');
            setTrashItems(prev => prev.filter(item => item._id !== id));
            onRestore(); // Refresh the main panel
        } catch (error: any) {
            showToast.error(error.message || 'Failed to restore lead');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteForever = async (id: string) => {
        setActionLoading(id);
        try {
            await telecallerTrashAPI.deleteForever(id);
            showToast.success('Lead permanently deleted');
            setTrashItems(prev => prev.filter(item => item._id !== id));
            setDeleteConfirm(null);
        } catch (error: any) {
            showToast.error(error.message || 'Failed to delete lead');
        } finally {
            setActionLoading(null);
        }
    };

    const filteredItems = trashItems.filter(item => {
        const query = search.toLowerCase();
        const lead = item.leadData;
        return (
            lead.leadName?.toLowerCase().includes(query) ||
            lead.email?.toLowerCase().includes(query) ||
            lead.phone?.includes(query) ||
            item.originalId?.includes(query)
        );
    });

    if (typeof window === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative z-[101] w-full max-w-5xl h-[85vh] mx-4 rounded-xl border border-border bg-background shadow-2xl flex flex-col overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-border bg-card">
                            <div>
                                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                                    <Trash2 className="h-5 w-5 text-destructive" />
                                    Recycle Bin
                                </h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Manage deleted leads. Restore them or delete forever.
                                </p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={onClose} className="border-border">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Toolbar */}
                        <div className="p-4 border-b border-border flex items-center gap-4 bg-muted/20">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search deleted leads..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9 bg-background"
                                />
                            </div>
                            <div className="flex-1 text-right text-xs text-muted-foreground">
                                {filteredItems.length} items found
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-auto p-0">
                            {isLoading ? (
                                <div className="flex h-full items-center justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : filteredItems.length === 0 ? (
                                <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                                    <Trash2 className="h-12 w-12 mb-4 opacity-20" />
                                    <p className="text-lg font-medium">Bin is empty</p>
                                    <p className="text-sm">No deleted leads found.</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                                            <TableHead>Lead Information</TableHead>
                                            <TableHead>Destination</TableHead>
                                            <TableHead>Deleted At</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredItems.map((item) => (
                                            <TableRow key={item._id} className="hover:bg-muted/30">
                                                <TableCell className="font-medium">
                                                    <div>{item.leadData?.leadName || 'Unknown'}</div>
                                                    <div className="text-xs text-muted-foreground">{item.leadData?.email}</div>
                                                    <div className="text-xs text-muted-foreground">{item.leadData?.phone}</div>
                                                </TableCell>
                                                <TableCell>
                                                    {item.leadData?.destination ? (
                                                        <Badge variant="outline" className="font-normal text-xs">
                                                            {item.leadData.destination}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs text-center block">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {format(new Date(item.deletedAt), 'dd MMM yyyy, hh:mm a')}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {deleteConfirm === item._id ? (
                                                            <div className="flex items-center gap-2 animate-in slide-in-from-right-2 fade-in">
                                                                <span className="text-xs text-destructive font-medium">Sure?</span>
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    onClick={() => handleDeleteForever(item._id)}
                                                                    disabled={actionLoading === item._id}
                                                                    className="h-8 px-2 text-xs"
                                                                >
                                                                    {actionLoading === item._id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Yes'}
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => setDeleteConfirm(null)}
                                                                    className="h-8 px-2 text-xs"
                                                                >
                                                                    No
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleRestore(item._id)}
                                                                    disabled={!!actionLoading}
                                                                    className="h-8 w-8 p-0 border-green-500/20 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                                                                    title="Restore"
                                                                >
                                                                    {actionLoading === item._id ? (
                                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                                    ) : (
                                                                        <RotateCcw className="h-4 w-4" />
                                                                    )}
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => setDeleteConfirm(item._id)}
                                                                    disabled={!!actionLoading}
                                                                    className="h-8 w-8 p-0 border-destructive/20 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                    title="Delete Forever"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
