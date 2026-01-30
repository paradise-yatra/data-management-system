import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Search,
    MoreVertical,
    Edit2,
    Trash2,
    MapPin,
    ChevronRight,
    Filter,
    ArrowUpDown,
    Loader2
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

import { destinationsAPI, DestinationRecord } from '@/services/api';

const Destinations = () => {
    const { canEdit, canDelete } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [destinations, setDestinations] = useState<DestinationRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDestination, setEditingDestination] = useState<DestinationRecord | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
        isActive: true
    });

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [destinationToDelete, setDestinationToDelete] = useState<DestinationRecord | null>(null);

    useEffect(() => {
        fetchDestinations();
    }, []);

    const fetchDestinations = async () => {
        try {
            setIsLoading(true);
            const data = await destinationsAPI.getAll();
            setDestinations(data);
        } catch (error) {
            console.error('Error fetching destinations:', error);
            showToast.warning('Failed to load destinations');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredDestinations = destinations.filter(dest =>
        dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (dest.description && dest.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleOpenModal = (destination?: DestinationRecord) => {
        if (destination) {
            setEditingDestination(destination);
            setFormData({
                name: destination.name,
                slug: destination.slug,
                description: destination.description || '',
                isActive: destination.isActive
            });
        } else {
            setEditingDestination(null);
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
            if (editingDestination) {
                const updated = await destinationsAPI.update(editingDestination._id, formData);
                setDestinations(prev => prev.map(dest =>
                    dest._id === editingDestination._id ? updated : dest
                ));
                showToast.success('Destination updated successfully');
            } else {
                const created = await destinationsAPI.create(formData);
                setDestinations(prev => [created, ...prev]);
                showToast.success('Destination created successfully');
            }
            setIsModalOpen(false);
        } catch (error: any) {
            showToast.error(error.message || 'Failed to save destination');
        }
    };

    const handleDeleteClick = (destination: DestinationRecord) => {
        setDestinationToDelete(destination);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!destinationToDelete) return;

        try {
            await destinationsAPI.delete(destinationToDelete._id);
            setDestinations(prev => prev.filter(dest => dest._id !== destinationToDelete._id));
            showToast.error('Destination deleted successfully');
            setIsDeleteModalOpen(false);
            setDestinationToDelete(null);
        } catch (error: any) {
            showToast.error(error.message || 'Failed to delete destination');
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
                        <span className="text-foreground font-medium">Destinations</span>
                    </div>

                    {/* Title Section */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-3xl font-black tracking-tight">Destinations</h1>
                            <p className="text-muted-foreground">Manage your travel destinations and locations.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {canEdit('voya_trail_destinations') && (
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <Button className="gap-2 shadow-lg shadow-primary/20" onClick={() => handleOpenModal()}>
                                            <Plus className="h-4 w-4" />
                                            New Destination
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="text-xs px-2 py-1">
                                        <p>Create a new destination</p>
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
                                placeholder="Search destinations..."
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
                                    <p>Filter destinations</p>
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
                                    <p>Sort destinations</p>
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
                                <p className="text-muted-foreground">Loading destinations...</p>
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
                                            <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">Destination</th>
                                            <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">URL Slug</th>
                                            <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">Packages</th>
                                            <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">Status</th>
                                            <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">Created</th>
                                            <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filteredDestinations.map((destination) => (
                                            <tr key={destination._id} className="hover:bg-muted/20 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                            <MapPin className="h-5 w-5" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-foreground">{destination.name}</span>
                                                            <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{destination.description || 'No description'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{`/${destination.slug}`}</td>
                                                <td className="px-6 py-4 font-medium">{destination.packageCount || 0}</td>
                                                <td className="px-6 py-4">
                                                    <Badge variant={destination.isActive ? 'default' : 'secondary'} className="text-[10px]">
                                                        {destination.isActive ? 'active' : 'inactive'}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-muted-foreground">
                                                    {new Date(destination.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {canEdit('voya_trail_destinations') && (
                                                            <Tooltip delayDuration={0}>
                                                                <TooltipTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenModal(destination)}>
                                                                        <Edit2 className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="text-xs px-2 py-1">
                                                                    <p>Edit destination</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                        {canDelete('voya_trail_destinations') && (
                                                            <Tooltip delayDuration={0}>
                                                                <TooltipTrigger asChild>
                                                                    <span tabIndex={0} className="inline-flex">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className={`h-8 w-8 ${destination.packageCount && destination.packageCount > 0 ? 'text-muted-foreground opacity-50 cursor-not-allowed' : 'text-destructive hover:text-destructive'}`}
                                                                            onClick={() => {
                                                                                if (!destination.packageCount || destination.packageCount === 0) {
                                                                                    handleDeleteClick(destination);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </span>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="text-xs px-2 py-1">
                                                                    {destination.packageCount && destination.packageCount > 0
                                                                        ? <p>Cannot delete as this destination is already used in {destination.packageCount} package{destination.packageCount !== 1 ? 's' : ''}.</p>
                                                                        : <p>Delete destination</p>
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

                    {!isLoading && filteredDestinations.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="size-20 rounded-full bg-muted flex items-center justify-center mb-4">
                                <Search className="h-10 w-10 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-bold">No destinations found</h3>
                            <p className="text-muted-foreground max-w-xs mx-auto mt-2">
                                We couldn't find any destinations matching your search. Try a different term or create a new one.
                            </p>
                            <Button className="mt-6 gap-2" onClick={() => handleOpenModal()}>
                                <Plus className="h-4 w-4" />
                                Create Destination
                            </Button>
                        </div>
                    )}

                    {/* Add/Edit Modal */}
                    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>{editingDestination ? 'Edit Destination' : 'Create New Destination'}</DialogTitle>
                                <DialogDescription>
                                    Fill in the details below to {editingDestination ? 'update the' : 'create a new'} travel destination.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-6 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Destination Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="e.g. Delhi"
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
                                            placeholder="delhi"
                                            value={formData.slug}
                                            onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Describe what this destination is about..."
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
                                    {editingDestination ? 'Update Destination' : 'Create Destination'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Delete Confirmation Dialog */}
                    <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Delete Destination</DialogTitle>
                                <DialogDescription>
                                    Are you sure you want to delete <span className="font-bold text-foreground">{destinationToDelete?.name}</span>? This action cannot be undone.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                                <Button variant="destructive" onClick={handleConfirmDelete}>Delete</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div >
            </main >
        </div >
    );
};

export default Destinations;
