import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    MapPin,
    ChevronRight,
    Loader2,
    X
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { showToast } from '@/utils/notifications';
import { telecallerAPI } from '@/services/api';
import { GenericDeleteConfirmDialog } from '@/components/dashboard/GenericDeleteConfirmDialog';

const TelecallerDestinations = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [destinations, setDestinations] = useState<{ _id: string, name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newDestinationName, setNewDestinationName] = useState('');
    const [editingDestination, setEditingDestination] = useState<{ _id: string, name: string } | null>(null);
    const [deleteDestination, setDeleteDestination] = useState<{ id: string, name: string } | null>(null);

    useEffect(() => {
        fetchDestinations();
    }, []);

    const fetchDestinations = async () => {
        try {
            setIsLoading(true);
            const data = await telecallerAPI.getDestinations();
            setDestinations(data);
        } catch (error) {
            console.error('Error fetching destinations:', error);
            showToast.error('Failed to load destinations');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!newDestinationName.trim()) {
            showToast.warning('Destination name is required');
            return;
        }

        try {
            if (editingDestination) {
                // Update existing
                const updated = await telecallerAPI.updateDestination(editingDestination._id, { name: newDestinationName.trim() });
                setDestinations(prev => prev.map(dest => dest._id === updated._id ? updated : dest));
                showToast.success('Destination updated successfully');
                setIsModalOpen(false);
                setEditingDestination(null);
                setNewDestinationName('');
            } else {
                // Create new
                const created = await telecallerAPI.createDestination({ name: newDestinationName.trim() });
                setDestinations(prev => [...prev, created]);
                showToast.success('Destination added successfully');
                setIsModalOpen(false);
                setNewDestinationName('');
            }
        } catch (error: any) {
            showToast.error(error.message || 'Failed to save destination');
        }
    };

    const handleEdit = (dest: { _id: string, name: string }) => {
        setEditingDestination(dest);
        setNewDestinationName(dest.name);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string, name: string) => {
        setDeleteDestination({ id, name });
    };

    const handleDeleteConfirm = async () => {
        if (!deleteDestination) return;

        try {
            await telecallerAPI.deleteDestination(deleteDestination.id);
            setDestinations(prev => prev.filter(dest => dest._id !== deleteDestination.id));
            showToast.success('Destination deleted successfully');
            setDeleteDestination(null);
        } catch (error: any) {
            showToast.error(error.message || 'Failed to delete destination');
        }
    };

    const filteredDestinations = destinations.filter(dest =>
        dest.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-screen w-full flex-row overflow-hidden bg-background">
            <Sidebar project="telecaller" />

            <main className="flex-1 flex flex-col h-full relative overflow-y-auto">
                <div className="p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Telecaller Panel</span>
                        <ChevronRight className="h-4 w-4" />
                        <span className="text-foreground font-medium">Destinations</span>
                    </div>

                    {/* Title Section */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-3xl font-bold tracking-tight">Destinations</h1>
                            <p className="text-muted-foreground italic text-sm">Manage destinations available for telecalling leads.</p>
                        </div>
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Button className="gap-2" onClick={() => { setEditingDestination(null); setNewDestinationName(''); setIsModalOpen(true); }}>
                                    <Plus className="h-4 w-4" />
                                    Add Destination
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Add a new destination</TooltipContent>
                        </Tooltip>
                    </div>

                    {/* Search Bar */}
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            className="pl-10"
                            placeholder="Search destinations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Content Section */}
                    <AnimatePresence mode="wait">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                                <p className="text-muted-foreground">Loading destinations...</p>
                            </div>
                        ) : filteredDestinations.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {filteredDestinations.map((dest) => (
                                    <motion.div
                                        key={dest._id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        whileHover={{ y: -2 }}
                                        className="p-4 rounded-xl border border-border bg-card shadow-sm group relative"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                                <MapPin className="h-5 w-5" />
                                            </div>
                                            <span className="font-semibold text-foreground">{dest.name}</span>
                                        </div>
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                            <Tooltip delayDuration={0}>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        onClick={() => handleEdit(dest)}
                                                        className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent>Edit destination</TooltipContent>
                                            </Tooltip>
                                            <Tooltip delayDuration={0}>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        onClick={() => handleDelete(dest._id, dest.name)}
                                                        className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent>Delete destination</TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <MapPin className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold">No destinations found</h3>
                                <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-1">
                                    {searchQuery ? "No results match your search." : "Start by adding your first telecalling destination."}
                                </p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingDestination ? 'Edit Destination' : 'Add New Destination'}</DialogTitle>
                        <DialogDescription>
                            {editingDestination
                                ? 'Update the name of this destination. This will also update it in all existing leads.'
                                : 'Enter the name of the destination you want to add to the telecalling panel.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Destination Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. Kashmir, Dubai, Bali"
                                value={newDestinationName}
                                onChange={(e) => setNewDestinationName(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setIsModalOpen(false); setNewDestinationName(''); setEditingDestination(null); }}>Cancel</Button>
                        <Button onClick={handleSave}>{editingDestination ? 'Update Destination' : 'Add Destination'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <GenericDeleteConfirmDialog
                isOpen={!!deleteDestination}
                title="Delete Destination"
                description={`Are you sure you want to delete "${deleteDestination?.name}"? This action cannot be undone.`}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteDestination(null)}
            />
        </div>
    );
};

export default TelecallerDestinations;
