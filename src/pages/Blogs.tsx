import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Edit, Trash2, FileText, ChevronRight, Loader2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Sidebar } from "@/components/Sidebar";
import { blogService, Blog } from "@/services/blogs";
import { format } from "date-fns";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/animate-ui/components/radix/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export default function Blogs() {
    const navigate = useNavigate();
    const { canEdit, canDelete } = useAuth();
    const [blogs, setBlogs] = useState<Blog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchBlogs();
    }, []);

    const fetchBlogs = async () => {
        try {
            setLoading(true);
            const data = await blogService.getAll();
            setBlogs(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch blogs");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this blog?")) return;

        try {
            await blogService.delete(id);
            toast.success("Blog deleted successfully");
            fetchBlogs();
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete blog");
        }
    };

    const filteredBlogs = blogs.filter((blog) =>
        blog.title.toLowerCase().includes(searchTerm.toLowerCase())
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
                        <span className="text-foreground font-medium">Blogs</span>
                    </div>

                    {/* Title Section */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-3xl font-black tracking-tight">Blogs</h1>
                            <p className="text-muted-foreground">Manage your blog posts here.</p>
                        </div>
                        {canEdit('voya_trail') && (
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Button
                                        className="gap-2 shadow-lg shadow-primary/20"
                                        onClick={() => navigate('/voya-trail/blogs/add')}
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add New Blog
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Create a new blog post</TooltipContent>
                            </Tooltip>
                        )}
                    </div>

                    {/* Controls Section */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                className="pl-10 bg-card border-border"
                                placeholder="Search blogs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Table Content */}
                    <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="font-bold">Title</TableHead>
                                    <TableHead className="font-bold">Author</TableHead>
                                    <TableHead className="font-bold">Category</TableHead>
                                    <TableHead className="font-bold">Status</TableHead>
                                    <TableHead className="font-bold">Date</TableHead>
                                    <TableHead className="text-right font-bold">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-20">
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                                <span className="text-muted-foreground">Loading blogs...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredBlogs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-20">
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <FileText className="h-10 w-10 opacity-20" />
                                                <span>No blogs found.</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredBlogs.map((blog) => (
                                        <TableRow key={blog._id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="font-bold max-w-[300px] truncate" title={blog.title}>
                                                {blog.title}
                                            </TableCell>
                                            <TableCell>{blog.author}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10">
                                                    {blog.category}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={blog.status === "published" ? "default" : "secondary"}>
                                                    {blog.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {blog.date ? format(new Date(blog.date), "MMM d, yyyy") : 'No date'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <Tooltip delayDuration={0}>
                                                        <TooltipTrigger asChild>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                        </TooltipTrigger>
                                                        <TooltipContent>More options</TooltipContent>
                                                    </Tooltip>
                                                    <DropdownMenuContent align="end" className="w-32">
                                                        <DropdownMenuItem onClick={() => navigate(`/voya-trail/blogs/edit/${blog._id}`)}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        {canDelete('voya_trail') && (
                                                            <DropdownMenuItem
                                                                className="text-destructive focus:text-destructive"
                                                                onClick={() => handleDelete(blog._id)}
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </main>
        </div>
    );
}
