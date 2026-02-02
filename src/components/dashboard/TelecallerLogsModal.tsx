import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { telecallerAPI, usersAPI } from '@/services/api';
import { TelecallerLog } from '@/types/telecaller';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { Loader2, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface TelecallerLogsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function TelecallerLogsModal({ isOpen, onClose }: TelecallerLogsModalProps) {
    const [logs, setLogs] = useState<TelecallerLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<{ _id: string, name: string }[]>([]);

    // Filters
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        userId: 'all',
        action: 'all',
        page: 1,
        limit: 10
    });

    const [pagination, setPagination] = useState({
        total: 0,
        pages: 1
    });

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
            fetchLogs();
        }
    }, [isOpen, filters.page, filters.limit]); // Re-fetch on page/limit change only

    // Need a separate effect or handler for applying filters to avoid duplicate fetching
    // For simplicity, we can add a "Apply Filters" button or debounce changes
    // But direct fetching on filter change is also fine if traffic is low.
    // Let's stick to fetch on effect dependency change for page, and manual fetch for filters?
    // Or just fetch on all changes.

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                fetchLogs();
            }, 500); // 500ms debounce for text inputs if any (none here, but good practice)
            return () => clearTimeout(timer);
        }
    }, [filters.startDate, filters.endDate, filters.userId, filters.action]);


    const fetchUsers = async () => {
        try {
            // We might need a specific endpoint for telecaller users, or just all users
            // Assuming usersAPI exists or we can reuse telecallerAPI if needed
            // For now, let's assume we can get a list of users. 
            // If usersAPI isn't available in import, check api.ts
            // checking api.ts... it has usersAPI
            const response = await usersAPI.getAll();
            setUsers(response.map((u: any) => ({ _id: u._id, name: u.name })));
        } catch (error) {
            console.error('Failed to fetch users', error);
        }
    };

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const response = await telecallerAPI.getLogs({
                startDate: filters.startDate || undefined,
                endDate: filters.endDate || undefined,
                userId: filters.userId === 'all' ? undefined : filters.userId,
                action: filters.action === 'all' ? undefined : filters.action,
                page: filters.page,
                limit: filters.limit
            });
            setLogs(response.data);
            setPagination(response.pagination);
        } catch (error) {
            console.error('Failed to fetch logs', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDetails = (details: any) => {
        if (!details) return '-';
        return (
            <div className="max-w-[300px] overflow-hidden text-xs">
                <pre className="whitespace-pre-wrap font-mono truncate hover:whitespace-pre-wrap hover:overflow-auto max-h-[100px]">
                    {JSON.stringify(details, null, 2)}
                </pre>
            </div>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 gap-0">
                <div className="p-6 border-b border-border flex items-center justify-between">
                    <DialogTitle>Telecaller Activity Logs</DialogTitle>
                </div>

                <div className="p-4 border-b border-border bg-muted/20 space-y-4">
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="space-y-1">
                            <Label className="text-xs">Start Date</Label>
                            <Input
                                type="date"
                                className="h-8 w-[150px]"
                                value={filters.startDate}
                                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value, page: 1 }))}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">End Date</Label>
                            <Input
                                type="date"
                                className="h-8 w-[150px]"
                                value={filters.endDate}
                                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value, page: 1 }))}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">User</Label>
                            <Select
                                value={filters.userId}
                                onValueChange={(val) => setFilters(prev => ({ ...prev, userId: val, page: 1 }))}
                            >
                                <SelectTrigger className="h-8 w-[180px]">
                                    <SelectValue placeholder="All Users" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Users</SelectItem>
                                    {users.map(u => (
                                        <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Action</Label>
                            <Select
                                value={filters.action}
                                onValueChange={(val) => setFilters(prev => ({ ...prev, action: val, page: 1 }))}
                            >
                                <SelectTrigger className="h-8 w-[150px]">
                                    <SelectValue placeholder="All Actions" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Actions</SelectItem>
                                    <SelectItem value="CREATE">Create</SelectItem>
                                    <SelectItem value="UPDATE">Update</SelectItem>
                                    <SelectItem value="DELETE">Delete</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            className="ml-auto"
                            onClick={() => setFilters({ startDate: '', endDate: '', userId: 'all', action: 'all', page: 1, limit: 10 })}
                        >
                            Reset
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[180px]">Timestamp</TableHead>
                                <TableHead className="w-[150px]">User</TableHead>
                                <TableHead className="w-[100px]">Action</TableHead>
                                <TableHead className="w-[150px]">Lead</TableHead>
                                <TableHead>Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Loading logs...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        No logs found matching your filters.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log) => (
                                    <TableRow key={log._id} className="hover:bg-muted/50">
                                        <TableCell className="font-mono text-xs">
                                            {format(new Date(log.timestamp), 'dd MMM yyyy, HH:mm:ss')}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">{log.performedBy.name}</span>
                                                <span className="text-xs text-muted-foreground capitalize">{log.performedBy.role}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                log.action === 'CREATE' ? 'default' :
                                                    log.action === 'UPDATE' ? 'secondary' : 'destructive'
                                            }>
                                                {log.action}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">{log.entityName || 'Unknown'}</span>
                                                <span className="text-xs text-muted-foreground font-mono">{log.entityId}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {formatDetails(log.details)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="p-4 border-t border-border flex items-center justify-between bg-background">
                    <div className="text-sm text-muted-foreground">
                        Showing {((filters.page - 1) * filters.limit) + 1} to {Math.min(filters.page * filters.limit, pagination.total)} of {pagination.total} entries
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={filters.page <= 1 || loading}
                            onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={filters.page >= pagination.pages || loading}
                            onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function Badge({ children, variant }: { children: React.ReactNode, variant: 'default' | 'secondary' | 'destructive' }) {
    const variants = {
        default: 'bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20',
        secondary: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20',
        destructive: 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20'
    };

    return (
        <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant]}`}>
            {children}
        </span>
    );
}
