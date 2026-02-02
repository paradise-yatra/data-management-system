import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ArrowLeft,
  Lock,
  Eye,
  Shield,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { useNavigate, Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from '@/contexts/AuthContext';
import { rbacAPI } from '@/services/api';
import type { Role, Resource, AccessLevel } from '@/types/rbac';
import { showToast } from '@/utils/notifications';

export default function RBACPage() {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen w-full flex-row overflow-hidden bg-background text-foreground font-sans antialiased">
      <Sidebar project="crm" /> {/* Assuming 'crm' or similar, keeping consistent with file path */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-4 border-b border-border bg-card px-6 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="h-8 w-8 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">RBAC System</h1>
              <p className="text-sm text-muted-foreground">
                Roles and permissions · Manage users
              </p>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6 bg-muted/10">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

// Helper to group resources by Category -> SubCategory
const groupResources = (resources: Resource[]) => {
  const groups: Record<string, Record<string, Resource[]>> = {};

  resources.forEach(res => {
    const category = res.category || 'General';
    const subCategory = res.subCategory || 'Direct';

    if (!groups[category]) groups[category] = {};
    if (!groups[category][subCategory]) groups[category][subCategory] = [];

    groups[category][subCategory].push(res);
  });

  return Object.entries(groups);
};

// Reusable Permissions Editor Component
const PermissionsEditor = ({
  resources,
  permissions,
  onChange
}: {
  resources: Resource[];
  permissions: Record<string, AccessLevel>;
  onChange: (key: string, value: AccessLevel) => void;
}) => {
  const grouped = groupResources(resources);

  return (
    <div className="space-y-4">
      <Accordion type="multiple" className="w-full space-y-4">
        {grouped.map(([groupName, subCategories]) => (
          <AccordionItem value={groupName} key={groupName} className="border border-border rounded-lg bg-card overflow-hidden">
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg">{groupName}</span>
                <Badge variant="secondary" className="ml-2 bg-muted-foreground/10 text-muted-foreground hover:bg-muted-foreground/20">
                  {Object.values(subCategories).reduce((acc, curr) => acc + curr.length, 0)} resources
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-0 pb-0">
              <div className="border-t border-border">
                {/* Header Row */}
                <div className="grid grid-cols-[1.5fr,repeat(4,100px)] gap-4 px-4 py-3 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider items-center">
                  <div className="pl-2">Resource Name</div>
                  <div className="text-center flex items-center justify-center gap-1 cursor-help" title="User cannot access this resource">
                    <Lock className="h-3 w-3" /> None
                  </div>
                  <div className="text-center flex items-center justify-center gap-1 cursor-help" title="User can only view data">
                    <Eye className="h-3 w-3" /> View
                  </div>
                  <div className="text-center flex items-center justify-center gap-1 cursor-help" title="User can view and create/edit items">
                    <Pencil className="h-3 w-3" /> Edit
                  </div>
                  <div className="text-center flex items-center justify-center gap-1 cursor-help" title="User has full control including delete">
                    <Shield className="h-3 w-3" /> Full
                  </div>
                </div>

                {/* Subcategories & Resources */}
                <div className="divide-y divide-border">
                  {Object.entries(subCategories).map(([subName, items]) => (
                    <div key={subName}>
                      {subName !== 'Direct' && subName !== '_root' && (
                        <div className="px-4 py-2 bg-muted/20 text-sm font-semibold text-foreground/80 border-b border-border/50">
                          {subName}
                        </div>
                      )}
                      {items.map((res) => (
                        <div key={res.key} className="grid grid-cols-[1.5fr,repeat(4,100px)] gap-4 px-4 py-3 items-center hover:bg-muted/20 transition-colors">
                          <div className={`flex flex-col gap-0.5 px-2 ${subName !== 'Direct' ? 'pl-6' : ''}`}>
                            <div className="font-medium text-sm flex items-center gap-2">
                              {res.label}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3 w-3 text-muted-foreground/50 cursor-pointer hover:text-primary" />
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                  <p>{res.description}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <span className="text-xs text-muted-foreground line-clamp-1">{res.description}</span>
                          </div>

                          {res.isToggle ? (
                            <div className="contents">
                              <div className="col-span-4 flex items-center justify-center gap-3">
                                <span className={`text-xs font-medium ${permissions[res.key] === 'view' ? 'text-primary' : 'text-muted-foreground'}`}>
                                  {permissions[res.key] === 'view' ? 'Visible' : 'Hidden'}
                                </span>
                                <Switch
                                  checked={permissions[res.key] === 'view'}
                                  onCheckedChange={(checked) => onChange(res.key, checked ? 'view' : 'none')}
                                />
                              </div>
                            </div>
                          ) : (
                            <RadioGroup
                              value={permissions[res.key] ?? 'none'}
                              onValueChange={(v) => onChange(res.key, v as AccessLevel)}
                              className="contents"
                            >
                              {[
                                { value: 'none', color: 'text-muted-foreground' },
                                { value: 'view', color: 'text-blue-500' },
                                { value: 'edit', color: 'text-amber-500' },
                                { value: 'full', color: 'text-destructive' }
                              ].map((option) => (
                                <div key={option.value} className="flex justify-center">
                                  <div className="relative flex items-center justify-center">
                                    <RadioGroupItem
                                      value={option.value}
                                      id={`${res.key}-${option.value}`}
                                      className={`peer sr-only`}
                                    />
                                    <Label
                                      htmlFor={`${res.key}-${option.value}`}
                                      className={`
                                        h-5 w-5 rounded-full border border-muted-foreground/30 cursor-pointer 
                                        peer-focus:ring-2 peer-focus:ring-ring peer-focus:ring-offset-2
                                        hover:border-primary hover:bg-primary/5 transition-all
                                        peer-data-[state=checked]:bg-primary peer-data-[state=checked]:border-primary
                                        flex items-center justify-center
                                      `}
                                    >
                                      <CheckCircle2 className="h-3 w-3 text-primary-foreground opacity-0 peer-data-[state=checked]:opacity-100 transition-opacity" />
                                    </Label>
                                  </div>
                                </div>
                              ))}
                            </RadioGroup>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};


export function RBACRolesContent() {
  const { canManage } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [rolePermissions, setRolePermissions] = useState<Record<string, AccessLevel>>({});
  const [deleteRole, setDeleteRole] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');

  const fetchRoles = async () => {
    if (!canManage('rbac_system')) return;
    try {
      const data = await rbacAPI.getRoles();
      setRoles(data);
    } catch (e) {
      console.error(e);
      showToast.warning('Failed to load roles');
    }
  };

  const fetchResources = async () => {
    try {
      const data = await rbacAPI.getResources();
      setResources(data);
    } catch (e) {
      console.error(e);
      showToast.warning('Failed to load resources');
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchRoles(), fetchResources()]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openPermissionsModal = (role: Role) => {
    setEditingRole(role);
    const map: Record<string, AccessLevel> = {};
    resources.forEach((r) => {
      const perm = role.permissions?.find((p) => p.resourceKey === r.key);
      map[r.key] = perm?.accessLevel ?? 'none';
    });
    setRolePermissions(map);
    setPermissionsModalOpen(true);
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      showToast.warning('Role name is required');
      return;
    }
    setSaving(true);
    try {
      const permissions = resources.map((r) => ({
        resourceKey: r.key,
        accessLevel: rolePermissions[r.key] ?? 'none',
      }));
      await rbacAPI.createRole({
        name: newRoleName.trim(),
        description: newRoleDescription.trim(),
        permissions,
        isSystem: false,
      });
      showToast.success('Role created');
      setCreateModalOpen(false);
      setNewRoleName('');
      setNewRoleDescription('');
      setRolePermissions({});
      fetchRoles();
    } catch (e) {
      showToast.warning(e instanceof Error ? e.message : 'Failed to create role');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!editingRole) return;
    setSaving(true);
    try {
      const permissions = resources.map((r) => ({
        resourceKey: r.key,
        accessLevel: rolePermissions[r.key] ?? 'none',
      }));
      await rbacAPI.updateRole(editingRole._id, { permissions });
      showToast.success('Permissions updated');
      setPermissionsModalOpen(false);
      setEditingRole(null);
      fetchRoles();
    } catch (e) {
      showToast.warning(e instanceof Error ? e.message : 'Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteRole) return;
    try {
      await rbacAPI.deleteRole(deleteRole._id);
      showToast.success('Role deleted');
      setDeleteRole(null);
      fetchRoles();
    } catch (e) {
      showToast.warning(e instanceof Error ? e.message : 'Failed to delete role');
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Roles & Permissions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create roles and granularly assign permissions to different system modules.
          </p>
        </div>
        {canManage('rbac_system') && (
          <Button
            onClick={() => {
              setNewRoleName('');
              setNewRoleDescription('');
              setRolePermissions(
                Object.fromEntries(resources.map((r) => [r.key, 'none' as AccessLevel]))
              );
              setCreateModalOpen(true);
            }}
            className="gap-2 shadow-lg shadow-primary/20"
          >
            <Plus className="h-4 w-4" />
            Create Role
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 bg-card rounded-lg border border-border">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : roles.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-foreground">No roles defined</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Get started by creating a new role.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-bold text-foreground pl-6">Role Name</TableHead>
                <TableHead className="font-bold text-foreground">Description</TableHead>
                <TableHead className="font-bold text-foreground">Type</TableHead>
                <TableHead className="font-bold text-foreground text-right pr-6">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {roles.map((role, index) => (
                  <motion.tr
                    key={role._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-border transition-colors hover:bg-muted/20"
                  >
                    <TableCell className="font-medium text-foreground pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${role.isSystem ? 'bg-amber-500/10 text-amber-600' : 'bg-primary/10 text-primary'}`}>
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-base">{role.name}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[300px]">
                      {role.description || <span className="text-muted-foreground/50 italic">No description</span>}
                    </TableCell>
                    <TableCell>
                      {role.isSystem ? (
                        <Badge variant="outline" className="bg-amber-500/5 text-amber-600 border-amber-500/20 font-mono text-xs uppercase tracking-wider">
                          System
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted/50 text-muted-foreground font-mono text-xs uppercase tracking-wider">
                          Custom
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      {canManage('rbac_system') && (
                        <div className="flex items-center justify-end gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openPermissionsModal(role)}
                                className="h-9 gap-2 border-border/50 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit Permissions
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Modify role permissions</TooltipContent>
                          </Tooltip>

                          {!role.isSystem && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteRole(role)}
                                  className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete role</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Role Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden gap-0">
          <DialogHeader className="p-6 border-b border-border bg-muted/5">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Plus className="h-6 w-6 text-primary" />
              Create New Role
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="new-role-name" className="text-base font-semibold">Role Name</Label>
                <Input
                  id="new-role-name"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. Content Manager"
                  className="h-11 border-border/60 focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-role-desc" className="text-base font-semibold">Description</Label>
                <Input
                  id="new-role-desc"
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="e.g. Can manage all content but not settings"
                  className="h-11 border-border/60 focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-bold">Permissions Configuration</Label>
              </div>

              <div className="rounded-xl border border-border bg-muted/5 p-1">
                <PermissionsEditor
                  resources={resources}
                  permissions={rolePermissions}
                  onChange={(key, val) => setRolePermissions(prev => ({ ...prev, [key]: val }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 border-t border-border bg-background">
            <Button variant="outline" onClick={() => setCreateModalOpen(false)} className="h-11 px-6">
              Cancel
            </Button>
            <Button onClick={handleCreateRole} disabled={saving} className="h-11 px-6 gap-2 text-base font-semibold shadow-xl shadow-primary/20">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Permissions Modal */}
      <Dialog open={permissionsModalOpen} onOpenChange={setPermissionsModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden gap-0">
          <DialogHeader className="p-6 border-b border-border bg-muted/5">
            <div className="flex flex-col gap-1">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-primary" />
                Edit Permissions
              </DialogTitle>
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                Managing permissions for role: <Badge variant="secondary" className="font-mono">{editingRole?.name}</Badge>
              </p>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="rounded-xl border border-border bg-muted/5 p-1">
              <PermissionsEditor
                resources={resources}
                permissions={rolePermissions}
                onChange={(key, val) => setRolePermissions(prev => ({ ...prev, [key]: val }))}
              />
            </div>
          </div>

          <DialogFooter className="p-6 border-t border-border bg-background">
            <Button variant="outline" onClick={() => setPermissionsModalOpen(false)} className="h-11 px-6">
              Cancel
            </Button>
            <Button onClick={handleSavePermissions} disabled={saving} className="h-11 px-6 gap-2 text-base font-semibold shadow-xl shadow-primary/20">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteRole} onOpenChange={() => setDeleteRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl text-destructive font-bold flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete Role
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base mt-2">
              Are you sure you want to delete the role <span className="font-bold text-foreground mx-1">{deleteRole?.name}</span>?
              <br /><br />
              This will permanently remove the role from the system. Any users currently assigned to this role will lose their specific permissions and may revert to default access levels.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="h-10">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRole} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-10 px-6 font-semibold">
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
