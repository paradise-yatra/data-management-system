import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    Search,
    Package,
    ChevronRight,
    Filter,
    ArrowUpDown,
    MoreVertical,
    Edit2,
    Trash2,
    Eye,
    MapPin,
    Clock,
    Send
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { packagesAPI, TourPackageRecord } from '@/services/api';
import { toast } from 'sonner';
import { showToast } from '@/utils/notifications';
import { Loader2 } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from '@/contexts/AuthContext';

const PackageCard = ({ pkg, onDelete, onPublish }: { pkg: TourPackageRecord; onDelete: (id: string) => void; onPublish: (id: string) => void }) => {
    const navigate = useNavigate();
    const { canDelete } = useAuth();
    const isPublished = pkg.status === 'published' || (!pkg.status && pkg.isActive);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative bg-card rounded-lg border border-border overflow-hidden hover:shadow-xl transition-all duration-300"
        >
            <div className="p-6 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                    <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Package className="h-5 w-5" />
                    </div>
                    <DropdownMenu>
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs px-2 py-1">
                                <p>More options</p>
                            </TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={() => navigate(`/voya-trail/packages/${pkg._id}`)}
                            >
                                View / Edit
                            </DropdownMenuItem>
                            {!isPublished && (
                                <DropdownMenuItem
                                    className="text-green-600"
                                    onClick={() => onPublish(pkg._id)}
                                >
                                    Publish
                                </DropdownMenuItem>
                            )}
                            {canDelete('voya_trail_packages') && (
                                <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => onDelete(pkg._id)}
                                >
                                    Delete
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-bold">
                            {(pkg.category && typeof pkg.category === 'object') ? (pkg.category as any).name : 'Category'}
                        </Badge>
                        <Badge variant={isPublished ? 'default' : 'secondary'} className="text-[10px]">
                            {isPublished ? 'Published' : 'Draft'}
                        </Badge>
                    </div>
                    <h3 className="text-xl font-bold mt-1 group-hover:text-primary transition-colors line-clamp-1">{pkg.title}</h3>
                </div>

                <div className="grid grid-cols-2 gap-3 py-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {pkg.durationDays}D / {pkg.durationNights}N
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="line-clamp-1">{pkg.location}</span>
                    </div>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Starting from</span>
                        <span className="text-lg font-black text-foreground">
                            ${(pkg.basePrice || 0).toLocaleString()}
                            <span className="text-[10px] font-normal text-muted-foreground ml-1">{`/${pkg.priceUnit}`}</span>
                        </span>
                    </div>
                    <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                            <Button
                                size="sm"
                                className="rounded-full px-4"
                                onClick={() => navigate(`/voya-trail/packages/${pkg._id}`)}
                            >
                                Manage
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs px-2 py-1">
                            <p>View and edit package details</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </motion.div>
    );
};

const Packages = () => {
    const navigate = useNavigate();
    const { canEdit } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [packages, setPackages] = useState<TourPackageRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogConfig, setDialogConfig] = useState<{ type: 'delete' | 'publish'; id: string } | null>(null);

    useEffect(() => {
        fetchPackages();
    }, []);

    const fetchPackages = async () => {
        try {
            setLoading(true);
            const data = await packagesAPI.getAll();
            setPackages(data);
        } catch (error) {
            showToast.error('Failed to fetch packages');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id: string) => {
        setDialogConfig({ type: 'delete', id });
        setDialogOpen(true);
    };

    const handlePublish = (id: string) => {
        setDialogConfig({ type: 'publish', id });
        setDialogOpen(true);
    };

    const confirmAction = async () => {
        if (!dialogConfig) return;

        const { type, id } = dialogConfig;
        try {
            if (type === 'delete') {
                await packagesAPI.delete(id);
                showToast.error('Package deleted successfully');
            } else {
                await packagesAPI.update(id, { status: 'published', isActive: true });
                showToast.success('Package published successfully');
            }
            fetchPackages();
        } catch (error) {
            showToast.error(`Failed to ${type} package`);
        } finally {
            setDialogOpen(false);
            setDialogConfig(null);
        }
    };

    const filteredPackages = packages.filter(pkg =>
        (pkg.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (pkg.location?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-screen w-full flex-row overflow-hidden bg-background text-foreground font-sans antialiased">
            <Sidebar project="voya-trail" />

            <main className="flex-1 flex flex-col h-full relative overflow-y-auto bg-background/50">
                <div className="p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Voya Trail</span>
                        <ChevronRight className="h-4 w-4" />
                        <span>Packages</span>
                        <ChevronRight className="h-4 w-4" />
                        <span className="text-foreground font-medium">All Packages</span>
                    </div>

                    {/* Title Section */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-3xl font-black tracking-tight">Tour Packages</h1>
                            <p className="text-muted-foreground">Create and manage your travel itineraries and packages.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {canEdit('voya_trail_packages') && (
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <Button
                                            className="gap-2 shadow-lg shadow-primary/20"
                                            onClick={() => navigate('/voya-trail/packages/new')}
                                        >
                                            <Plus className="h-4 w-4" />
                                            Create Package
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="text-xs px-2 py-1">
                                        <p>Create a new tour package</p>
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
                                placeholder="Search packages..."
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
                                    <p>Filter packages</p>
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
                                    <p>Sort packages</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </div>

                    {/* Content Section */}
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Tabs defaultValue="published" className="w-full space-y-6">
                            <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
                                <TabsTrigger value="published">Published</TabsTrigger>
                                <TabsTrigger value="drafts">Drafts</TabsTrigger>
                                <TabsTrigger value="all">All Packages</TabsTrigger>
                            </TabsList>

                            <TabsContent value="published" className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredPackages
                                        .filter(pkg => pkg.status === 'published' || (!pkg.status && pkg.isActive))
                                        .map((pkg) => (
                                            <PackageCard key={pkg._id} pkg={pkg} onDelete={handleDelete} onPublish={handlePublish} />
                                        ))}
                                </div>
                                {filteredPackages.filter(pkg => pkg.status === 'published' || (!pkg.status && pkg.isActive)).length === 0 && (
                                    <div className="text-center py-10 text-muted-foreground">No published packages found.</div>
                                )}
                            </TabsContent>

                            <TabsContent value="drafts" className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredPackages
                                        .filter(pkg => pkg.status === 'draft' || (!pkg.status && !pkg.isActive))
                                        .map((pkg) => (
                                            <PackageCard key={pkg._id} pkg={pkg} onDelete={handleDelete} onPublish={handlePublish} />
                                        ))}
                                </div>
                                {filteredPackages.filter(pkg => pkg.status === 'draft' || (!pkg.status && !pkg.isActive)).length === 0 && (
                                    <div className="text-center py-10 text-muted-foreground">No draft packages found.</div>
                                )}
                            </TabsContent>

                            <TabsContent value="all" className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredPackages.map((pkg) => (
                                        <PackageCard key={pkg._id} pkg={pkg} onDelete={handleDelete} onPublish={handlePublish} />
                                    ))}
                                </div>
                            </TabsContent>
                        </Tabs>
                    )}

                    {!loading && filteredPackages.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="size-20 rounded-full bg-muted flex items-center justify-center mb-4">
                                <Package className="h-10 w-10 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-bold">No packages found</h3>
                            <p className="text-muted-foreground max-w-xs mx-auto mt-2">
                                {searchQuery ? 'No packages match your search.' : "You haven't created any packages yet. Click the button above to get started."}
                            </p>
                        </div>
                    )}
                </div>
            </main>

            <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {dialogConfig?.type === 'delete' ? 'Delete Package?' : 'Publish Package?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {dialogConfig?.type === 'delete'
                                ? 'This action cannot be undone. This will permanently delete the package and remove it from our servers.'
                                : 'This will make the package visible to all users on the live website. Are you sure you want to publish?'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmAction}
                            className={dialogConfig?.type === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'bg-primary text-primary-foreground hover:bg-primary/90'}
                        >
                            {dialogConfig?.type === 'delete' ? 'Delete' : 'Publish'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default Packages;
