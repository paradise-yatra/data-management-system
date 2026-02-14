import { useState, useEffect } from 'react';
import {
    Search,
    ChevronRight,
    Mail,
    Calendar,
    CheckCircle2,
    XCircle,
    MoreVertical,
    Trash2,
    RefreshCw,
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
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { newsletterAPI, NewsletterSubmissionRecord } from '@/services/api';
import { showToast } from '@/utils/notifications';
import { useAuth } from '@/contexts/AuthContext';

const statusConfig = {
    active: { label: 'Active', color: 'text-green-600', bg: 'bg-green-500/10' },
    unsubscribed: { label: 'Unsubscribed', color: 'text-red-600', bg: 'bg-red-500/10' },
};

const NewsletterSubmissions = () => {
    const { canDelete } = useAuth();
    const [submissions, setSubmissions] = useState<NewsletterSubmissionRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [stats, setStats] = useState({ total: 0, active: 0, unsubscribed: 0 });
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => {
        fetchSubmissions();
        fetchStats();
    }, [statusFilter]);

    const fetchSubmissions = async () => {
        try {
            setLoading(true);
            const params: any = {};
            if (statusFilter !== 'all') params.status = statusFilter;
            const result = await newsletterAPI.getAll(params);
            setSubmissions(result.data);
        } catch (error) {
            showToast.error('Failed to fetch newsletter submissions');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const result = await newsletterAPI.getStats();
            setStats(result);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const handleDelete = (id: string) => {
        setDeleteId(id);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await newsletterAPI.delete(deleteId);
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
        (sub.email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    const statCards = [
        { label: 'Total', value: stats.total, color: 'text-foreground', bg: 'bg-primary/5', border: 'border-primary/20' },
        { label: 'Active', value: stats.active, color: 'text-green-600', bg: 'bg-green-500/10', border: 'border-green-500/20' },
        { label: 'Unsubscribed', value: stats.unsubscribed, color: 'text-red-600', bg: 'bg-red-500/10', border: 'border-red-500/20' },
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
                        <span className="text-foreground font-medium">Newsletter</span>
                    </div>

                    {/* Title Section */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-3xl font-black tracking-tight">Newsletter Subscribers</h1>
                            <p className="text-muted-foreground">Manage email subscriptions from Voya Trail.</p>
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
                                <p>Refresh list</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
                                placeholder="Search by email..."
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
                                    <TableHead className="w-[300px] uppercase text-[10px] font-bold tracking-wider">Email</TableHead>
                                    <TableHead className="uppercase text-[10px] font-bold tracking-wider">Status</TableHead>
                                    <TableHead className="uppercase text-[10px] font-bold tracking-wider">Source</TableHead>
                                    <TableHead className="uppercase text-[10px] font-bold tracking-wider">Date</TableHead>
                                    <TableHead className="text-right uppercase text-[10px] font-bold tracking-wider">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            <div className="flex justify-center">
                                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredSubmissions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                            No subscribers found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredSubmissions.map((submission) => {
                                        const config = statusConfig[submission.status] || statusConfig.active;
                                        return (
                                            <TableRow key={submission._id} className="group hover:bg-muted/30 transition-colors">
                                                {/* Email */}
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                                                            <Mail className="h-4 w-4" />
                                                        </div>
                                                        <span className="font-semibold text-sm">{submission.email}</span>
                                                    </div>
                                                </TableCell>

                                                {/* Status */}
                                                <TableCell>
                                                    <Badge variant="secondary" className={`text-[10px] uppercase tracking-wider font-bold ${config.color} ${config.bg}`}>
                                                        {config.label}
                                                    </Badge>
                                                </TableCell>

                                                {/* Source */}
                                                <TableCell>
                                                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground border-border">
                                                        {submission.source}
                                                    </Badge>
                                                </TableCell>

                                                {/* Date */}
                                                <TableCell>
                                                    <div className="flex flex-col text-xs">
                                                        <span className="font-medium">{formatDate(submission.createdAt)}</span>
                                                        <span className="text-muted-foreground text-[10px]">{timeAgo(submission.createdAt)}</span>
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
                                                            {canDelete('voya_trail') && (
                                                                <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(submission._id)}>
                                                                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                                                </DropdownMenuItem>
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
                        <AlertDialogTitle>Delete Subscriber?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the subscriber record.
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
        </div>
    );
};

export default NewsletterSubmissions;
