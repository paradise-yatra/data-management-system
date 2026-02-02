import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { usersAPI, rbacAPI, departmentsAPI } from '@/services/api';
import type { UserRecord, Department } from '@/services/api';
import type { Role } from '@/types/rbac';
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
import { showToast } from '@/utils/notifications';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    email: string;
    password?: string;
    name: string;
    roleId?: string | null;
    departmentId?: string | null;
  }) => Promise<void>;
  user: UserRecord | null;
  roles: Role[];
  departments: Department[];
}

function UserModal({ isOpen, onClose, onSave, user, roles, departments }: UserModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [roleId, setRoleId] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setName(user.name);
      setRoleId(user.roleId ?? '');
      const deptId = typeof user.departmentId === 'object' ? user.departmentId?._id : user.departmentId;
      setDepartmentId(deptId ?? '');
      setPassword('');
    } else {
      setEmail('');
      setPassword('');
      setName('');
      setRoleId(roles.length ? roles[0]._id : '');
      setDepartmentId('');
    }
    setError(null);
  }, [user, isOpen, roles]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
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
      await onSave({
        email,
        name,
        password: password || undefined,
        roleId: roleId || null,
        departmentId: departmentId || null,
      });
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
                <Label htmlFor="um-name">Name</Label>
                <Input
                  id="um-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="um-email">Email</Label>
                <Input
                  id="um-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="um-password">
                  Password {user && '(leave blank to keep current)'}
                </Label>
                <Input
                  id="um-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={user ? '••••••' : 'Enter password'}
                  className="border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="um-role">Role</Label>
                <Select value={roleId || undefined} onValueChange={setRoleId}>
                  <SelectTrigger className="border-border">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r._id} value={r._id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="um-department">Department</Label>
                <Select value={departmentId || 'none'} onValueChange={(v) => setDepartmentId(v === 'none' ? '' : v)}>
                  <SelectTrigger className="border-border">
                    <SelectValue placeholder="Select department (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {departments.filter(d => d.isActive).map((d) => (
                      <SelectItem key={d._id} value={d._id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onClose} className="border-border">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="gap-2 bg-foreground text-background hover:bg-foreground/90">
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

interface DeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
}

function DeleteDialog({ isOpen, onClose, onConfirm, userName }: DeleteDialogProps) {
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
            <h2 className="text-lg font-semibold text-foreground mb-2">Delete User</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to delete <strong>{userName}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose} className="border-border">
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

interface UserManagementPanelProps {
  embedded?: boolean;
}

export function UserManagementPanel({ embedded = false }: UserManagementPanelProps) {
  const navigate = useNavigate();
  const { user: currentUser, canManage } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
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
      showToast.warning('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const data = await rbacAPI.getRoles();
      setRoles(data);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const data = await departmentsAPI.getAll();
      setDepartments(data);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchDepartments();
  }, []);

  const handleSaveUser = async (data: {
    email: string;
    password?: string;
    name: string;
    roleId?: string | null;
    departmentId?: string | null;
  }) => {
    if (editingUser) {
      await usersAPI.update(editingUser._id, data);
      showToast.success('User updated successfully');
    } else {
      await usersAPI.create({
        email: data.email,
        name: data.name,
        password: data.password!,
        roleId: data.roleId ?? undefined,
        departmentId: data.departmentId ?? undefined,
      });
      showToast.success('User created successfully');
    }
    fetchUsers();
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    try {
      await usersAPI.delete(deleteUser._id);
      showToast.success('User deleted');
      fetchUsers();
    } catch (error) {
      showToast.warning(error instanceof Error ? error.message : 'Failed to delete user');
    } finally {
      setDeleteUser(null);
    }
  };

  const handleToggleActive = async (user: UserRecord) => {
    try {
      await usersAPI.update(user._id, { isActive: !user.isActive });
      showToast.success(user.isActive ? 'User deactivated' : 'User activated');
      fetchUsers();
    } catch (error) {
      showToast.warning(error instanceof Error ? error.message : 'Failed to update user');
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

  const canEdit = canManage('manage_users');

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-foreground/10 p-2">
                <UsersIcon className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">User Management</h1>
                <p className="text-sm text-muted-foreground">
                  {users.length} user{users.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
          {canEdit && (
            <Button
              onClick={() => {
                setEditingUser(null);
                setIsModalOpen(true);
              }}
              className="gap-2 bg-foreground text-background hover:bg-foreground/90"
            >
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          )}
        </div>
      )}

      {embedded && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {users.length} user{users.length !== 1 ? 's' : ''}
          </p>
          {canEdit && (
            <Button
              onClick={() => {
                setEditingUser(null);
                setIsModalOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          )}
        </div>
      )}

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
          {canEdit && (
            <Button
              onClick={() => {
                setEditingUser(null);
                setIsModalOpen(true);
              }}
              className="mt-4 gap-2"
            >
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold text-foreground">Name</TableHead>
                <TableHead className="font-semibold text-foreground">Email</TableHead>
                <TableHead className="font-semibold text-foreground">Role</TableHead>
                <TableHead className="font-semibold text-foreground">Department</TableHead>
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
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`gap-1 ${getRoleBadgeClass(user.role)}`}>
                        {getRoleIcon(user.role)}
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.departmentId ? (
                        <Badge variant="secondary" className="gap-1">
                          <Briefcase className="h-3 w-3" />
                          {typeof user.departmentId === 'object' ? user.departmentId.name : 'Unknown'}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
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
                        {user._id !== currentUser?._id && canEdit && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleActive(user)}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              >
                                {user.isActive ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{user.isActive ? 'Deactivate user' : 'Activate user'}</TooltipContent>
                          </Tooltip>
                        )}
                        {canEdit && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingUser(user);
                                  setIsModalOpen(true);
                                }}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit user</TooltipContent>
                          </Tooltip>
                        )}
                        {user._id !== currentUser?._id && canEdit && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteUser(user)}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete user</TooltipContent>
                          </Tooltip>
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

      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveUser}
        user={editingUser}
        roles={roles}
        departments={departments}
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
