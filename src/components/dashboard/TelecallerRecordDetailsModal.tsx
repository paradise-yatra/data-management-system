import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Phone, MapPin, Calendar, FileText, Hash, Users, IndianRupee, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TelecallerLeadRecord } from '@/types/telecaller';

interface TelecallerRecordDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    record: TelecallerLeadRecord | null;
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'New': return 'bg-blue-500/10 text-blue-500';
        case 'Interested': return 'bg-purple-500/10 text-purple-500';
        case 'Follow-up': return 'bg-yellow-500/10 text-yellow-500';
        case 'Quotation Sent': return 'bg-cyan-500/10 text-cyan-500';
        case 'Booked': return 'bg-green-500/10 text-green-500';
        case 'Lost': return 'bg-red-500/10 text-red-500';
        default: return 'bg-gray-500/10 text-gray-500';
    }
};

export function TelecallerRecordDetailsModal({
    isOpen,
    onClose,
    record,
}: TelecallerRecordDetailsModalProps) {
    const formatDateTime = (dateString?: string) => {
        if (!dateString) return '—';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric',
            });
        } catch {
            return dateString;
        }
    };

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        if (isOpen) document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (typeof window === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && record && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative z-[101] w-full max-w-4xl mx-4 rounded-lg border border-border bg-background p-6 shadow-xl max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-bold text-foreground">{record.leadName}</h2>
                                    <Badge variant="secondary" className={getStatusColor(record.status)}>
                                        {record.status}
                                    </Badge>
                                </div>
                                <span className="text-sm font-mono text-muted-foreground">{record.uniqueId}</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-6">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact Details</h3>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <Phone className="h-4 w-4 mt-1 text-primary" />
                                        <div className="flex flex-col">
                                            <span className="text-xs text-muted-foreground">Phone</span>
                                            <span className="text-sm text-foreground font-medium">{record.phone || '—'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Mail className="h-4 w-4 mt-1 text-primary" />
                                        <div className="flex flex-col">
                                            <span className="text-xs text-muted-foreground">Email</span>
                                            <span className="text-sm text-foreground font-medium">{record.email || '—'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Travel Plan</h3>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="h-4 w-4 mt-1 text-primary" />
                                        <div className="flex flex-col">
                                            <span className="text-xs text-muted-foreground">Destination</span>
                                            <span className="text-sm text-foreground font-medium">{record.destination || '—'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Calendar className="h-4 w-4 mt-1 text-primary" />
                                        <div className="flex flex-col">
                                            <span className="text-xs text-muted-foreground">Travel Date & Duration</span>
                                            <span className="text-sm text-foreground font-medium">
                                                {formatDateTime(record.travelDate)} {record.duration && `(${record.duration})`}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Users className="h-4 w-4 mt-1 text-primary" />
                                        <div className="flex flex-col">
                                            <span className="text-xs text-muted-foreground">Passengers (Pax)</span>
                                            <span className="text-sm text-foreground font-medium">{record.paxCount || 0} People</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Financials & Follow-up</h3>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <IndianRupee className="h-4 w-4 mt-1 text-primary" />
                                        <div className="flex flex-col">
                                            <span className="text-xs text-muted-foreground">Budget</span>
                                            <span className="text-sm text-foreground font-medium">
                                                {record.budget ? `₹${record.budget.toLocaleString('en-IN')}` : '—'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Clock className="h-4 w-4 mt-1 text-primary" />
                                        <div className="flex flex-col">
                                            <span className="text-xs text-muted-foreground">Next Follow-up</span>
                                            <span className={`text-sm font-medium ${record.nextFollowUp && new Date(record.nextFollowUp) < new Date() ? 'text-red-500' : 'text-foreground'}`}>
                                                {formatDateTime(record.nextFollowUp)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Hash className="h-4 w-4 mt-1 text-primary" />
                                        <div className="flex flex-col">
                                            <span className="text-xs text-muted-foreground">Created On</span>
                                            <span className="text-sm text-foreground font-medium">{formatDateTime(record.dateAdded)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 p-4 rounded-lg bg-muted/30 border border-border">
                            <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-foreground">
                                <FileText className="h-4 w-4" />
                                Latest Remarks
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed italic">
                                {record.remarks || "No remarks added yet..."}
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-border">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                className="border-border"
                            >
                                Close
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
