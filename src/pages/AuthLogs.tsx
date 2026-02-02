import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSearch,
  Loader2,
  ArrowLeft,
  Filter,
  Monitor,
  Smartphone,
  Tablet,
  LogIn,
  LogOut,
  Calendar,
  User,
  Search,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { logsAPI } from '@/services/api';
import type { AuthLogRecord, LogUser } from '@/types/logs';
import { showToast } from '@/utils/notifications';
import { cn } from '@/lib/utils';
import { DatePicker } from '@/components/ui/date-picker';
import { formatISO } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function AuthLogs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<LogUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  // Filters
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedDevice, setSelectedDevice] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchUsers = async () => {
    try {
      const data = await logsAPI.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit,
      };

      if (selectedUser !== 'all') {
        params.userId = selectedUser;
      }

      if (selectedDevice !== 'all') {
        params.deviceType = selectedDevice;
      }

      if (selectedAction !== 'all') {
        params.action = selectedAction;
      }

      if (startDate) {
        params.startDate = new Date(startDate).toISOString();
      }

      if (endDate) {
        params.endDate = new Date(endDate).toISOString();
      }

      if (searchQuery) {
        params.search = searchQuery;
      }

      const data = await logsAPI.getAuthLogs(params);
      setLogs(data.logs);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      showToast.warning('Failed to load authentication logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [page, selectedUser, selectedDevice, selectedAction, startDate, endDate]);

  const handleSearch = () => {
    setPage(1);
    fetchLogs();
  };

  const formatDate = (dateString: string) => {
    // The timestamp from database has IST offset already added incorrectly
    // We need to subtract the offset first, then format as IST
    const date = new Date(dateString);

    // Subtract IST offset (5.5 hours) that was incorrectly added during storage
    const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
    const correctedDate = new Date(date.getTime() - istOffset);

    // Now format in IST timezone
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    return formatter.format(correctedDate) + ' IST';
  };

  const getDeviceBadge = (deviceType?: string) => {
    const type = deviceType || 'unknown';
    const variants: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      desktop: {
        label: 'Desktop',
        className: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        icon: <Monitor className="h-3 w-3" />,
      },
      mobile: {
        label: 'Mobile',
        className: 'bg-green-500/10 text-green-500 border-green-500/20',
        icon: <Smartphone className="h-3 w-3" />,
      },
      tablet: {
        label: 'Tablet',
        className: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
        icon: <Tablet className="h-3 w-3" />,
      },
      unknown: {
        label: 'Unknown',
        className: 'bg-muted text-muted-foreground',
        icon: <Monitor className="h-3 w-3" />,
      },
    };

    const variant = variants[type] || variants.unknown;
    return (
      <Badge variant="outline" className={cn('gap-1', variant.className)}>
        {variant.icon}
        {variant.label}
      </Badge>
    );
  };

  const getActionBadge = (action: string) => {
    if (action === 'user_login') {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1">
          <LogIn className="h-3 w-3" />
          Login
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20 gap-1">
        <LogOut className="h-3 w-3" />
        Logout
      </Badge>
    );
  };

  return (
    <>
      {/* Filters */}
      <div className="mb-6 space-y-4 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Filters</h3>
          </div>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPage(1);
                  fetchLogs();
                }}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                Refresh
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh logs</TooltipContent>
          </Tooltip>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* User Filter */}
          <div className="space-y-2">
            <Label htmlFor="user-filter" className="text-xs">User</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger id="user-filter">
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user._id} value={user._id}>
                    {user.name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Device Type Filter */}
          <div className="space-y-2">
            <Label htmlFor="device-filter" className="text-xs">Device Type</Label>
            <Select value={selectedDevice} onValueChange={setSelectedDevice}>
              <SelectTrigger id="device-filter">
                <SelectValue placeholder="All devices" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All devices</SelectItem>
                <SelectItem value="desktop">Desktop</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
                <SelectItem value="tablet">Tablet</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Filter */}
          <div className="space-y-2">
            <Label htmlFor="action-filter" className="text-xs">Action</Label>
            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger id="action-filter">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                <SelectItem value="user_login">Login</SelectItem>
                <SelectItem value="user_logout">Logout</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label htmlFor="start-date" className="text-xs">Start Date</Label>
            <DatePicker
              date={startDate ? new Date(startDate) : undefined}
              setDate={(date) => setStartDate(date ? formatISO(date, { representation: 'date' }) : '')}
              placeholder="Select start date"
              className="h-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* End Date */}
          <div className="space-y-2">
            <Label htmlFor="end-date" className="text-xs">End Date</Label>
            <DatePicker
              date={endDate ? new Date(endDate) : undefined}
              setDate={(date) => setEndDate(date ? formatISO(date, { representation: 'date' }) : '')}
              placeholder="Select end date"
              className="h-10"
            />
          </div>

          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search" className="text-xs">Search</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, email, IP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-8"
                />
              </div>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button onClick={handleSearch} size="sm">
                    Search
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Search logs</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <FileSearch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-foreground">No logs found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your filters or check back later.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold text-foreground">Date & Time</TableHead>
                  <TableHead className="font-semibold text-foreground">User</TableHead>
                  <TableHead className="font-semibold text-foreground">Action</TableHead>
                  <TableHead className="font-semibold text-foreground">Device</TableHead>
                  <TableHead className="font-semibold text-foreground">IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {logs.map((log, index) => (
                    <motion.tr
                      key={log._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-border transition-colors hover:bg-muted/30"
                    >
                      <TableCell className="text-sm text-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(log.timestamp)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-foreground">{log.userName}</div>
                            <div className="text-xs text-muted-foreground">{log.userEmail}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell>
                        {getDeviceBadge(log.deviceType || log.details?.deviceType)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {log.ipAddress || log.details?.ipAddress || '—'}
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} logs
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
