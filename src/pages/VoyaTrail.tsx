import { useNavigate } from 'react-router-dom';
import {
    Search,
    Plus,
    Bell,
    Package,
    FileText,
    Tags
} from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/Sidebar';

const VoyaTrail = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    return (
        <div className="flex h-screen w-full flex-row overflow-hidden bg-background text-foreground font-sans antialiased">
            {/* Sidebar Navigation */}
            <Sidebar project="voya-trail" />

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full relative overflow-y-auto bg-background">
                <div className="p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
                    {/* Search Bar */}
                    <div className="flex items-center gap-4 w-full max-w-xl">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                className="w-full bg-muted/50 border border-border rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary outline-none"
                                placeholder="Search packages or blogs..."
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <h1 className="text-3xl font-black tracking-tight">Voya Trail Dashboard</h1>
                        <p className="text-muted-foreground">Manage your travel packages and blog content from one place.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Quick Stats or Actions */}
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <div className="p-6 rounded-xl border border-border bg-card hover:border-primary/50 transition-all group cursor-pointer">
                                    <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                        <Package className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-lg font-bold mb-1">Total Packages</h3>
                                    <p className="text-3xl font-black text-foreground">24</p>
                                    <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                                        <Plus className="h-3 w-3" /> Create new package
                                    </p>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs px-2 py-1">
                                <p>View all packages or create a new one</p>
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <div className="p-6 rounded-xl border border-border bg-card hover:border-primary/50 transition-all group cursor-pointer">
                                    <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                        <FileText className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-lg font-bold mb-1">Blog Posts</h3>
                                    <p className="text-3xl font-black text-foreground">12</p>
                                    <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                                        <Plus className="h-3 w-3" /> Write new post
                                    </p>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs px-2 py-1">
                                <p>Manage blog posts and content</p>
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <div
                                    onClick={() => navigate('/voya-trail/packages/category')}
                                    className="p-6 rounded-xl border border-border bg-card hover:border-primary/50 transition-all group cursor-pointer"
                                >
                                    <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                        <Tags className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-lg font-bold mb-1">Categories</h3>
                                    <p className="text-3xl font-black text-foreground">8</p>
                                    <p className="text-sm text-muted-foreground mt-2">Across all modules</p>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs px-2 py-1">
                                <p>Manage package categories</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default VoyaTrail;
