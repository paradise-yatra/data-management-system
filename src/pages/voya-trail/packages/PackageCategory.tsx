import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Search,
    MoreVertical,
    Edit2,
    Trash2,
    Folder,
    ChevronRight,
    Filter,
    ArrowUpDown,
    Loader2,
    Eye,
    Globe
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/animate-ui/components/radix/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { showToast } from '@/utils/notifications';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from '@/contexts/AuthContext';
import { tourCategoriesAPI, TourCategoryRecord } from '@/services/api';
import { CategoryDeleteDialog } from '@/components/voya-trail/CategoryDeleteDialog';

const PackageCategory = () => {
    const { canEdit, canDelete } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [categories, setCategories] = useState<TourCategoryRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<TourCategoryRecord | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
        isActive: true
    });

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<TourCategoryRecord | null>(null);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            setIsLoading(true);
            const data = await tourCategoriesAPI.getAll();
            setCategories(data);
        } catch (error) {
            console.error('Error fetching categories:', error);
            showToast.warning('Failed to load categories');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cat.description && cat.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleOpenModal = (category?: TourCategoryRecord) => {
        if (category) {
            setEditingCategory(category);
            setFormData({
                name: category.name,
                slug: category.slug,
                description: category.description || '',
                isActive: category.isActive
            });
        } else {
            setEditingCategory(null);
            setFormData({
                name: '',
                slug: '',
                description: '',
                isActive: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.slug) {
            showToast.warning('Name and slug are required');
            return;
        }

        try {
            console.log('Saving category:', formData);
            if (editingCategory) {
                console.log('Updating category:', editingCategory._id);
                const updated = await tourCategoriesAPI.update(editingCategory._id, formData);
                console.log('Update response:', updated);
                setCategories(prev => prev.map(cat =>
                    cat._id === editingCategory._id ? updated : cat
                ));
                showToast.warning('Category updated successfully');
            } else {
                console.log('Creating new category');
                const created = await tourCategoriesAPI.create(formData);
                console.log('Create response:', created);
                setCategories(prev => [created, ...prev]);
                showToast.success('Category created successfully');
            }
            setIsModalOpen(false);
        } catch (error: any) {
            showToast.error(error.message || 'Failed to save category');
        }
    };

    const handleDeleteClick = (category: TourCategoryRecord) => {
        setCategoryToDelete(category);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!categoryToDelete) return;

        try {
            await tourCategoriesAPI.delete(categoryToDelete._id);
            setCategories(prev => prev.filter(cat => cat._id !== categoryToDelete._id));
            showToast.error('Category deleted successfully');
            setIsDeleteModalOpen(false);
            setCategoryToDelete(null);
        } catch (error: any) {
            showToast.error(error.message || 'Failed to delete category');
        }
    };

    return (
        <div className="flex h-screen w-full flex-row overflow-hidden bg-background text-foreground font-sans antialiased" >
            <Sidebar project="voya-trail" />

            <main className="flex-1 flex flex-col h-full relative overflow-y-auto bg-background/50">
                <div className="p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Voya Trail</span>
                        <ChevronRight className="h-4 w-4" />
                        <span>Packages</span>
                        <ChevronRight className="h-4 w-4" />
                        <span className="text-foreground font-medium">Categories</span>
                    </div>

                    {/* Title Section */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-3xl font-black tracking-tight">Package Categories</h1>
                            <p className="text-muted-foreground">Organize your travel packages into meaningful groups.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {canEdit('voya_trail_category') && (
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <Button className="gap-2 shadow-lg shadow-primary/20" onClick={() => handleOpenModal()}>
                                            <Plus className="h-4 w-4" />
                                            New Category
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="text-xs px-2 py-1">
                                        <p>Create a new category</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                    </div>

                    {/* Controls Section */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                className="pl-10 bg-card border-border"
                                placeholder="Search categories..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-2 border-border">
                                        <Filter className="h-4 w-4" />
                                        Filter
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs px-2 py-1">
                                    <p>Filter categories</p>
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-2 border-border">
                                        <ArrowUpDown className="h-4 w-4" />
                                        Sort
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs px-2 py-1">
                                    <p>Sort categories</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </div>

                    {/* Content Section */}
                    <AnimatePresence mode="wait">
                        {isLoading ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-20"
                            >
                                <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                                <p className="text-muted-foreground">Loading categories...</p>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-card rounded-lg border border-border overflow-hidden shadow-sm"
                            >
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/30">
                                            <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">Category</th>
                                            <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">URL Slug</th>
                                            <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">Packages</th>
                                            <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">Status</th>
                                            <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">Created</th>
                                            <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filteredCategories.map((category) => (
                                            <tr key={category._id} className="hover:bg-muted/20 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                            <Folder className="h-5 w-5" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-foreground">{category.name}</span>
                                                            <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{category.description || 'No description'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{`/${category.slug}`}</td>
                                                <td className="px-6 py-4 font-medium">{category.packageCount || 0}</td>
                                                <td className="px-6 py-4">
                                                    <Badge variant={category.isActive ? 'default' : 'secondary'} className="text-[10px]">
                                                        {category.isActive ? 'active' : 'inactive'}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-muted-foreground">
                                                    {new Date(category.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Tooltip delayDuration={0}>
                                                            <TooltipTrigger asChild>
                                                                <a
                                                                    href={`http://localhost:3000/${category.slug}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                </a>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="text-xs px-2 py-1">
                                                                <p>View on live site</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                        {canEdit('voya_trail_category') && (
                                                            <Tooltip delayDuration={0}>
                                                                <TooltipTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenModal(category)}>
                                                                        <Edit2 className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="text-xs px-2 py-1">
                                                                    <p>Edit category</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                        {canDelete('voya_trail_category') && (
                                                            <Tooltip delayDuration={0}>
                                                                <TooltipTrigger asChild>
                                                                    <span tabIndex={0} className="inline-flex">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className={`h-8 w-8 ${category.packageCount && category.packageCount > 0 ? 'text-muted-foreground opacity-50 cursor-not-allowed' : 'text-destructive hover:text-destructive'}`}
                                                                            onClick={() => {
                                                                                if (!category.packageCount || category.packageCount === 0) {
                                                                                    handleDeleteClick(category);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </span>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="text-xs px-2 py-1">
                                                                    {category.packageCount && category.packageCount > 0
                                                                        ? <p>Cannot delete as this category is already used in {category.packageCount} package{category.packageCount !== 1 ? 's' : ''}.</p>
                                                                        : <p>Delete category</p>
                                                                    }
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {!isLoading && filteredCategories.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="size-20 rounded-full bg-muted flex items-center justify-center mb-4">
                                <Search className="h-10 w-10 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-bold">No categories found</h3>
                            <p className="text-muted-foreground max-w-xs mx-auto mt-2">
                                We couldn't find any categories matching your search. Try a different term or create a new one.
                            </p>
                            <Button className="mt-6 gap-2" onClick={() => handleOpenModal()}>
                                <Plus className="h-4 w-4" />
                                Create Category
                            </Button>
                        </div>
                    )}

                    {/* Add/Edit Modal */}
                    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>{editingCategory ? 'Edit Category' : 'Create New Category'}</DialogTitle>
                                <DialogDescription>
                                    Fill in the details below to {editingCategory ? 'update the' : 'create a new'} package category.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-6 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Category Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="e.g. Luxury Stays"
                                        value={formData.name}
                                        onChange={(e) => {
                                            const name = e.target.value;
                                            const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                                            setFormData(prev => ({ ...prev, name, slug }));
                                        }}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="slug">Slug</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">/</span>
                                        <Input
                                            id="slug"
                                            className="pl-6 font-mono text-sm"
                                            placeholder="luxury-stays"
                                            value={formData.slug}
                                            onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Describe what this category is about..."
                                        className="resize-none h-24"
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="status">Status</Label>
                                    <Select
                                        value={formData.isActive ? 'active' : 'inactive'}
                                        onValueChange={(value: 'active' | 'inactive') => setFormData(prev => ({ ...prev, isActive: value === 'active' }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="inactive">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button onClick={handleSave}>
                                    {editingCategory ? 'Update Category' : 'Create Category'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <CategoryDeleteDialog
                        isOpen={isDeleteModalOpen}
                        category={categoryToDelete}
                        onConfirm={handleConfirmDelete}
                        onCancel={() => {
                            setIsDeleteModalOpen(false);
                            setCategoryToDelete(null);
                        }}
                    />
                </div >
            </main >
        </div >
    );
};

export default PackageCategory;
