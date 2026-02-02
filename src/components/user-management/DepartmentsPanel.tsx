import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2,
    Plus,
    Pencil,
    Trash2,
    Loader2,
    Users,
    UserPlus,
    UserMinus,
    Crown,
    Search,
} from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { departmentsAPI, usersAPI, Department, UserRecord } from '@/services/api';
import { showToast } from '@/utils/notifications';

export function DepartmentsPanel() {
    const { canManage } = useAuth();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [allUsers, setAllUsers] = useState<UserRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal states
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editingDept, setEditingDept] = useState<Department | null>(null);
    const [deleteDept, setDeleteDept] = useState<Department | null>(null);
    const [viewingDept, setViewingDept] = useState<(Department & { members: UserRecord[] }) | null>(null);
    const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);

    // Form states
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formHead, setFormHead] = useState<string | null>(null);
    const [formIsActive, setFormIsActive] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string>('');

    const fetchDepartments = async () => {
        try {
            const data = await departmentsAPI.getAll();
            setDepartments(data);
        } catch (e) {
            console.error(e);
            showToast.warning('Failed to load departments');
        }
    };

    const fetchUsers = async () => {
        try {
            const data = await usersAPI.getAll();
            setAllUsers(data);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                await Promise.all([fetchDepartments(), fetchUsers()]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const openCreateModal = () => {
        setFormName('');
        setFormDescription('');
        setFormHead(null);
        setFormIsActive(true);
        setCreateModalOpen(true);
    };

    const openEditModal = (dept: Department) => {
        setEditingDept(dept);
        setFormName(dept.name);
        setFormDescription(dept.description || '');
        setFormHead(dept.head?._id || null);
        setFormIsActive(dept.isActive);
    };

    const handleCreate = async () => {
        if (!formName.trim()) {
            showToast.warning('Department name is required');
            return;
        }
        setSaving(true);
        try {
            await departmentsAPI.create({
                name: formName.trim(),
                description: formDescription.trim(),
                head: formHead,
                isActive: formIsActive,
            });
            showToast.success('Department created');
            setCreateModalOpen(false);
            fetchDepartments();
        } catch (e) {
            showToast.warning(e instanceof Error ? e.message : 'Failed to create department');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async () => {
        if (!editingDept) return;
        if (!formName.trim()) {
            showToast.warning('Department name is required');
            return;
        }
        setSaving(true);
        try {
            await departmentsAPI.update(editingDept._id, {
                name: formName.trim(),
                description: formDescription.trim(),
                head: formHead,
                isActive: formIsActive,
            });
            showToast.success('Department updated');
            setEditingDept(null);
            fetchDepartments();
        } catch (e) {
            showToast.warning(e instanceof Error ? e.message : 'Failed to update department');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteDept) return;
        try {
            await departmentsAPI.delete(deleteDept._id);
            showToast.success('Department deleted');
            setDeleteDept(null);
            fetchDepartments();
        } catch (e) {
            showToast.warning(e instanceof Error ? e.message : 'Failed to delete department');
        }
    };

    const openViewModal = async (dept: Department) => {
        try {
            const data = await departmentsAPI.getById(dept._id);
            setViewingDept(data);
        } catch (e) {
            showToast.warning('Failed to load department details');
        }
    };

    const handleAddMember = async () => {
        if (!viewingDept || !selectedUserId) return;
        try {
            await departmentsAPI.addMember(viewingDept._id, selectedUserId);
            showToast.success('User added to department');
            setAddMemberModalOpen(false);
            setSelectedUserId('');
            // Refresh viewing dept
            const updated = await departmentsAPI.getById(viewingDept._id);
            setViewingDept(updated);
            fetchDepartments();
            fetchUsers();
        } catch (e) {
            showToast.warning(e instanceof Error ? e.message : 'Failed to add user');
        }
    };

    const handleRemoveMember = async (userId: string) => {
        if (!viewingDept) return;
        try {
            await departmentsAPI.removeMember(viewingDept._id, userId);
            showToast.success('User removed from department');
            // Refresh viewing dept
            const updated = await departmentsAPI.getById(viewingDept._id);
            setViewingDept(updated);
            fetchDepartments();
            fetchUsers();
        } catch (e) {
            showToast.warning(e instanceof Error ? e.message : 'Failed to remove user');
        }
    };

    const filteredDepartments = departments.filter(dept =>
        dept.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Get users not in the current department
    const availableUsers = viewingDept
        ? allUsers.filter(u => {
            const deptId = typeof u.departmentId === 'object' ? u.departmentId?._id : u.departmentId;
            return !deptId || deptId !== viewingDept._id;
        })
        : [];

    return (
        <>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Departments</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Organize users into teams and departments
                    </p>
                </div>
                {canManage('manage_users') && (
                    <Button onClick={openCreateModal} className="gap-2 shadow-lg shadow-primary/20">
                        <Plus className="h-4 w-4" />
                        Create Department
                    </Button>
                )}
            </div>

            {/* Search */}
            <div className="mb-4 max-w-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search departments..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20 bg-card rounded-lg border border-border">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : filteredDepartments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium text-foreground">
                        {searchQuery ? 'No departments found' : 'No departments yet'}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {searchQuery ? 'Try a different search term' : 'Create your first department to organize your team'}
                    </p>
                </div>
            ) : (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="font-semibold">Department</TableHead>
                                <TableHead className="font-semibold">Head</TableHead>
                                <TableHead className="font-semibold text-center">Members</TableHead>
                                <TableHead className="font-semibold text-center">Status</TableHead>
                                <TableHead className="font-semibold text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <AnimatePresence mode="popLayout">
                                {filteredDepartments.map((dept) => (
                                    <motion.tr
                                        key={dept._id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="group hover:bg-muted/30 transition-colors"
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                    <Building2 className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{dept.name}</p>
                                                    {dept.description && (
                                                        <p className="text-xs text-muted-foreground line-clamp-1">{dept.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {dept.head ? (
                                                <div className="flex items-center gap-2">
                                                    <Crown className="h-4 w-4 text-amber-500" />
                                                    <span className="text-sm">{dept.head.name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">Not assigned</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary" className="gap-1">
                                                <Users className="h-3 w-3" />
                                                {dept.memberCount || 0}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={dept.isActive ? 'default' : 'secondary'}>
                                                {dept.isActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openViewModal(dept)}
                                                    className="h-8 w-8"
                                                >
                                                    <Users className="h-4 w-4" />
                                                </Button>
                                                {canManage('manage_users') && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openEditModal(dept)}
                                                            className="h-8 w-8"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setDeleteDept(dept)}
                                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </>
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

            {/* Create Department Modal */}
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create Department</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name *</Label>
                            <Input
                                id="name"
                                placeholder="e.g., Sales Team"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Brief description of the department..."
                                value={formDescription}
                                onChange={(e) => setFormDescription(e.target.value)}
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="head">Department Head</Label>
                            <Select value={formHead || 'none'} onValueChange={(v) => setFormHead(v === 'none' ? null : v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a head (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {allUsers.filter(u => u.isActive).map(user => (
                                        <SelectItem key={user._id} value={user._id}>
                                            {user.name} ({user.email})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="active">Active</Label>
                            <Switch
                                id="active"
                                checked={formIsActive}
                                onCheckedChange={setFormIsActive}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreate} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Department Modal */}
            <Dialog open={!!editingDept} onOpenChange={(open) => !open && setEditingDept(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Department</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Name *</Label>
                            <Input
                                id="edit-name"
                                placeholder="e.g., Sales Team"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-description">Description</Label>
                            <Textarea
                                id="edit-description"
                                placeholder="Brief description of the department..."
                                value={formDescription}
                                onChange={(e) => setFormDescription(e.target.value)}
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-head">Department Head</Label>
                            <Select value={formHead || 'none'} onValueChange={(v) => setFormHead(v === 'none' ? null : v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a head (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {allUsers.filter(u => u.isActive).map(user => (
                                        <SelectItem key={user._id} value={user._id}>
                                            {user.name} ({user.email})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="edit-active">Active</Label>
                            <Switch
                                id="edit-active"
                                checked={formIsActive}
                                onCheckedChange={setFormIsActive}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingDept(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdate} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Members Modal */}
            <Dialog open={!!viewingDept} onOpenChange={(open) => !open && setViewingDept(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            {viewingDept?.name} - Members
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        {viewingDept?.members && viewingDept.members.length > 0 ? (
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {viewingDept.members.map(member => (
                                    <div key={member._id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                <Users className="h-4 w-4 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{member.name}</p>
                                                <p className="text-xs text-muted-foreground">{member.email}</p>
                                            </div>
                                            {viewingDept.head?._id === member._id && (
                                                <Badge variant="outline" className="ml-2 gap-1">
                                                    <Crown className="h-3 w-3 text-amber-500" />
                                                    Head
                                                </Badge>
                                            )}
                                        </div>
                                        {canManage('manage_users') && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveMember(member._id)}
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                            >
                                                <UserMinus className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">No members in this department</p>
                        )}
                    </div>
                    <DialogFooter>
                        {canManage('manage_users') && (
                            <Button onClick={() => setAddMemberModalOpen(true)} className="gap-2">
                                <UserPlus className="h-4 w-4" />
                                Add Member
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => setViewingDept(null)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Member Modal */}
            <Dialog open={addMemberModalOpen} onOpenChange={setAddMemberModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Member to {viewingDept?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="user-select">Select User</Label>
                        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                            <SelectTrigger className="mt-2">
                                <SelectValue placeholder="Choose a user..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableUsers.filter(u => u.isActive).map(user => (
                                    <SelectItem key={user._id} value={user._id}>
                                        {user.name} ({user.email})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {availableUsers.filter(u => u.isActive).length === 0 && (
                            <p className="text-sm text-muted-foreground mt-2">
                                All active users are already in a department
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setAddMemberModalOpen(false); setSelectedUserId(''); }}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddMember} disabled={!selectedUserId}>
                            Add to Department
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteDept} onOpenChange={(open) => !open && setDeleteDept(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Department</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{deleteDept?.name}"? This action cannot be undone.
                            Departments with members cannot be deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
