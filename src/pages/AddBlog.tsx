import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ChevronLeft,
    Loader2,
    Image as ImageIcon,
    Settings,
    Globe,
    Plus,
    X,
    Eye,
    Save,
    Send,
} from "lucide-react";
import { toast } from "sonner";
import { blogService } from "@/services/blogs";
import LexicalEditor from "@/components/LexicalEditor";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary";

const formSchema = z.object({
    title: z.string().min(1, "Title is required"),
    slug: z.string().min(1, "Slug is required"),
    image: z.string().url("Must be a valid URL").or(z.string().length(0)),
    author: z.string().min(1, "Author is required"),
    category: z.string().min(1, "Category is required"),
    readTime: z.string().min(1, "Read time is required"),
    tags: z.string().optional(),
    content: z.string().min(1, "Content is required"),
    status: z.enum(["draft", "published"]),
    isFeatured: z.boolean().default(false),
    excerpt: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function AddBlog() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [activePanel, setActivePanel] = useState<"settings" | "seo" | null>("settings");
    const saveStatusRef = useRef<"draft" | "published">("draft");

    const authors = ["Admin", "John Doe", "Jane Smith"];
    const categories = ["General", "Travel", "Tips", "Guides"];

    const {
        register,
        handleSubmit,
        control,
        setValue,
        watch,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            slug: "",
            image: "",
            author: user?.name || "Admin",
            category: "General",
            readTime: "5 min read",
            tags: "",
            content: "",
            status: "draft",
            isFeatured: false,
            excerpt: "",
        },
    });

    const titleValue = watch("title");

    useEffect(() => {
        if (titleValue) {
            const slug = titleValue
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)+/g, "");
            setValue("slug", slug);
        }
    }, [titleValue, setValue]);

    const onSubmit = async (data: FormData) => {
        try {
            setSaving(true);
            const status = saveStatusRef.current;
            const tagsArray = data.tags
                ? data.tags
                    .split(",")
                    .map((t) => t.trim())
                    .filter((t) => t)
                : [];

            const blogPayload: any = {
                ...data,
                status,
                tags: tagsArray,
                date: new Date().toISOString(),
            };

            await blogService.create(blogPayload);
            toast.success(
                `Blog ${status === "published" ? "published" : "saved as draft"} successfully`
            );
            navigate("/voya-trail/blogs");
        } catch (error) {
            console.error(error);
            toast.error("Failed to save blog");
        } finally {
            setSaving(false);
        }
    };

    const navIcons = [
        { id: "settings", icon: <Settings className="h-5 w-5" />, label: "Settings" },
        { id: "seo", icon: <Globe className="h-5 w-5" />, label: "SEO" },
    ];

    return (
        <div className="flex h-screen w-full bg-background text-foreground">
            {/* Left Icon Bar */}
            <aside className="w-14 shrink-0 border-r border-border bg-card flex flex-col items-center py-4 gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/voya-trail/blogs")}
                    className="mb-4"
                >
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                {navIcons.map((item) => (
                    <button
                        key={item.id}
                        onClick={() =>
                            setActivePanel(activePanel === item.id ? null : (item.id as any))
                        }
                        className={cn(
                            "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors w-full",
                            activePanel === item.id
                                ? "bg-accent text-accent-foreground"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                    >
                        {item.icon}
                        <span className="text-[9px] font-medium uppercase tracking-tight">
                            {item.label}
                        </span>
                    </button>
                ))}
            </aside>

            {/* Settings Side Panel */}
            <aside
                className={cn(
                    "border-r border-border bg-card transition-all duration-300 overflow-hidden flex flex-col",
                    activePanel ? "w-80" : "w-0"
                )}
            >
                <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                    <h2 className="font-semibold capitalize">{activePanel} Settings</h2>
                    <Button variant="ghost" size="icon" onClick={() => setActivePanel(null)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <ScrollArea className="flex-1 p-4">
                    {activePanel === "settings" && (
                        <div className="space-y-6">
                            {/* Featured Toggle */}
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Featured Post</Label>
                                <Controller
                                    name="isFeatured"
                                    control={control}
                                    render={({ field }) => (
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    )}
                                />
                            </div>

                            {/* Featured Image */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Featured Image</Label>
                                <div
                                    className="aspect-video bg-muted border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
                                    onClick={() => { }}
                                >
                                    {watch("image") ? (
                                        <img
                                            src={optimizeCloudinaryUrl(watch("image") || "", { width: 400 })}
                                            className="w-full h-full object-cover rounded-lg"
                                            alt="Featured"
                                        />
                                    ) : (
                                        <>
                                            <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                                            <span className="text-xs text-muted-foreground">
                                                Click to upload
                                            </span>
                                        </>
                                    )}
                                </div>
                                <Input
                                    {...register("image")}
                                    placeholder="Or paste image URL"
                                    className="text-sm"
                                />
                            </div>

                            {/* URL Slug */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">URL Slug</Label>
                                <Input {...register("slug")} className="text-sm" />
                            </div>

                            {/* Author */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Author</Label>
                                <Controller
                                    name="author"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {authors.map((a) => (
                                                    <SelectItem key={a} value={a}>
                                                        {a}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>

                            {/* Category */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Category</Label>
                                <Controller
                                    name="category"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories.map((c) => (
                                                    <SelectItem key={c} value={c}>
                                                        {c}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>

                            {/* Read Time */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Read Time</Label>
                                <Input {...register("readTime")} className="text-sm" />
                            </div>

                            {/* Tags */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Tags</Label>
                                <Input
                                    {...register("tags")}
                                    placeholder="Comma separated"
                                    className="text-sm"
                                />
                            </div>

                            {/* Excerpt */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Excerpt</Label>
                                <Textarea
                                    {...register("excerpt")}
                                    placeholder="Short description..."
                                    className="text-sm min-h-[100px] resize-none"
                                />
                            </div>
                        </div>
                    )}

                    {activePanel === "seo" && (
                        <div className="text-muted-foreground text-sm">
                            <p className="mb-4">SEO settings coming soon.</p>
                            <p>This will include:</p>
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>Meta title</li>
                                <li>Meta description</li>
                                <li>Social preview</li>
                                <li>Open Graph tags</li>
                            </ul>
                        </div>
                    )}
                </ScrollArea>
            </aside>

            {/* Main Editor Area */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-14 px-6 border-b border-border bg-card flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(-1)}
                            className="text-muted-foreground"
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Back
                        </Button>
                        <span className="text-xs text-muted-foreground">
                            {saving ? "Saving..." : "All changes saved"}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                saveStatusRef.current = "draft";
                                handleSubmit(onSubmit)();
                            }}
                            disabled={saving}
                        >
                            <Save className="h-4 w-4 mr-2" />
                            Save Draft
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => {
                                saveStatusRef.current = "published";
                                handleSubmit(onSubmit)();
                            }}
                            disabled={saving}
                        >
                            {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <Send className="h-4 w-4 mr-2" />
                                    Publish
                                </>
                            )}
                        </Button>
                    </div>
                </header>

                {/* Content */}
                <ScrollArea className="flex-1">
                    <div className="max-w-4xl mx-auto p-8">
                        {/* Title */}
                        <Input
                            {...register("title")}
                            placeholder="Enter your title..."
                            className="text-4xl font-bold bg-transparent border-none focus-visible:ring-0 p-0 h-auto mb-6 placeholder:text-muted-foreground/40"
                        />

                        {/* Editor */}
                        <Controller
                            name="content"
                            control={control}
                            render={({ field }) => (
                                <LexicalEditor
                                    onChange={(jsonString) => {
                                        field.onChange(jsonString);
                                    }}
                                />
                            )}
                        />
                    </div>
                </ScrollArea>
            </main>
        </div>
    );
}
