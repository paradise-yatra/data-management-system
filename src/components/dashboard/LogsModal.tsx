import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, ChevronLeft, ChevronRight, Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { logsAPI, LogRecord, LogAction, LogUser } from '@/services/api';
import { formatDateTimeIST } from '@/utils/dateUtils';

interface LogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Action category colors
const getActionBadgeClass = (action: string): string => {
  // Add actions - Green
  if (['add_identity', 'add_source', 'restore_identity'].includes(action)) {
    return 'bg-green-500/10 text-green-500 border-green-500/20';
  }
  // Delete actions - Red
  if (['delete_identity', 'delete_from_trash', 'empty_trash', 'delete_source', 'delete_user'].includes(action)) {
    return 'bg-red-500/10 text-red-500 border-red-500/20';
  }
  // Edit actions - Yellow
  if (['edit_identity'].includes(action)) {
    return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
  }
  // User management - Blue
  if (['create_user', 'activate_user', 'deactivate_user', 'change_user_password'].includes(action)) {
    return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
  }
  return 'bg-muted text-muted-foreground border-border';
};

// Action labels
const getActionLabel = (action: string): string => {
  const labels: Record<string, string> = {
    add_identity: 'Added Identity',
    delete_identity: 'Deleted Identity',
    restore_identity: 'Restored Identity',
    delete_from_trash: 'Deleted from Trash',
    empty_trash: 'Emptied Trash',
    edit_identity: 'Edited Identity',
    add_source: 'Added Source',
    delete_source: 'Deleted Source',
    create_user: 'Created User',
    activate_user: 'Activated User',
    deactivate_user: 'Deactivated User',
    change_user_password: 'Changed Password',
    delete_user: 'Deleted User',
  };
  return labels[action] || action;
};

export function LogsModal({ isOpen, onClose }: LogsModalProps) {
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Filters
  const [actions, setActions] = useState<LogAction[]>([]);
  const [users, setUsers] = useState<LogUser[]>([]);
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch filter options
  useEffect(() => {
    if (isOpen) {
      Promise.all([logsAPI.getActions(), logsAPI.getUsers()])
        .then(([actionsData, usersData]) => {
          setActions(actionsData);
          setUsers(usersData);
        })
        .catch((err) => console.error('Failed to fetch filter options:', err));
    }
  }, [isOpen]);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    if (!isOpen) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await logsAPI.getAll({
        page,
        limit,
        action: selectedAction || undefined,
        userId: selectedUser || undefined,
        search: debouncedSearch || undefined,
      });
      
      setLogs(response.logs);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  }, [isOpen, page, limit, selectedAction, selectedUser, debouncedSearch]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedAction, selectedUser, debouncedSearch]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-[101] w-full max-w-6xl mx-4 rounded-lg border border-border bg-background p-6 shadow-xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Activity Logs
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {total} log entr{total !== 1 ? 'ies' : 'y'}
                  </p>
                </div>
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

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select
                value={selectedAction || 'all'}
                onValueChange={(value) => setSelectedAction(value === 'all' ? '' : value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actions.map((action) => (
                    <SelectItem key={action.value} value={action.value}>
                      {action.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedUser || 'all'}
                onValueChange={(value) => setSelectedUser(value === 'all' ? '' : value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user._id} value={user._id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={fetchLogs}
                disabled={loading}
                className="border-border"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading && logs.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-destructive mb-4">{error}</p>
                  <Button onClick={fetchLogs} variant="outline">
                    Try Again
                  </Button>
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium text-foreground mb-2">
                    No logs found
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {debouncedSearch || selectedAction || selectedUser
                      ? 'Try adjusting your filters'
                      : 'Activity logs will appear here'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <motion.div
                      key={log._id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-lg border border-border bg-card p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getActionBadgeClass(log.action)}`}
                            >
                              {getActionLabel(log.action)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              by <span className="font-medium text-foreground">{log.userName}</span>
                              <span className="mx-1">·</span>
                              {log.userEmail}
                            </span>
                          </div>
                          <p className="text-sm text-foreground">
                            {log.formattedDetails}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDateTimeIST(log.timestamp)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                    className="border-border"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || loading}
                    className="border-border"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Footer */}
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

