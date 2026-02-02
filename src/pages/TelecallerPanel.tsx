import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, RefreshCw, PhoneCall, TrendingUp, Calendar, CheckSquare, ChevronDown, Search as SearchIcon, UserCheck, X } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { telecallerAPI } from '@/services/api';
import { TelecallerLeadRecord, TelecallerFilterState } from '@/types/telecaller';
import { TelecallerDataTable } from '@/components/dashboard/TelecallerDataTable';
import { TelecallerRecordModal } from '@/components/dashboard/TelecallerRecordModal';
import { TelecallerRecordDetailsModal } from '@/components/dashboard/TelecallerRecordDetailsModal';
import { TelecallerDeleteConfirmDialog } from '@/components/dashboard/TelecallerDeleteConfirmDialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/animate-ui/components/radix/dropdown-menu';
import { showToast } from '@/utils/notifications';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Trash2 } from 'lucide-react';
import { TelecallerLogsModal } from '@/components/dashboard/TelecallerLogsModal';
import { TelecallerTrashModal } from '@/components/dashboard/TelecallerTrashModal';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const STATS_CARDS = [
    { label: 'Total Leads', key: 'total', icon: PhoneCall },
    { label: 'Hot Leads', key: 'hot', icon: TrendingUp },
    { label: 'Follow-ups Today', key: 'followup', icon: Calendar },
    { label: 'Not Interested', key: 'notInterested', icon: X },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

const TelecallerPanel = () => {
    const [leads, setLeads] = useState<TelecallerLeadRecord[]>([]);
    const [destinations, setDestinations] = useState<{ _id: string, name: string }[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState<TelecallerLeadRecord | null>(null);
    const [viewingLead, setViewingLead] = useState<TelecallerLeadRecord | null>(null);
    const [deleteLead, setDeleteLead] = useState<TelecallerLeadRecord | null>(null);
    const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
    const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
    const { canView, user } = useAuth();
    const location = useLocation();
    const isAssignedView = location.pathname.includes('/assigned');

    const [filters, setFilters] = useState<TelecallerFilterState>({
        search: '',
        statusFilter: 'all',
        destinationFilter: 'all',
        dateFilter: 'all',
    });

    const fetchData = async () => {
        setIsRefreshing(true);
        try {
            const [fetchedLeads, fetchedDestinations] = await Promise.all([
                telecallerAPI.getAll(),
                telecallerAPI.getDestinations(),
            ]);
            setLeads(fetchedLeads);
            setDestinations(fetchedDestinations);
        } catch (error) {
            showToast.error('Failed to load telecaller data');
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredLeads = useMemo(() => {
        let result = leads;

        if (isAssignedView && user) {
            result = result.filter(lead => {
                const assignedId = typeof lead.assignedTo === 'object' && lead.assignedTo !== null
                    ? (lead.assignedTo as any)._id
                    : lead.assignedTo;
                return assignedId === user._id;
            });
        }

        return result.filter((lead) => {
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchesSearch =
                    lead.leadName.toLowerCase().includes(searchLower) ||
                    lead.phone.includes(searchLower) ||
                    lead.destination.toLowerCase().includes(searchLower);
                if (!matchesSearch) return false;
            }
            if (filters.statusFilter !== 'all' && lead.status !== filters.statusFilter) return false;
            if (filters.destinationFilter !== 'all' && lead.destination !== filters.destinationFilter) return false;

            if (filters.dateFilter !== 'all' && lead.nextFollowUp) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const followUpDate = new Date(lead.nextFollowUp);
                followUpDate.setHours(0, 0, 0, 0);

                if (filters.dateFilter === 'today') {
                    if (followUpDate.getTime() !== today.getTime()) return false;
                } else if (filters.dateFilter === 'week') {
                    const nextWeek = new Date(today);
                    nextWeek.setDate(today.getDate() + 7);
                    if (followUpDate < today || followUpDate > nextWeek) return false;
                } else if (filters.dateFilter === 'month') {
                    const nextMonth = new Date(today);
                    nextMonth.setDate(today.getDate() + 30);
                    if (followUpDate < today || followUpDate > nextMonth) return false;
                }
            } else if (filters.dateFilter !== 'all' && !lead.nextFollowUp) {
                return false;
            }

            return true;
        });
    }, [leads, filters, isAssignedView, user]);

    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return {
            total: leads.length,
            hot: leads.filter(l => l.status === 'Hot').length,
            followup: leads.filter(l => l.nextFollowUp?.startsWith(today)).length,
            notInterested: leads.filter(l => l.status === 'Not Interested').length,
        };
    }, [leads]);

    const handleSave = async (data: any) => {
        try {
            if (editingLead && editingLead._id) {
                const updated = await telecallerAPI.update(editingLead._id, data);
                setLeads(prev => prev.map(l => l._id === editingLead._id ? updated : l));
                showToast.success('Changes saved successfully');
            } else {
                const created = await telecallerAPI.create(data);
                setLeads(prev => [created, ...prev]);
                showToast.success('New lead added successfully');
            }
            setIsModalOpen(false);
            setEditingLead(null);
        } catch (error: any) {
            throw error; // Rethrow to let form handle loading state and inline error
        }
    };

    const handleDelete = (lead: TelecallerLeadRecord) => {
        setDeleteLead(lead);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteLead || !deleteLead._id) return;
        try {
            await telecallerAPI.delete(deleteLead._id);
            setLeads(prev => prev.filter(l => l._id !== deleteLead._id));
            showToast.success('Lead deleted');
            setDeleteLead(null);
        } catch (error) {
            showToast.error('Failed to delete lead');
        }
    };

    return (
        <div className="flex h-screen w-full flex-row overflow-hidden bg-background">
            <Sidebar project="telecaller" />
            <div className="flex-1 flex flex-col h-full relative overflow-y-auto">
                <main className="pb-8">
                    {/* Header Section */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="mx-auto max-w-7xl px-6 pt-6"
                    >
                        <div className="flex flex-col gap-1">
                            <h1 className="text-3xl font-bold tracking-tight">{isAssignedView ? 'Assigned to Me' : 'Telecaller Dashboard'}</h1>
                            <p className="text-muted-foreground italic text-sm">{isAssignedView ? 'Manage leads assigned to you.' : 'Manage and track all telecalling leads.'}</p>
                        </div>
                        <div className="flex gap-2">
                        </div>
                    </motion.div>

                    {/* Stats Cards - Only show in main dashboard */}
                    {!isAssignedView && (
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-6 py-6 sm:grid-cols-2 lg:grid-cols-4"
                        >
                            {STATS_CARDS.map((stat) => (
                                <motion.div
                                    key={stat.key}
                                    variants={cardVariants}
                                    className="rounded-lg border border-border bg-card p-6"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">
                                                {stat.label}
                                            </p>
                                            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                                                {(stats as any)[stat.key]}
                                            </p>
                                        </div>
                                        <div className="rounded-full bg-muted p-3">
                                            <stat.icon className="h-5 w-5 text-foreground" />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}

                    {/* Assigned View Info Banner */}
                    {isAssignedView && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mx-auto max-w-7xl px-6 py-4"
                        >
                            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-full bg-primary/10 p-2">
                                        <UserCheck className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground">Your Assigned Leads</p>
                                        <p className="text-sm text-muted-foreground">
                                            {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''} assigned to you
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Action Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="mx-auto max-w-7xl px-6 pb-4 flex justify-end gap-3"
                    >
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={fetchData}
                                    variant="outline"
                                    disabled={isRefreshing}
                                    className="gap-2 border-border"
                                >
                                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                    Refresh
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Refresh lead data</TooltipContent>
                        </Tooltip>
                        {canView('telecaller_logs') && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={() => setIsLogsModalOpen(true)}
                                        variant="outline"
                                        className="gap-2 border-border"
                                    >
                                        <FileText className="h-4 w-4" />
                                        Logs
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>View activity logs</TooltipContent>
                            </Tooltip>
                        )}
                        {canView('telecaller_trash') && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={() => setIsTrashModalOpen(true)}
                                        variant="outline"
                                        className="gap-2 border-border"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Trash
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>View deleted leads</TooltipContent>
                            </Tooltip>
                        )}
                        {!isAssignedView && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={() => { setEditingLead(null); setIsModalOpen(true); }}
                                        className="gap-2 bg-foreground text-background hover:bg-foreground/90"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add New Lead
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Create a new telecaller lead</TooltipContent>
                            </Tooltip>
                        )}
                    </motion.div>

                    {/* Filter Bar - Matching CRM Style */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="mx-auto max-w-7xl px-6 pb-4"
                    >
                        <div className="flex flex-wrap gap-4 items-center rounded-lg border border-border bg-card p-4">
                            <div className="flex-1 min-w-[240px] relative">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search by name, phone or destination..."
                                    className="w-full bg-background border border-border rounded-md pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    value={filters.search}
                                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                />
                            </div>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="gap-2 min-w-[140px] justify-between border-border">
                                        {filters.statusFilter === 'all' ? 'All Status' : filters.statusFilter}
                                        <ChevronDown className="h-4 w-4 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="min-w-[140px]">
                                    <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, statusFilter: 'all' }))}>
                                        All Status
                                    </DropdownMenuItem>
                                    {['Hot', 'Cold', 'Not Reachable', 'Not Interested', 'Follow-up'].map(s => (
                                        <DropdownMenuItem key={s} onClick={() => setFilters(prev => ({ ...prev, statusFilter: s }))}>
                                            {s}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="gap-2 min-w-[160px] justify-between border-border">
                                        {filters.destinationFilter === 'all' ? 'All Destinations' : filters.destinationFilter}
                                        <ChevronDown className="h-4 w-4 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="min-w-[160px]">
                                    <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, destinationFilter: 'all' }))}>
                                        All Destinations
                                    </DropdownMenuItem>
                                    {destinations.map(d => (
                                        <DropdownMenuItem key={d._id} onClick={() => setFilters(prev => ({ ...prev, destinationFilter: d.name }))}>
                                            {d.name}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="gap-2 min-w-[160px] justify-between border-border">
                                        {filters.dateFilter === 'all' ? 'All Follow-ups' :
                                            filters.dateFilter === 'today' ? 'Today' :
                                                filters.dateFilter === 'week' ? 'Next 7 Days' : 'Next 30 Days'}
                                        <ChevronDown className="h-4 w-4 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="min-w-[160px]">
                                    <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, dateFilter: 'all' }))}>
                                        All Follow-ups
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, dateFilter: 'today' }))}>
                                        Today
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, dateFilter: 'week' }))}>
                                        Next 7 Days
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, dateFilter: 'month' }))}>
                                        Next 30 Days
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </motion.div>

                    {/* Data Table */}
                    <TelecallerDataTable
                        records={filteredLeads}
                        onEdit={(l) => { setEditingLead(l); setIsModalOpen(true); }}
                        onDelete={(l) => { setDeleteLead(l); }}
                        onView={(l) => { setViewingLead(l); }}
                        onRefresh={fetchData}
                    />
                </main>
            </div>

            <TelecallerRecordModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                editingRecord={editingLead}
                destinations={destinations}
            />

            <TelecallerRecordDetailsModal
                isOpen={!!viewingLead}
                onClose={() => setViewingLead(null)}
                record={viewingLead}
            />

            <TelecallerDeleteConfirmDialog
                isOpen={!!deleteLead}
                record={deleteLead}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteLead(null)}
            />
            {
                isLogsModalOpen && (
                    <TelecallerLogsModal
                        isOpen={isLogsModalOpen}
                        onClose={() => setIsLogsModalOpen(false)}
                    />
                )
            }
            {
                isTrashModalOpen && (
                    <TelecallerTrashModal
                        isOpen={isTrashModalOpen}
                        onClose={() => setIsTrashModalOpen(false)}
                        onRestore={fetchData}
                    />
                )
            }
        </div >
    );
};

export default TelecallerPanel;
