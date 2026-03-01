import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Trash2, ChevronLeft, ChevronRight, Phone, MapPin, Calendar, Users, IndianRupee, UserCheck, Loader2 } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { LeadPoolRecord } from '@/types/leadsPool';
import { Badge } from '@/components/ui/badge';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSub,
    ContextMenuSubTrigger,
    ContextMenuSubContent,
} from "@/components/ui/context-menu";
import { leadsPoolAPI, UserRecord } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { showToast } from '@/utils/notifications';

interface LeadsPoolTableProps {
    records: LeadPoolRecord[];
    users: UserRecord[];
    onEdit: (record: LeadPoolRecord) => void;
    onDelete: (record: LeadPoolRecord) => void;
    onView: (record: LeadPoolRecord) => void;
    selectedRecords: string[];
    onSelectionChange: (selectedIds: string[]) => void;
    onRefresh: () => void;
}

const RECORDS_PER_PAGE = 10;

const getStatusColor = (status: string) => {
    switch (status) {
        case 'Hot': return 'bg-red-500/10 text-red-500 hover:bg-red-500/20';
        case 'Cold': return 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20';
        case 'Not Reachable': return 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20';
        case 'Not Interested': return 'bg-slate-500/10 text-slate-500 hover:bg-slate-500/20';
        case 'Follow-up': return 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20';
        default: return 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20';
    }
};

export function LeadsPoolTable({
    records,
    users,
    onEdit,
    onDelete,
    onView,
    selectedRecords,
    onSelectionChange,
    onRefresh,
}: LeadsPoolTableProps) {
    const { canView } = useAuth();
    const [currentPage, setCurrentPage] = useState(1);
    const [transferringLeadId, setTransferringLeadId] = useState<string | null>(null);

    // Filter users acceptable for transfer (Active & Sales dept)
    const transferUsers = useMemo(() => {
        return users.filter(u => {
            if (!u.isActive) return false;
            if (typeof u.departmentId === 'string') return true;
            if (typeof u.departmentId === 'object' && u.departmentId !== null) {
                return u.departmentId.name.toLowerCase() === 'sales';
            }
            return true;
        });
    }, [users]);

    const handleTransfer = async (lead: LeadPoolRecord, targetUser: UserRecord) => {
        if (!lead._id) return;
        setTransferringLeadId(lead._id);
        try {
            await leadsPoolAPI.transfer(lead._id, targetUser._id);
            showToast.success(`Lead assigned to ${targetUser.name}`);
            onRefresh();
        } catch (error: any) {
            showToast.error(error.message || 'Failed to transfer lead');
        } finally {
            setTransferringLeadId(null);
        }
    };

    const totalPages = Math.ceil(records.length / RECORDS_PER_PAGE);
    const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
    const paginatedRecords = records.slice(startIndex, startIndex + RECORDS_PER_PAGE);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const allIds = paginatedRecords.map((r) => r._id).filter(Boolean) as string[];
            const newSelection = [...new Set([...selectedRecords, ...allIds])];
            onSelectionChange(newSelection);
        } else {
            const pageIds = paginatedRecords.map((r) => r._id).filter(Boolean) as string[];
            onSelectionChange(selectedRecords.filter((id) => !pageIds.includes(id)));
        }
    };

    const handleSelectRecord = (recordId: string, checked: boolean) => {
        if (checked) {
            onSelectionChange([...selectedRecords, recordId]);
        } else {
            onSelectionChange(selectedRecords.filter((id) => id !== recordId));
        }
    };

    const isAllSelected = paginatedRecords.length > 0 &&
        paginatedRecords.every((r) => r._id && selectedRecords.includes(r._id));

    const formatDate = (dateString: string) => {
        if (!dateString) return '—';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch {
            return dateString;
        }
    };

    const getAssignedName = (lead: LeadPoolRecord) => {
        if (!lead.assignedTo) return 'Unassigned';
        // If assignedTo is an object (from populate, though we reverted it, keeping logic robust)
        if (typeof lead.assignedTo === 'object') return (lead.assignedTo as any).name;
        // If assignedTo is ID
        const user = users.find(u => u._id === lead.assignedTo);
        return user ? user.name : 'Unknown User';
    };

    if (records.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mx-auto max-w-7xl px-6 py-12"
            >
                <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
                    <p className="text-lg font-medium text-foreground">No leads found</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Add leads manually or import from Excel.
                    </p>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mx-auto max-w-7xl px-6 py-4"
        >
            <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-border bg-muted/50 hover:bg-muted/50">
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={isAllSelected}
                                        onCheckedChange={handleSelectAll}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-foreground">Lead Info</TableHead>
                                <TableHead className="font-semibold text-foreground">Destination</TableHead>
                                <TableHead className="font-semibold text-foreground">Travel Details</TableHead>
                                <TableHead className="font-semibold text-foreground">Status</TableHead>
                                <TableHead className="font-semibold text-foreground">Assigned To</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <AnimatePresence mode="popLayout">
                                {paginatedRecords.map((record, index) => (
                                    <ContextMenu key={record._id}>
                                        <ContextMenuTrigger asChild>
                                            <motion.tr
                                                key={record._id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 10 }}
                                                transition={{ delay: index * 0.03 }}
                                                onClick={() => onView(record)}
                                                className={`border-border transition-colors hover:bg-muted/30 cursor-pointer ${selectedRecords.includes(record._id || '') ? 'bg-muted/50' : ''
                                                    }`}
                                            >
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={selectedRecords.includes(record._id || '')}
                                                        onCheckedChange={(checked) => handleSelectRecord(record._id || '', checked as boolean)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-foreground">{record.leadName}</span>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                            <Phone className="h-3 w-3" /> {record.phone}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                        <MapPin className="h-3.5 w-3.5 text-primary" />
                                                        {record.destination || '—'}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-3 w-3" />
                                                            <span>{formatDate(record.travelDate)} {record.duration && `(${record.duration})`}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Users className="h-3 w-3" />
                                                            <span>{record.paxCount || 0} Pax</span>
                                                            {record.budget && (
                                                                <>
                                                                    <span>|</span>
                                                                    <IndianRupee className="h-3 w-3" />
                                                                    <span>{record.budget.toLocaleString('en-IN')}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className={getStatusColor(record.status)}>
                                                        {record.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`text-xs ${record.assignedTo ? 'text-foreground font-medium' : 'text-muted-foreground italic'}`}>
                                                        {getAssignedName(record)}
                                                    </span>
                                                </TableCell>
                                            </motion.tr>
                                        </ContextMenuTrigger>
                                        <ContextMenuContent>
                                            <ContextMenuItem onClick={() => onView(record)}>
                                                View Details
                                            </ContextMenuItem>
                                            <ContextMenuItem onClick={() => onEdit(record)}>
                                                <Pencil className="h-4 w-4 mr-2" />
                                                Edit Lead
                                            </ContextMenuItem>
                                            <ContextMenuItem onClick={() => onDelete(record)} className="text-destructive">
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete Lead
                                            </ContextMenuItem>
                                            <ContextMenuSub>
                                                <ContextMenuSubTrigger>
                                                    <UserCheck className="h-4 w-4 mr-2" />
                                                    Transfer Lead
                                                </ContextMenuSubTrigger>
                                                <ContextMenuSubContent className="max-h-64 overflow-y-auto">
                                                    {transferUsers.length === 0 ? (
                                                        <div className="p-2 text-sm text-muted-foreground">No users available</div>
                                                    ) : (
                                                        transferUsers.map(user => (
                                                            <ContextMenuItem
                                                                key={user._id}
                                                                onClick={() => handleTransfer(record, user)}
                                                                disabled={transferringLeadId === record._id}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                                                                        {user.name.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-sm">{user.name}</div>
                                                                        <div className="text-xs text-muted-foreground">{user.role}</div>
                                                                    </div>
                                                                </div>
                                                            </ContextMenuItem>
                                                        ))
                                                    )}
                                                </ContextMenuSubContent>
                                            </ContextMenuSub>
                                        </ContextMenuContent>
                                    </ContextMenu>
                                ))}
                            </AnimatePresence>
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t border-border px-4 py-3">
                    <p className="text-sm text-muted-foreground">
                        Showing {startIndex + 1} to {Math.min(startIndex + RECORDS_PER_PAGE, records.length)} of {records.length} leads
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="gap-1 border-border"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
                                .map(page => (
                                    <Button
                                        key={page}
                                        variant={page === currentPage ? 'default' : 'ghost'}
                                        size="sm"
                                        onClick={() => setCurrentPage(page)}
                                        className={
                                            page === currentPage
                                                ? 'bg-foreground text-background hover:bg-foreground/90'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }
                                    >
                                        {page}
                                    </Button>
                                ))}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="gap-1 border-border"
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
