import { useState, useEffect } from 'react';
import {
    Search,
    ChevronRight,
    Mail,
    Phone,
    MapPin,
    Calendar,
    DollarSign,
    MessageSquare,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    MoreVertical,
    Eye,
    Trash2,
    FileText,
    Inbox,
    RefreshCw,
    Filter,
    Loader2,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/animate-ui/components/radix/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { headerFormSubmissionsAPI, HeaderFormSubmissionRecord } from '@/services/api';
import { showToast } from '@/utils/notifications';
import { useAuth } from '@/contexts/AuthContext';

const statusConfig = {
    new: { label: 'New', color: 'text-blue-600', bg: 'bg-blue-500/10' },
    contacted: { label: 'Contacted', color: 'text-yellow-600', bg: 'bg-yellow-500/10' },
    converted: { label: 'Converted', color: 'text-green-600', bg: 'bg-green-500/10' },
    closed: { label: 'Closed', color: 'text-red-600', bg: 'bg-red-500/10' },
};

const HeaderFormSubmissions = () => {
    const { canDelete, canEdit } = useAuth();
    const [submissions, setSubmissions] = useState<HeaderFormSubmissionRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [stats, setStats] = useState({ total: 0, new: 0, contacted: 0, converted: 0, closed: 0 });
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState<HeaderFormSubmissionRecord | null>(null);
    const [editNotes, setEditNotes] = useState('');

    useEffect(() => {
        fetchSubmissions();
        fetchStats();
    }, [statusFilter]);

    const fetchSubmissions = async () => {
        try {
            setLoading(true);
            const params: any = {};
            if (statusFilter !== 'all') params.status = statusFilter;
            const result = await headerFormSubmissionsAPI.getAll(params);
            setSubmissions(result.data);
        } catch (error) {
            showToast.error('Failed to fetch submissions');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const result = await headerFormSubmissionsAPI.getStats();
            setStats(result);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const handleStatusChange = async (id: string, status: string) => {
        try {
            await headerFormSubmissionsAPI.update(id, { status });
            showToast.success(`Status updated to ${status}`);
            fetchSubmissions();
            fetchStats();
        } catch (error) {
            showToast.error('Failed to update status');
        }
    };

    const handleDelete = (id: string) => {
        setDeleteId(id);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await headerFormSubmissionsAPI.delete(deleteId);
            showToast.success('Submission deleted');
            fetchSubmissions();
            fetchStats();
        } catch (error) {
            showToast.error('Failed to delete submission');
        } finally {
            setDeleteDialogOpen(false);
            setDeleteId(null);
        }
    };

    const handleView = (submission: HeaderFormSubmissionRecord) => {
        setSelectedSubmission(submission);
        setEditNotes(submission.notes || '');
        setViewDialogOpen(true);
    };

    const handleSaveNotes = async () => {
        if (!selectedSubmission) return;
        try {
            await headerFormSubmissionsAPI.update(selectedSubmission._id, { notes: editNotes });
            showToast.success('Notes saved');
            fetchSubmissions();
            setSelectedSubmission(prev => prev ? { ...prev, notes: editNotes } : null);
        } catch (error) {
            showToast.error('Failed to save notes');
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            });
        } catch {
            return 'N/A';
        }
    };

    const formatDateTime = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return 'N/A';
        }
    };

    const timeAgo = (dateStr: string) => {
        try {
            const now = new Date();
            const date = new Date(dateStr);
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            return formatDate(dateStr);
        } catch {
            return 'N/A';
        }
    };

    const filteredSubmissions = submissions.filter(sub =>
        (sub.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (sub.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (sub.destination?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (sub.phone?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    const statCards = [
        { label: 'Total', value: stats.total, color: 'text-foreground', bg: 'bg-primary/5', border: 'border-primary/20' },
        { label: 'New', value: stats.new, color: 'text-blue-600', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
        { label: 'Contacted', value: stats.contacted, color: 'text-yellow-600', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
        { label: 'Converted', value: stats.converted, color: 'text-green-600', bg: 'bg-green-500/10', border: 'border-green-500/20' },
        { label: 'Closed', value: stats.closed, color: 'text-red-600', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    ];

    return (
        <div className="flex h-screen w-full flex-row overflow-hidden bg-background text-foreground font-sans antialiased">
            <Sidebar project="voya-trail" />

            <main className="flex-1 flex flex-col h-full relative overflow-y-auto bg-background/50">
                <div className="p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Voya Trail</span>
                        <ChevronRight className="h-4 w-4" />
                        <span className="text-foreground font-medium">Form Submissions</span>
                    </div>

                    {/* Title Section */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-3xl font-black tracking-tight">Booking Inquiries</h1>
                            <p className="text-muted-foreground">Manage form submissions from the Voya Trail website.</p>
                        </div>
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    onClick={() => { fetchSubmissions(); fetchStats(); }}
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Refresh
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs px-2 py-1">
                                <p>Refresh submissions</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                        {statCards.map((stat) => (
                            <button
                                key={stat.label}
                                onClick={() => setStatusFilter(stat.label === 'Total' ? 'all' : stat.label.toLowerCase())}
                                className={`p-5 rounded-lg border transition-all text-left cursor-pointer group flex flex-col justify-between h-[100px] ${(stat.label === 'Total' && statusFilter === 'all') || stat.label.toLowerCase() === statusFilter
                                        ? `ring-1 ring-primary/20 bg-card shadow-md ${stat.border}`
                                        : 'border-border bg-card hover:border-primary/30 hover:shadow-md'
                                    }`}
                            >
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-primary/80 transition-colors">{stat.label}</p>
                                <p className={`text-3xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
                            </button>
                        ))}
                    </div>

                    {/* Search & Filter */}
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative w-full md:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                className="pl-10 bg-card border-border"
                                placeholder="Search by name, email, destination, or phone..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Content List */}
                    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                    <TableHead className="w-[200px] uppercase text-[10px] font-bold tracking-wider">Name</TableHead>
                                    <TableHead className="uppercase text-[10px] font-bold tracking-wider">Status</TableHead>
                                    <TableHead className="uppercase text-[10px] font-bold tracking-wider">Date</TableHead>
                                    <TableHead className="uppercase text-[10px] font-bold tracking-wider">Destination</TableHead>
                                    <TableHead className="uppercase text-[10px] font-bold tracking-wider">Budget</TableHead>
                                    <TableHead className="text-right uppercase text-[10px] font-bold tracking-wider">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            <div className="flex justify-center">
                                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredSubmissions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                            No submissions found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredSubmissions.map((submission) => {
                                        const config = statusConfig[submission.status] || statusConfig.new;
                                        return (
                                            <TableRow key={submission._id} className="group hover:bg-muted/30 transition-colors">
                                                {/* Name & Email */}
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                                                            {submission.name?.charAt(0)?.toUpperCase() || '?'}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-sm truncate max-w-[150px]">{submission.name}</span>
                                                            <span className="text-xs text-muted-foreground truncate max-w-[150px]">{submission.email}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* Status */}
                                                <TableCell>
                                                    <Badge variant="secondary" className={`text-[10px] uppercase tracking-wider font-bold ${config.color} ${config.bg}`}>
                                                        {config.label}
                                                    </Badge>
                                                </TableCell>

                                                {/* Date */}
                                                <TableCell>
                                                    <div className="flex flex-col text-xs">
                                                        <span className="font-medium">{formatDate(submission.createdAt)}</span>
                                                        <span className="text-muted-foreground text-[10px]">{timeAgo(submission.createdAt)}</span>
                                                    </div>
                                                </TableCell>

                                                {/* Destination */}
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5 text-sm text-foreground/80">
                                                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                                        {submission.destination}
                                                    </div>
                                                </TableCell>

                                                {/* Budget */}
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5 text-sm text-foreground/80">
                                                        <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                                                        {submission.budget}
                                                    </div>
                                                </TableCell>

                                                {/* Actions */}
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleView(submission)}>
                                                                <Eye className="h-3.5 w-3.5 mr-2" />
                                                                View Details
                                                            </DropdownMenuItem>
                                                            {canEdit('voya_trail') && (
                                                                <>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem onClick={() => handleStatusChange(submission._id, 'new')} disabled={submission.status === 'new'}>
                                                                        <AlertCircle className="h-3.5 w-3.5 mr-2" /> Mark as New
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleStatusChange(submission._id, 'contacted')} disabled={submission.status === 'contacted'}>
                                                                        <Phone className="h-3.5 w-3.5 mr-2" /> Mark as Contacted
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleStatusChange(submission._id, 'converted')} disabled={submission.status === 'converted'}>
                                                                        <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-green-600" /> Mark as Converted
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleStatusChange(submission._id, 'closed')} disabled={submission.status === 'closed'}>
                                                                        <XCircle className="h-3.5 w-3.5 mr-2 text-red-600" /> Mark as Closed
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                            {canDelete('voya_trail') && (
                                                                <>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(submission._id)}>
                                                                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </main>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Submission?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the booking inquiry.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* View Details Dialog */}
            <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black">Submission Details</DialogTitle>
                    </DialogHeader>
                    {selectedSubmission && (
                        <div className="space-y-6 mt-2">
                            {/* Contact Info */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="size-14 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                                        {selectedSubmission.name?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-foreground">{selectedSubmission.name}</h3>
                                        <p className="text-sm text-muted-foreground">{selectedSubmission.email}</p>
                                    </div>
                                    <Badge variant="secondary" className={`ml-auto text-xs uppercase tracking-wider font-bold ${statusConfig[selectedSubmission.status]?.color || ''} ${statusConfig[selectedSubmission.status]?.bg || ''}`}>
                                        {statusConfig[selectedSubmission.status]?.label || selectedSubmission.status}
                                    </Badge>
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-4 bg-muted/30 rounded-lg p-5 border border-border/50">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Phone</p>
                                    <p className="text-sm font-medium">{selectedSubmission.phone || 'Not provided'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Destination</p>
                                    <p className="text-sm font-medium">{selectedSubmission.destination}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Budget</p>
                                    <p className="text-sm font-medium">{selectedSubmission.budget}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Travel Date</p>
                                    <p className="text-sm font-medium">{formatDate(selectedSubmission.travelDate)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Submitted</p>
                                    <p className="text-sm font-medium">{formatDateTime(selectedSubmission.createdAt)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Newsletter</p>
                                    <p className="text-sm font-medium">{selectedSubmission.newsletter ? 'Subscribed' : 'No'}</p>
                                </div>
                            </div>

                            {/* Message */}
                            {selectedSubmission.message && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Message</p>
                                    <p className="text-sm bg-muted/30 p-4 rounded-lg text-foreground border border-border/50 leading-relaxed">{selectedSubmission.message}</p>
                                </div>
                            )}

                            {/* Notes */}
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Internal Notes</p>
                                <textarea
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    placeholder="Add internal notes about this inquiry..."
                                    className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-0 outline-none transition-all text-sm min-h-[100px] resize-none"
                                />
                                <div className="flex justify-end">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleSaveNotes}
                                        className="gap-2"
                                    >
                                        <FileText className="h-3.5 w-3.5" />
                                        Save Notes
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default HeaderFormSubmissions;
