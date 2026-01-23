import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Plus,
  Pencil,
  Trash2,
  Users as UsersIcon,
  Shield,
  User,
  Briefcase,
  ArrowLeft,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usersAPI, UserRecord } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { createPortal } from 'react-dom';

// User Modal for Create/Edit
interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { email: string; password?: string; name: string; role: string }) => Promise<void>;
  user: UserRecord | null;
}

function UserModal({ isOpen, onClose, onSave, user }: UserModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('user');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setName(user.name);
      setRole(user.role);
      setPassword('');
    } else {
      setEmail('');
      setPassword('');
      setName('');
      setRole('user');
    }
    setError(null);
  }, [user, isOpen]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !name) {
      setError('Email and name are required');
      return;
    }

    if (!user && !password) {
      setError('Password is required for new users');
      return;
    }

    if (password && password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      const data: { email: string; password?: string; name: string; role: string } = {
        email,
        name,
        role,
      };
      if (password) {
        data.password = password;
      }
      await onSave(data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            className="relative z-[101] w-full max-w-md mx-4 rounded-lg border border-border bg-background p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {user ? 'Edit User' : 'Create New User'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  Password {user && '(leave blank to keep current)'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={user ? '••••••' : 'Enter password'}
                  className="border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="border-border">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="border-border"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="gap-2 bg-foreground text-background hover:bg-foreground/90"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {user ? 'Save Changes' : 'Create User'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// Delete Confirmation Dialog
interface DeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
}

function DeleteDialog({ isOpen, onClose, onConfirm, userName }: DeleteDialogProps) {
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
            className="relative z-[101] w-full max-w-sm mx-4 rounded-lg border border-border bg-background p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Delete User
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to delete <strong>{userName}</strong>? This
              action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-border"
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={onConfirm}>
                Delete
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default function Users() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserRecord | null>(null);

  const fetchUsers = async () => {
    try {
      const data = await usersAPI.getAll();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast('Failed to load users', {
        style: {
          background: 'hsl(45, 93%, 47%)',
          color: 'white',
          border: 'none',
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleEditUser = (user: UserRecord) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleSaveUser = async (data: { email: string; password?: string; name: string; role: string }) => {
    if (editingUser) {
      await usersAPI.update(editingUser._id, data);
      toast('User updated successfully', {
        style: {
          background: 'hsl(45, 93%, 47%)',
          color: 'white',
          border: 'none',
        },
      });
    } else {
      await usersAPI.create({ ...data, password: data.password! });
      toast.success('User created successfully', {
        style: {
          background: 'hsl(142, 76%, 36%)',
          color: 'white',
          border: 'none',
        },
      });
    }
    fetchUsers();
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;

    try {
      await usersAPI.delete(deleteUser._id);
      toast.error('User deleted', {
        style: {
          background: 'hsl(0, 84%, 60%)',
          color: 'white',
          border: 'none',
        },
      });
      fetchUsers();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to delete user', {
        style: {
          background: 'hsl(45, 93%, 47%)',
          color: 'white',
          border: 'none',
        },
      });
    } finally {
      setDeleteUser(null);
    }
  };

  const handleToggleActive = async (user: UserRecord) => {
    try {
      await usersAPI.update(user._id, { isActive: !user.isActive });
      toast(user.isActive ? 'User deactivated' : 'User activated', {
        style: {
          background: 'hsl(45, 93%, 47%)',
          color: 'white',
          border: 'none',
        },
      });
      fetchUsers();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to update user', {
        style: {
          background: 'hsl(45, 93%, 47%)',
          color: 'white',
          border: 'none',
        },
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'manager':
        return <Briefcase className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'manager':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-background"
      >
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-foreground/10 p-2">
                <UsersIcon className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  User Management
                </h1>
                <p className="text-sm text-muted-foreground">
                  {users.length} user{users.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={handleCreateUser}
            className="gap-2 bg-foreground text-background hover:bg-foreground/90"
          >
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
            <UsersIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground">No users found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first user to get started.
            </p>
            <Button
              onClick={handleCreateUser}
              className="mt-4 gap-2 bg-foreground text-background hover:bg-foreground/90"
            >
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold text-foreground">Name</TableHead>
                  <TableHead className="font-semibold text-foreground">Email</TableHead>
                  <TableHead className="font-semibold text-foreground">Role</TableHead>
                  <TableHead className="font-semibold text-foreground">Status</TableHead>
                  <TableHead className="font-semibold text-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {users.map((user, index) => (
                    <motion.tr
                      key={user._id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ delay: index * 0.03 }}
                      className="border-border transition-colors hover:bg-muted/30"
                    >
                      <TableCell className="font-medium text-foreground">
                        {user.name}
                        {user._id === currentUser?._id && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            You
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`gap-1 ${getRoleBadgeClass(user.role)}`}
                        >
                          {getRoleIcon(user.role)}
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            user.isActive
                              ? 'bg-green-500/10 text-green-500 border-green-500/20'
                              : 'bg-muted text-muted-foreground'
                          }
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {user._id !== currentUser?._id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleActive(user)}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title={user.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {user.isActive ? (
                                <X className="h-4 w-4" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditUser(user)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {user._id !== currentUser?._id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteUser(user)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      {/* Modals */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveUser}
        user={editingUser}
      />

      <DeleteDialog
        isOpen={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={handleDeleteUser}
        userName={deleteUser?.name || ''}
      />
    </div>
  );
}

