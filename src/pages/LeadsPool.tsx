import { useState, useEffect, useMemo, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { leadsPoolAPI, usersAPI, type UserRecord } from '@/services/api';
import { LeadPoolRecord } from '@/types/leadsPool';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Inbox,
    Search,
    Filter,
    Upload,
    Download,
    UserPlus,
    RefreshCw,
    Trash2,
    Plus,
    TrendingUp,
    PhoneCall,
    Target,
    Users,
    ChevronDown,
    X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LeadsPoolTable } from '@/components/dashboard/LeadsPoolTable';
import { LeadsPoolDetailsModal } from '@/components/dashboard/LeadsPoolDetailsModal';
import { TelecallerRecordModal } from '@/components/dashboard/TelecallerRecordModal';
import { TelecallerImportModal } from '@/components/dashboard/TelecallerImportModal';
import { TelecallerDeleteConfirmDialog } from '@/components/dashboard/TelecallerDeleteConfirmDialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/animate-ui/components/radix/dropdown-menu';
import ExcelJS from 'exceljs';

export default function LeadsPool() {
    const { user } = useAuth();
    const { toast } = useToast();

    // Data State
    const [leads, setLeads] = useState<LeadPoolRecord[]>([]);
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sourceFilter, setSourceFilter] = useState('all');
    const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'unassigned' | 'assigned'>('all');

    // Modal State
    const [viewingLead, setViewingLead] = useState<LeadPoolRecord | null>(null);
    const [editingLead, setEditingLead] = useState<LeadPoolRecord | null>(null);
    const [deletingLead, setDeletingLead] = useState<LeadPoolRecord | null>(null);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [assignTarget, setAssignTarget] = useState<string | null>(null); // For bulk assign modal
    const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);

    // Fetch Data
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [allLeads, allUsers] = await Promise.all([
                leadsPoolAPI.getAll(),
                usersAPI.getAll().catch(() => []),
            ]);
            setLeads(allLeads);
            setUsers(allUsers);
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
        setLoading(false);
    }, [toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const activeUsers = useMemo(() => users.filter(u => u.isActive && (typeof u.departmentId === 'string' ? true : u.departmentId?.name === 'Sales')), [users]);
    const destinations = useMemo(
        () => {
            const values = Array.from(new Set(leads.map(l => l.destination).filter(Boolean)));
            const fallback = ['Goa', 'Dubai', 'Thailand', 'Bali', 'Kashmir'];
            const finalValues = values.length > 0 ? values : fallback;
            return finalValues.map((name, index) => ({ _id: `${name}-${index}`, name }));
        },
        [leads]
    );

    // Computed
    const uniqueSources = useMemo(() => Array.from(new Set(leads.map(l => l.source || 'Manual'))).sort(), [leads]);

    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            // Text Search
            const q = searchQuery.toLowerCase();
            const matchesSearch = !q ||
                lead.leadName?.toLowerCase().includes(q) ||
                lead.phone?.includes(q) ||
                lead.destination?.toLowerCase().includes(q);
            if (!matchesSearch) return false;

            // Status Filter
            if (statusFilter !== 'all' && lead.status !== statusFilter) return false;

            // Source Filter
            if (sourceFilter !== 'all' && (lead.source || 'Manual') !== sourceFilter) return false;

            // Assignment Filter
            if (assignmentFilter === 'unassigned' && lead.assignedTo) return false;
            if (assignmentFilter === 'assigned' && !lead.assignedTo) return false;

            return true;
        });
    }, [leads, searchQuery, statusFilter, sourceFilter, assignmentFilter]);

    const stats = useMemo(() => ({
        total: leads.length,
        unassigned: leads.filter(l => !l.assignedTo).length,
        hot: leads.filter(l => l.status === 'Hot').length,
        today: leads.filter(l => {
            const d = l.dateAdded ? new Date(l.dateAdded) : null;
            if (!d) return false;
            return d.toDateString() === new Date().toDateString();
        }).length,
    }), [leads]);

    // Handlers
    const handleSave = async (data: any) => {
        try {
            if (editingLead?._id) {
                const updated = await leadsPoolAPI.update(editingLead._id, data);
                setLeads(prev => prev.map(l => l._id === updated._id ? updated : l));
                toast({ title: 'Lead Updated' });
            } else {
                const created = await leadsPoolAPI.create(data);
                setLeads(prev => [created, ...prev]);
                toast({ title: 'Lead Created' });
            }
            setIsAddOpen(false);
            setEditingLead(null);
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
    };

    const handleDelete = async () => {
        if (!deletingLead?._id) return;
        try {
            await leadsPoolAPI.delete(deletingLead._id);
            setLeads(prev => prev.filter(l => l._id !== deletingLead._id));
            toast({ title: 'Lead Deleted' });
            setDeletingLead(null);
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
    };

    const handleBulkAssign = async (userId: string) => {
        try {
            const result = await leadsPoolAPI.bulkAssign(selectedIds, userId);
            toast({ title: 'Assigned', description: result.message });
            setIsBulkAssignOpen(false);
            setSelectedIds([]);
            fetchData();
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
    };

    const handleImport = async (entries: Partial<LeadPoolRecord>[]) => {
        try {
            const result = await leadsPoolAPI.bulkCreate(entries);
            toast({ title: 'Imported', description: result.message });
            fetchData();
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
            throw err; // Let modal handle error state if needed
        }
    }

    const handleExport = async () => {
        if (filteredLeads.length === 0) return toast({ title: 'Nothing to export', variant: 'destructive' });
        const data = filteredLeads.map(l => ({
            Name: l.leadName,
            Phone: l.phone,
            Email: l.email,
            Destination: l.destination,
            Status: l.status,
            Source: l.source,
            AssignedTo: typeof l.assignedTo === 'object' ? l.assignedTo?.name : 'Unassigned',
            Date: l.dateAdded
        }));

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Leads');

        if (data.length > 0) {
            worksheet.columns = Object.keys(data[0]).map(key => ({ header: key, key }));
        }

        data.forEach(row => {
            worksheet.addRow(row);
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `leads_pool_export_${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    return (
        <div className="flex h-screen w-full flex-row overflow-hidden bg-background">
            <Sidebar project="sales" />
            <div className="flex-1 flex flex-col h-full relative overflow-y-auto">
                <main className="pb-8">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mx-auto max-w-7xl px-6 pt-6"
                    >
                        <div className="flex flex-col gap-1">
                            <h1 className="text-3xl font-bold tracking-tight">Leads Pool</h1>
                            <p className="text-muted-foreground text-sm">Centralized lead management and assignment.</p>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 gap-4 py-6 sm:grid-cols-2 lg:grid-cols-4">
                            {[
                                { label: 'Total Leads', value: stats.total, icon: PhoneCall },
                                { label: 'Unassigned', value: stats.unassigned, icon: Target },
                                { label: 'Hot Leads', value: stats.hot, icon: TrendingUp },
                                { label: 'New Today', value: stats.today, icon: Inbox },
                            ].map((stat) => (
                                <div key={stat.label} className="rounded-lg border border-border bg-card p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                                            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{stat.value}</p>
                                        </div>
                                        <div className="rounded-full bg-muted p-3">
                                            <stat.icon className="h-5 w-5 text-foreground" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Toolbar */}
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2 flex-1">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search leads..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 bg-card border-border"
                                    />
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="gap-2 border-border bg-card">
                                            <Filter className="h-4 w-4" />
                                            Filters
                                            {(statusFilter !== 'all' || sourceFilter !== 'all' || assignmentFilter !== 'all') && (
                                                <span className="w-2 h-2 rounded-full bg-primary" />
                                            )}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-56">
                                        <DropdownMenuLabel>Status</DropdownMenuLabel>
                                        {['Hot', 'Cold', 'Not Reachable', 'Not Interested', 'Follow-up'].map(s => (
                                            <DropdownMenuItem key={s} onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}>
                                                <div className="flex items-center justify-between w-full">
                                                    {s}
                                                    {statusFilter === s && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                                </div>
                                            </DropdownMenuItem>
                                        ))}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuLabel>Assignment</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => setAssignmentFilter('unassigned')}>
                                            <div className="flex items-center justify-between w-full">
                                                Unassigned
                                                {assignmentFilter === 'unassigned' && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                            </div>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setAssignmentFilter('assigned')}>
                                            <div className="flex items-center justify-between w-full">
                                                Assigned
                                                {assignmentFilter === 'assigned' && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                            </div>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => { setStatusFilter('all'); setSourceFilter('all'); setAssignmentFilter('all'); }}>
                                            <span className="text-destructive">Clear Filters</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="flex items-center gap-2">
                                {selectedIds.length > 0 && (
                                    <>
                                        <Button variant="secondary" onClick={() => setIsBulkAssignOpen(true)}>
                                            <UserPlus className="h-4 w-4 mr-2" />
                                            Assign ({selectedIds.length})
                                        </Button>
                                        <div className="h-6 w-px bg-border mx-1" />
                                    </>
                                )}
                                <Button variant="outline" size="icon" onClick={() => fetchData()} disabled={loading}>
                                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                </Button>
                                <Button variant="outline" size="icon" onClick={handleExport}>
                                    <Download className="h-4 w-4" />
                                </Button>
                                <div className="flex gap-2">
                                    {typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default' && (
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                Notification.requestPermission().then(permission => {
                                                    if (permission === 'granted') {
                                                        new Notification('Notifications Enabled', {
                                                            body: 'You will now receive desktop alerts for leads.',
                                                            icon: '/favicon.ico'
                                                        });
                                                    }
                                                });
                                            }}
                                            className="gap-2 border-dashed"
                                        >
                                            <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                                            Enable Alerts
                                        </Button>
                                    )}
                                    <Button variant="outline" onClick={() => setIsImportOpen(true)} className="gap-2">
                                        <Upload className="h-4 w-4" />
                                        Import from Excel
                                    </Button>
                                    <Button onClick={() => { setEditingLead(null); setIsAddOpen(true); }} className="gap-2">
                                        <Plus className="h-4 w-4" />
                                        Add New Lead
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Table */}
                    <LeadsPoolTable
                        records={filteredLeads}
                        users={users}
                        onEdit={(l) => { setEditingLead(l); setIsAddOpen(true); }}
                        onDelete={(l) => setDeletingLead(l)}
                        onView={(l) => setViewingLead(l)}
                        selectedRecords={selectedIds}
                        onSelectionChange={setSelectedIds}
                        onRefresh={fetchData}
                    />
                </main>
            </div>

            {/* Modals */}
            <LeadsPoolDetailsModal
                isOpen={!!viewingLead}
                onClose={() => setViewingLead(null)}
                record={viewingLead}
                users={users}
            />

            <TelecallerRecordModal
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                onSave={handleSave}
                editingRecord={editingLead}
                destinations={destinations}
            />

            <TelecallerImportModal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                onSave={handleImport}
            />

            <TelecallerDeleteConfirmDialog
                isOpen={!!deletingLead}
                onCancel={() => setDeletingLead(null)}
                onConfirm={handleDelete}
                record={deletingLead}
            />

            {/* Bulk Assign Modal */}
            <AnimatePresence>
                {isBulkAssignOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsBulkAssignOpen(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-sm bg-card border border-border rounded-xl shadow-xl z-50 p-6">
                            <h3 className="text-lg font-semibold mb-2">Assign Leads</h3>
                            <p className="text-sm text-muted-foreground mb-4">Assign {selectedIds.length} selected leads to:</p>
                            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                                {activeUsers.map(u => (
                                    <button
                                        key={u._id}
                                        onClick={() => handleBulkAssign(u._id)}
                                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">
                                            {u.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{u.name}</p>
                                            <p className="text-xs text-muted-foreground capitalize">{u.role}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <Button variant="outline" className="w-full" onClick={() => setIsBulkAssignOpen(false)}>Cancel</Button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
