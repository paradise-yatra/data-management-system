import React, { useEffect, useState, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { showToast } from '@/utils/notifications';
import {
    Loader2, Plus, Trash2, Save, ArrowLeft, ChevronRight,
    ExternalLink, ArrowUp, ArrowDown, Copy, GripVertical,
    Hotel, MapPin, Image as ImageIcon, Star, Activity,
    Info, Calendar, Utensils, Plane, Train, Building2,
    CheckCircle2, Clock, X, ChevronDown, Search
} from 'lucide-react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/animate-ui/components/radix/dropdown-menu';

import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImageUpload } from '@/components/ui/image-upload';
import { packagesAPI, tourCategoriesAPI, destinationsAPI } from '@/services/api';
import { MultiSelect } from '@/components/ui/multi-select';
import { useAuth } from '@/contexts/AuthContext';

// Validation Schema (same as before)
const tourPackageSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    slug: z.string().min(1, 'Slug is required'),
    category: z.string().min(1, 'Category is required'),
    location: z.array(z.string()).min(1, 'At least one location is required'),
    durationDays: z.coerce.number().min(1, 'Duration days must be at least 1'),
    durationNights: z.coerce.number().min(0, 'Duration nights must be at least 0'),
    minPeople: z.coerce.number().min(1).default(2),
    maxPeople: z.coerce.number().min(1).default(12),
    isActive: z.boolean().default(false),
    basePrice: z.coerce.number().min(0, 'Price must be positive'),
    priceUnit: z.enum(['per person', 'per couple']).default('per person'),
    overviewDescription: z.string().min(1, 'Overview is required'),
    guideType: z.string().default('Private Expert'),
    languages: z.array(z.string()).default(['English']),
    mainImage: z.string().min(1, 'Main image is required'),
    galleryImages: z.array(z.string()).max(10, 'Max 10 gallery images'),
    amenities: z.array(z.string()).default([]),
    highlights: z.array(z.string()).max(3, 'Max 3 highlights').default([]),
    itinerary: z.array(z.object({
        day: z.coerce.number(),
        title: z.string().min(1, 'Day title is required'),
        description: z.string().min(1, 'Day description is required'),
        experiences: z.array(z.string()),
        images: z.array(z.string()).max(3, 'Max 3 images per day'),
        stay: z.object({
            name: z.string().optional(),
            image: z.string().optional(),
            stars: z.coerce.number().optional(),
            location: z.string().optional(),
            distances: z.object({
                airport: z.string().optional(),
                railway: z.string().optional(),
                cityHeart: z.string().optional(),
            }).optional(),
            cuisine: z.string().optional(),
            facilities: z.array(z.string()).optional(),
        }).optional(),
    })),
    seo: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        keywords: z.string().optional(), // Comma separated string for input
        canonicalUrl: z.string().optional(),
    }).optional(),
}).refine((data) => {
    const total = data.highlights.reduce((acc, curr) => acc + curr.length, 0);
    return total <= 40;
}, {
    message: "Total characters in highlights cannot exceed 40",
    path: ["highlights"]
});

type TourPackageFormValues = z.infer<typeof tourPackageSchema>;

const AMENITIES_OPTIONS = ['Hotel', 'Car', 'Utensils', 'Ticket'];

export default function PackageForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { canEdit } = useAuth();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<{ _id: string; name: string; slug: string }[]>([]);
    const [destinations, setDestinations] = useState<{ _id: string; name: string }[]>([]);
    const [openDays, setOpenDays] = useState<string[]>([]);
    const isEditMode = !!id;
    const saveStatusRef = useRef<'draft' | 'published'>('draft');

    const form = useForm<TourPackageFormValues>({
        resolver: zodResolver(tourPackageSchema),
        defaultValues: {
            title: '',
            slug: '',
            category: '',
            location: [],
            durationDays: 1,
            durationNights: 0,
            minPeople: 2,
            maxPeople: 12,
            isActive: false,
            basePrice: 0,
            priceUnit: 'per person',
            overviewDescription: '',
            guideType: 'Private Expert',
            languages: ['English'],
            mainImage: '',
            galleryImages: [],
            amenities: [],
            highlights: [],
            itinerary: [],
            seo: {
                title: '',
                description: '',
                keywords: '',
                canonicalUrl: ''
            }
        },
    });

    const { fields: itineraryFields, append: appendDay, remove: removeDay, move: moveDay } = useFieldArray({
        control: form.control,
        name: 'itinerary',
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [categoriesData, destinationsData] = await Promise.all([
                    tourCategoriesAPI.getAll(),
                    destinationsAPI.getAll()
                ]);
                setCategories(categoriesData);
                setDestinations(destinationsData);
            } catch (error) {
                showToast.warning('Failed to load form data');
            }
        };
        fetchData();
    }, []);

    // Helper to join keywords array into comma-separated string
    const formatKeywords = (keywords: string[] | undefined) => {
        if (!keywords || !Array.isArray(keywords)) return '';
        return keywords.join(', ');
    };

    useEffect(() => {
        if (isEditMode) {
            const fetchPackage = async () => {
                try {
                    setLoading(true);
                    const data = await packagesAPI.getById(id!);
                    const formData = {
                        ...data,
                        category: (typeof data.category === 'object' && data.category !== null && '_id' in data.category) ? data.category._id : (data.category as string) || '',
                        location: (data as any).locations || (data.location ? data.location.split('•').map((s: string) => s.trim()).filter(Boolean) : []),
                        durationDays: data.duration?.days || data.durationDays || 1,
                        durationNights: data.duration?.nights || data.durationNights || 0,
                        basePrice: data.startingPrice || data.basePrice || 0,
                        overviewDescription: data.overview?.description || data.overviewDescription || '',
                        guideType: data.guideType || 'Private Expert',
                        languages: data.languages || ['English'],
                        itinerary: (data.itinerary || []).map((item: any) => ({
                            ...item,
                            day: item.dayNumber || item.day || 1,
                            stay: {
                                ...item.stay,
                                distances: item.stay?.distances || { airport: '', railway: '', cityHeart: '' },
                                facilities: item.stay?.facilities || [],
                            }
                        })),
                        amenities: data.amenityIds || data.amenities || [],
                        highlights: data.highlights || [],
                        priceUnit: (data.priceUnit as 'per person' | 'per couple') || 'per person',
                        seo: {
                            title: data.seo?.metaTitle || '',
                            description: data.seo?.metaDescription || '',
                            keywords: formatKeywords(data.seo?.metaKeywords),
                            canonicalUrl: data.seo?.canonicalUrl || ''
                        }
                    };
                    form.reset(formData);
                } catch (error) {
                    showToast.warning('Failed to load package');
                    navigate('/voya-trail/packages');
                } finally {
                    setLoading(false);
                }
            };
            fetchPackage();
        }
    }, [isEditMode, id, form, navigate]);

    const onSubmit = async (data: TourPackageFormValues) => {
        try {
            setLoading(true);
            const status = saveStatusRef.current;

            // Map frontend data to backend schema
            const { location, ...restData } = data;
            const backendData = {
                ...restData,
                status,
                isActive: status === 'published',
                duration: {
                    days: data.durationDays,
                    nights: data.durationNights
                },
                startingPrice: data.basePrice,
                overview: {
                    title: data.title,
                    description: data.overviewDescription
                },
                itinerary: data.itinerary.map(item => ({
                    ...item,
                    dayNumber: item.day
                })),
                amenityIds: data.amenities,
                locations: location,
                seo: {
                    metaTitle: data.seo?.title,
                    metaDescription: data.seo?.description,
                    metaKeywords: data.seo?.keywords ? data.seo.keywords.split(',').map(k => k.trim()).filter(Boolean) : [],
                    canonicalUrl: data.seo?.canonicalUrl
                }
            };

            console.log('Submitting package data:', backendData);
            if (isEditMode && id) {
                await packagesAPI.update(id, backendData);
                showToast.warning('Package updated successfully');
            } else {
                await packagesAPI.create(backendData);
                showToast.success('Package created successfully');
            }
            navigate('/voya-trail/packages');
        } catch (error: any) {
            console.error('Submission error:', error);
            showToast.error(error.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const duplicateDay = (index: number) => {
        const dayToDuplicate = form.getValues(`itinerary.${index}`);
        if (dayToDuplicate) {
            const newDay = {
                ...dayToDuplicate,
                day: itineraryFields.length + 1,
            };
            appendDay(newDay);
            showToast.success(`Day ${index + 1} duplicated`);
        }
    };

    const onError = (errors: any) => {
        console.error('Form validation errors:', errors);
        const firstError = Object.values(errors)[0] as any;
        if (firstError) {
            if (firstError.message) {
                showToast.warning(`Validation Error: ${firstError.message}`);
            } else if (typeof firstError === 'object') {
                // Handle nested errors like itinerary
                const subError = Object.values(firstError)[0] as any;
                if (subError && subError.message) {
                    showToast.warning(`Validation Error: ${subError.message}`);
                } else {
                    showToast.warning('Please check all required fields');
                }
            }
        }
    };

    return (
        <div className="flex h-screen w-full flex-row overflow-hidden bg-background text-foreground font-sans antialiased">
            <Sidebar project="voya-trail" />

            <main className="flex-1 flex flex-col h-full relative overflow-y-auto bg-background/50">
                <div className="p-8 max-w-5xl mx-auto w-full flex flex-col gap-8">
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Voya Trail</span>
                        <ChevronRight className="h-4 w-4" />
                        <span>Packages</span>
                        <ChevronRight className="h-4 w-4" />
                        <span className="text-foreground font-medium">{isEditMode ? 'Edit Package' : 'New Package'}</span>
                    </div>

                    {/* Title Section */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-3xl font-black tracking-tight">{isEditMode ? 'Edit Package' : 'New Package'}</h1>
                            <p className="text-muted-foreground">
                                {isEditMode ? 'Update the details of your tour package.' : 'Create a new tour package for your collection.'}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="outline" onClick={() => navigate('/voya-trail/packages')}>
                                Cancel
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button disabled={loading || !canEdit('voya_trail_package_form')} className="gap-2">
                                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                                        <Save className="h-4 w-4" />
                                        Save Package
                                        <ChevronDown className="h-4 w-4 ml-1 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={() => {
                                        saveStatusRef.current = 'draft';
                                        form.handleSubmit(onSubmit, onError)();
                                    }}>
                                        Save to Draft
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                        saveStatusRef.current = 'published';
                                        form.handleSubmit(onSubmit, onError)();
                                    }}>
                                        Save and Publish
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-8">
                            <Tabs defaultValue="basic" className="w-full">
                                <TabsList className="grid w-full grid-cols-4 bg-card border border-border p-1 rounded-lg">
                                    <TabsTrigger value="basic" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Basic Info</TabsTrigger>
                                    <TabsTrigger value="itinerary" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Itinerary</TabsTrigger>
                                    <TabsTrigger value="media" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Media</TabsTrigger>
                                    <TabsTrigger value="seo" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">SEO</TabsTrigger>
                                </TabsList>

                                <TabsContent value="basic" className="space-y-6 mt-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        <div className="lg:col-span-2 space-y-6">
                                            <Card className="border-border bg-card shadow-sm rounded-lg overflow-hidden">
                                                <CardHeader className="bg-muted/30 border-b border-border/50">
                                                    <CardTitle className="flex items-center gap-2">
                                                        <Info className="h-5 w-5 text-primary" />
                                                        General Details
                                                    </CardTitle>
                                                    <CardDescription>Core information about the tour package.</CardDescription>
                                                </CardHeader>
                                                <CardContent className="p-6 grid gap-6">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <FormField
                                                            control={form.control}
                                                            name="title"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="font-bold">Package Title</FormLabel>
                                                                    <FormControl>
                                                                        <Input
                                                                            placeholder="e.g. Golden Triangle Expedition"
                                                                            {...field}
                                                                            className="bg-background h-11 rounded-lg border-border/50 focus:border-primary"
                                                                            onChange={(e) => {
                                                                                field.onChange(e);
                                                                                const title = e.target.value;
                                                                                const slug = title
                                                                                    .toLowerCase()
                                                                                    .replace(/\s+/g, '-')
                                                                                    .replace(/[^a-z0-9-]/g, '');
                                                                                form.setValue('slug', slug, { shouldValidate: true });
                                                                            }}
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={form.control}
                                                            name="slug"
                                                            render={({ field }) => {
                                                                const categoryId = form.watch('category');
                                                                const selectedCategory = categories.find(c => c._id === categoryId);
                                                                const categorySlug = selectedCategory?.slug || 'category';

                                                                return (
                                                                    <FormItem>
                                                                        <FormLabel className="font-bold">URL Slug</FormLabel>
                                                                        <FormControl>
                                                                            <Input placeholder="golden-triangle-..." {...field} className="bg-background h-11 rounded-lg border-border/50 focus:border-primary" />
                                                                        </FormControl>
                                                                        <FormDescription className="text-[10px] font-mono bg-muted/30 p-2 rounded-lg border border-border/50 mt-2 flex items-center gap-2">
                                                                            <span className="text-muted-foreground">URL:</span>
                                                                            <a
                                                                                href={`https://voyatrail.com/${categorySlug}/${field.value}`}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="text-primary font-bold hover:underline flex items-center gap-1"
                                                                            >
                                                                                /{categorySlug}/{field.value || 'package-slug'}
                                                                                <ExternalLink className="h-3 w-3" />
                                                                            </a>
                                                                        </FormDescription>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                );
                                                            }}
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <FormField
                                                            control={form.control}
                                                            name="category"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="font-bold">Category</FormLabel>
                                                                    <Select
                                                                        onValueChange={field.onChange}
                                                                        value={field.value}
                                                                        key={field.value + (categories.length > 0 ? '-loaded' : '-loading')}
                                                                    >
                                                                        <FormControl>
                                                                            <SelectTrigger className="bg-background h-11 rounded-lg border-border/50">
                                                                                <SelectValue placeholder="Select a category" />
                                                                            </SelectTrigger>
                                                                        </FormControl>
                                                                        <SelectContent>
                                                                            {categories.map((cat) => (
                                                                                <SelectItem key={cat._id} value={cat._id}>
                                                                                    {cat.name}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={form.control}
                                                            name="location"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="font-bold">Locations</FormLabel>
                                                                    <FormControl>
                                                                        <MultiSelect
                                                                            options={destinations.map(d => ({ label: d.name, value: d.name }))}
                                                                            selected={field.value}
                                                                            onChange={field.onChange}
                                                                            placeholder="Select destinations..."
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>

                                                    <FormField
                                                        control={form.control}
                                                        name="overviewDescription"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="font-bold">Overview Description</FormLabel>
                                                                <FormControl>
                                                                    <Textarea
                                                                        placeholder="Provide a detailed overview of the tour package..."
                                                                        {...field}
                                                                        className="bg-background min-h-[120px] rounded-lg border-border/50 focus:border-primary"
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <FormField
                                                            control={form.control}
                                                            name="guideType"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="font-bold">Guide Type</FormLabel>
                                                                    <FormControl>
                                                                        <Input placeholder="e.g. Private Expert" {...field} className="bg-background h-11 rounded-lg border-border/50" />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={form.control}
                                                            name="languages"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="font-bold">Languages</FormLabel>
                                                                    <FormControl>
                                                                        <Input
                                                                            placeholder="e.g. English, Hindi, French"
                                                                            value={field.value?.join(', ')}
                                                                            onChange={(e) => field.onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                                                            className="bg-background h-11 rounded-lg border-border/50"
                                                                        />
                                                                    </FormControl>
                                                                    <FormDescription className="text-[10px]">Separate languages with commas.</FormDescription>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-1 gap-6">
                                                        <FormField
                                                            control={form.control}
                                                            name="highlights"
                                                            render={({ field }) => {
                                                                const totalChars = (field.value || []).reduce((acc: number, curr: string) => acc + curr.length, 0);
                                                                const maxChars = 40;
                                                                return (
                                                                    <FormItem>
                                                                        <div className="flex justify-between items-center mb-2">
                                                                            <FormLabel className="font-bold">Card Highlights (Max 3)</FormLabel>
                                                                            <span className={`text-[10px] font-medium ${totalChars > maxChars ? 'text-destructive' : 'text-muted-foreground'}`}>
                                                                                {totalChars} / {maxChars} characters
                                                                            </span>
                                                                        </div>
                                                                        <FormControl>
                                                                            <div className="space-y-4">
                                                                                <div className="flex flex-wrap gap-2 min-h-[44px] p-2 bg-muted/20 border border-border/50 rounded-lg">
                                                                                    {(field.value || []).map((hl: string, idx: number) => (
                                                                                        <Badge key={idx} variant="secondary" className="pl-3 pr-1 py-1 gap-1 bg-primary/5 text-primary border-primary/10 hover:bg-primary/10 transition-colors">
                                                                                            {hl}
                                                                                            <Button
                                                                                                type="button"
                                                                                                variant="ghost"
                                                                                                size="icon"
                                                                                                className="h-5 w-5 rounded-lg hover:bg-destructive hover:text-destructive-foreground"
                                                                                                onClick={() => {
                                                                                                    const newHls = [...field.value];
                                                                                                    newHls.splice(idx, 1);
                                                                                                    field.onChange(newHls);
                                                                                                }}
                                                                                            >
                                                                                                <X className="h-3 w-3" />
                                                                                            </Button>
                                                                                        </Badge>
                                                                                    ))}
                                                                                    {(!field.value || field.value.length === 0) && (
                                                                                        <span className="text-xs text-muted-foreground/50 py-1">No highlights added yet...</span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="relative">
                                                                                    <Input
                                                                                        placeholder={field.value?.length >= 3 ? "Maximum 3 reached" : "Type a highlight and press Enter..."}
                                                                                        disabled={field.value?.length >= 3}
                                                                                        className="bg-background h-11 rounded-lg border-border/50 pr-12"
                                                                                        onKeyDown={(e) => {
                                                                                            if (e.key === 'Enter') {
                                                                                                e.preventDefault();
                                                                                                const val = e.currentTarget.value.trim();
                                                                                                if (val) {
                                                                                                    if (totalChars + val.length > maxChars) {
                                                                                                        showToast.warning(`Cannot add. Total length would exceed ${maxChars} characters.`);
                                                                                                        return;
                                                                                                    }
                                                                                                    field.onChange([...(field.value || []), val]);
                                                                                                    e.currentTarget.value = '';
                                                                                                }
                                                                                            }
                                                                                        }}
                                                                                    />
                                                                                    <Button
                                                                                        type="button"
                                                                                        size="icon"
                                                                                        variant="ghost"
                                                                                        disabled={field.value?.length >= 3}
                                                                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 text-primary hover:bg-primary/10 rounded-lg"
                                                                                        onClick={(e) => {
                                                                                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                                                                            const val = input.value.trim();
                                                                                            if (val) {
                                                                                                if (totalChars + val.length > maxChars) {
                                                                                                    showToast.warning(`Cannot add. Total length would exceed ${maxChars} characters.`);
                                                                                                    return;
                                                                                                }
                                                                                                field.onChange([...(field.value || []), val]);
                                                                                                input.value = '';
                                                                                            }
                                                                                        }}
                                                                                    >
                                                                                        <Plus className="h-4 w-4" />
                                                                                    </Button>
                                                                                </div>
                                                                                <FormDescription className="text-[10px]">
                                                                                    These highlights appear on the package card. Max 3 items, 40 total characters.
                                                                                </FormDescription>
                                                                            </div>
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                );
                                                            }}
                                                        />
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card className="border-border bg-card shadow-sm rounded-2xl overflow-hidden">
                                                <CardHeader className="bg-muted/30 border-b border-border/50">
                                                    <CardTitle className="flex items-center gap-2">
                                                        <CheckCircle2 className="h-5 w-5 text-primary" />
                                                        Included Amenities
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="p-6">
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                                        {AMENITIES_OPTIONS.map((item) => (
                                                            <FormField
                                                                key={item}
                                                                control={form.control}
                                                                name="amenities"
                                                                render={({ field }) => {
                                                                    return (
                                                                        <FormItem
                                                                            key={item}
                                                                            className="flex flex-row items-center space-x-3 space-y-0 bg-muted/20 p-3 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors cursor-pointer"
                                                                        >
                                                                            <FormControl>
                                                                                <Checkbox
                                                                                    checked={field.value?.includes(item)}
                                                                                    onCheckedChange={(checked) => {
                                                                                        return checked
                                                                                            ? field.onChange([...field.value, item])
                                                                                            : field.onChange(
                                                                                                field.value?.filter(
                                                                                                    (value) => value !== item
                                                                                                )
                                                                                            )
                                                                                    }}
                                                                                />
                                                                            </FormControl>
                                                                            <FormLabel className="font-bold cursor-pointer">
                                                                                {item}
                                                                            </FormLabel>
                                                                        </FormItem>
                                                                    )
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>

                                        <div className="space-y-6">
                                            <Card className="border-border bg-card shadow-sm rounded-2xl overflow-hidden">
                                                <CardHeader className="bg-muted/30 border-b border-border/50">
                                                    <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
                                                        <Clock className="h-4 w-4 text-primary" />
                                                        Duration
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="p-6 grid grid-cols-2 gap-4">
                                                    <FormField
                                                        control={form.control}
                                                        name="durationDays"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs font-bold text-muted-foreground">Days</FormLabel>
                                                                <FormControl>
                                                                    <Input type="number" {...field} className="bg-background h-10 rounded-lg border-border/50" />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="durationNights"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs font-bold text-muted-foreground">Nights</FormLabel>
                                                                <FormControl>
                                                                    <Input type="number" {...field} className="bg-background h-10 rounded-lg border-border/50" />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </CardContent>
                                            </Card>

                                            <Card className="border-border bg-card shadow-sm rounded-2xl overflow-hidden">
                                                <CardHeader className="bg-muted/30 border-b border-border/50">
                                                    <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
                                                        <Building2 className="h-4 w-4 text-primary" />
                                                        Capacity
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="p-6 grid grid-cols-2 gap-4">
                                                    <FormField
                                                        control={form.control}
                                                        name="minPeople"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs font-bold text-muted-foreground">Min People</FormLabel>
                                                                <FormControl>
                                                                    <Input type="number" {...field} className="bg-background h-10 rounded-lg border-border/50" />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="maxPeople"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs font-bold text-muted-foreground">Max People</FormLabel>
                                                                <FormControl>
                                                                    <Input type="number" {...field} className="bg-background h-10 rounded-lg border-border/50" />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </CardContent>
                                            </Card>

                                            <Card className="border-border bg-card shadow-sm rounded-2xl overflow-hidden">
                                                <CardHeader className="bg-muted/30 border-b border-border/50">
                                                    <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
                                                        <Save className="h-4 w-4 text-primary" />
                                                        Pricing
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="p-6 space-y-4">
                                                    <FormField
                                                        control={form.control}
                                                        name="basePrice"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs font-bold text-muted-foreground">Base Price ($)</FormLabel>
                                                                <FormControl>
                                                                    <div className="relative">
                                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">$</span>
                                                                        <Input type="number" {...field} className="bg-background h-11 rounded-lg border-border/50 pl-8 text-lg font-black" />
                                                                    </div>
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="priceUnit"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs font-bold text-muted-foreground">Price Unit</FormLabel>
                                                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                                    <FormControl>
                                                                        <SelectTrigger className="bg-background h-10 rounded-lg border-border/50">
                                                                            <SelectValue placeholder="Select unit" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        <SelectItem value="per person">per person</SelectItem>
                                                                        <SelectItem value="per couple">per couple</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="itinerary" className="space-y-6 mt-6">
                                    <>
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-lg border border-border shadow-sm relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                                            <div>
                                                <h3 className="text-xl font-black flex items-center gap-2">
                                                    <Calendar className="h-5 w-5 text-primary" />
                                                    Itinerary Management
                                                </h3>
                                                <p className="text-sm text-muted-foreground">Plan the journey day by day with activities, experiences, and stays.</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {itineraryFields.length > 0 && (
                                                    <div className="flex items-center gap-2 mr-2 border-r border-border pr-4">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-[10px] font-bold uppercase tracking-wider h-9 px-3 rounded-lg hover:bg-primary/5"
                                                            onClick={() => setOpenDays(itineraryFields.map(f => f.id))}
                                                        >
                                                            Expand All
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-[10px] font-bold uppercase tracking-wider h-9 px-3 rounded-lg hover:bg-primary/5"
                                                            onClick={() => setOpenDays([])}
                                                        >
                                                            Collapse All
                                                        </Button>
                                                    </div>
                                                )}
                                                <Button
                                                    type="button"
                                                    onClick={() => {
                                                        const newDayNumber = itineraryFields.length + 1;
                                                        appendDay({
                                                            day: newDayNumber,
                                                            title: '',
                                                            description: '',
                                                            experiences: [],
                                                            images: [],
                                                            stay: {
                                                                name: '',
                                                                image: '',
                                                                stars: 5,
                                                                location: '',
                                                                distances: { airport: '', railway: '', cityHeart: '' },
                                                                cuisine: '',
                                                                facilities: []
                                                            }
                                                        });
                                                        // Auto-expand the new day
                                                        setTimeout(() => {
                                                            const lastField = itineraryFields[itineraryFields.length];
                                                            if (lastField) setOpenDays(prev => [...prev, lastField.id]);
                                                        }, 100);
                                                    }}
                                                    className="gap-2 shadow-lg shadow-primary/20 rounded-lg px-5"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                    Add Day {itineraryFields.length + 1}
                                                </Button>
                                            </div>
                                        </div>

                                        {itineraryFields.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-border rounded-lg bg-muted/10 text-center">
                                                <div className="bg-background p-6 rounded-full mb-6 shadow-xl border border-border/50">
                                                    <Calendar className="h-12 w-12 text-primary/40" />
                                                </div>
                                                <h4 className="text-xl font-bold mb-2">Your itinerary is empty</h4>
                                                <p className="text-muted-foreground max-w-sm mx-auto mb-8">
                                                    Create a memorable journey by adding daily activities, experiences, and accommodations.
                                                </p>
                                                <Button
                                                    type="button"
                                                    size="lg"
                                                    onClick={() => appendDay({
                                                        day: 1,
                                                        title: '',
                                                        description: '',
                                                        experiences: [],
                                                        images: [],
                                                        stay: {
                                                            name: '',
                                                            image: '',
                                                            stars: 5,
                                                            location: '',
                                                            distances: { airport: '', railway: '', cityHeart: '' },
                                                            cuisine: '',
                                                            facilities: []
                                                        }
                                                    })}
                                                    className="rounded-lg px-8"
                                                >
                                                    Start with Day 1
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="relative pl-10 space-y-6">
                                                {/* Timeline Vertical Line */}
                                                <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-primary/50 via-border to-primary/50" />

                                                <Accordion
                                                    type="multiple"
                                                    value={openDays}
                                                    onValueChange={setOpenDays}
                                                    className="space-y-6"
                                                >
                                                    {itineraryFields.map((field, index) => (
                                                        <AccordionItem
                                                            key={field.id}
                                                            value={field.id}
                                                            className="border border-border rounded-lg bg-card overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 px-0 relative"
                                                        >
                                                            <>
                                                                {/* Day Marker on Timeline */}
                                                                <div className="absolute -left-[31px] top-6 w-6 h-6 rounded-full bg-background border-4 border-primary z-10 shadow-sm flex items-center justify-center">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                                </div>

                                                                <div className="flex items-center px-6 py-4 bg-muted/20 border-b border-border/50">
                                                                    <div className="flex items-center gap-4 flex-1">
                                                                        <div className="bg-primary text-primary-foreground w-12 h-12 rounded-lg flex flex-col items-center justify-center font-black shadow-lg shadow-primary/20 shrink-0">
                                                                            <span className="text-[10px] uppercase leading-none opacity-80">Day</span>
                                                                            <span className="text-xl leading-none">{index + 1}</span>
                                                                        </div>
                                                                        <AccordionTrigger className="hover:no-underline py-0 flex-1 justify-start gap-4 group">
                                                                            <div className="flex flex-col items-start gap-1">
                                                                                <span className="font-black text-lg group-hover:text-primary transition-colors text-left truncate max-w-[400px]">
                                                                                    {form.watch(`itinerary.${index}.title`) || `Plan your day`}
                                                                                </span>
                                                                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                                                    <span className="flex items-center gap-1">
                                                                                        <Activity className="h-3 w-3" />
                                                                                        {form.watch(`itinerary.${index}.description`) ? 'Activities Planned' : 'No activities yet'}
                                                                                    </span>
                                                                                    {form.watch(`itinerary.${index}.stay.name`) && (
                                                                                        <span className="flex items-center gap-1 text-primary/80 font-medium">
                                                                                            <Hotel className="h-3 w-3" />
                                                                                            {form.watch(`itinerary.${index}.stay.name`)}
                                                                                        </span>
                                                                                    )}
                                                                                    {form.watch(`itinerary.${index}.experiences`)?.length > 0 && (
                                                                                        <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-primary/5 text-primary border-primary/10">
                                                                                            {form.watch(`itinerary.${index}.experiences`).length} Experiences
                                                                                        </Badge>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </AccordionTrigger>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 ml-4">
                                                                        <div className="flex items-center bg-background/50 rounded-lg border border-border/50 p-1">
                                                                            <Button
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-8 w-8 rounded-lg"
                                                                                disabled={index === 0}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    moveDay(index, index - 1);
                                                                                }}
                                                                                title="Move Up"
                                                                            >
                                                                                <ArrowUp className="h-4 w-4" />
                                                                            </Button>
                                                                            <Button
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-8 w-8 rounded-lg"
                                                                                disabled={index === itineraryFields.length - 1}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    moveDay(index, index + 1);
                                                                                }}
                                                                                title="Move Down"
                                                                            >
                                                                                <ArrowDown className="h-4 w-4" />
                                                                            </Button>
                                                                        </div>
                                                                        <div className="flex items-center bg-background/50 rounded-lg border border-border/50 p-1">
                                                                            <Button
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-8 w-8 rounded-lg text-primary hover:text-primary hover:bg-primary/10"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    duplicateDay(index);
                                                                                }}
                                                                                title="Duplicate Day"
                                                                            >
                                                                                <Copy className="h-4 w-4" />
                                                                            </Button>
                                                                            <Button
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    removeDay(index);
                                                                                }}
                                                                                title="Delete Day"
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <AccordionContent className="p-0">
                                                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border-t border-border/50">
                                                                        {/* Left Column: Activities & Experiences */}
                                                                        <div className="lg:col-span-7 p-8 space-y-8 border-r border-border/50">
                                                                            <div className="space-y-6">
                                                                                <div className="flex items-center justify-between">
                                                                                    <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-xs">
                                                                                        <Activity className="h-4 w-4" />
                                                                                        Day Activities
                                                                                    </div>
                                                                                </div>
                                                                                <div className="grid gap-5">
                                                                                    <FormField
                                                                                        control={form.control}
                                                                                        name={`itinerary.${index}.day`}
                                                                                        render={({ field }) => (
                                                                                            <input type="hidden" {...field} value={index + 1} />
                                                                                        )}
                                                                                    />
                                                                                    <FormField
                                                                                        control={form.control}
                                                                                        name={`itinerary.${index}.title`}
                                                                                        render={({ field }) => (
                                                                                            <FormItem>
                                                                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Day Title</FormLabel>
                                                                                                <FormControl>
                                                                                                    <Input placeholder="e.g. Arrive Delhi & Sightseeing" {...field} className="bg-background border-border/50 h-12 rounded-xl text-base font-medium" />
                                                                                                </FormControl>
                                                                                                <FormMessage />
                                                                                            </FormItem>
                                                                                        )}
                                                                                    />
                                                                                    <FormField
                                                                                        control={form.control}
                                                                                        name={`itinerary.${index}.description`}
                                                                                        render={({ field }) => (
                                                                                            <FormItem>
                                                                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Activities Description</FormLabel>
                                                                                                <FormControl>
                                                                                                    <Textarea
                                                                                                        placeholder="Describe what happens on this day..."
                                                                                                        {...field}
                                                                                                        className="bg-background border-border/50 min-h-[150px] rounded-xl resize-none p-4 leading-relaxed"
                                                                                                    />
                                                                                                </FormControl>
                                                                                                <FormMessage />
                                                                                            </FormItem>
                                                                                        )}
                                                                                    />
                                                                                </div>
                                                                            </div>

                                                                            <div className="space-y-4">
                                                                                <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-xs">
                                                                                    <CheckCircle2 className="h-4 w-4" />
                                                                                    Key Experiences
                                                                                </div>
                                                                                <FormField
                                                                                    control={form.control}
                                                                                    name={`itinerary.${index}.experiences`}
                                                                                    render={({ field }) => (
                                                                                        <FormItem>
                                                                                            <FormControl>
                                                                                                <div className="space-y-3">
                                                                                                    <div className="flex flex-wrap gap-2">
                                                                                                        {field.value?.map((exp: string, expIndex: number) => (
                                                                                                            <Badge
                                                                                                                key={expIndex}
                                                                                                                variant="secondary"
                                                                                                                className="pl-3 pr-1 py-1 gap-1 bg-primary/5 text-primary border-primary/10 hover:bg-primary/10 transition-colors rounded-lg group"
                                                                                                            >
                                                                                                                <span className="text-xs font-medium">{exp}</span>
                                                                                                                <Button
                                                                                                                    type="button"
                                                                                                                    variant="ghost"
                                                                                                                    size="icon"
                                                                                                                    className="h-5 w-5 rounded-lg hover:bg-destructive hover:text-destructive-foreground transition-colors"
                                                                                                                    onClick={() => {
                                                                                                                        const newExps = [...field.value];
                                                                                                                        newExps.splice(expIndex, 1);
                                                                                                                        field.onChange(newExps);
                                                                                                                    }}
                                                                                                                >
                                                                                                                    <X className="h-3 w-3" />
                                                                                                                </Button>
                                                                                                            </Badge>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                    <div className="relative">
                                                                                                        <Input
                                                                                                            placeholder="Type an experience and press Enter..."
                                                                                                            className="bg-background border-border/50 h-11 rounded-xl pr-12 focus:border-primary transition-all"
                                                                                                            onKeyDown={(e) => {
                                                                                                                if (e.key === 'Enter') {
                                                                                                                    e.preventDefault();
                                                                                                                    const val = e.currentTarget.value.trim();
                                                                                                                    if (val) {
                                                                                                                        field.onChange([...(field.value || []), val]);
                                                                                                                        e.currentTarget.value = '';
                                                                                                                    }
                                                                                                                }
                                                                                                            }}
                                                                                                        />
                                                                                                        <Button
                                                                                                            type="button"
                                                                                                            size="icon"
                                                                                                            variant="ghost"
                                                                                                            className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 text-primary hover:bg-primary/10 rounded-lg"
                                                                                                            onClick={(e) => {
                                                                                                                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                                                                                                const val = input.value.trim();
                                                                                                                if (val) {
                                                                                                                    field.onChange([...(field.value || []), val]);
                                                                                                                    input.value = '';
                                                                                                                }
                                                                                                            }}
                                                                                                        >
                                                                                                            <Plus className="h-4 w-4" />
                                                                                                        </Button>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </FormControl>
                                                                                            <FormDescription className="text-[10px] text-muted-foreground mt-1">
                                                                                                Add key highlights for this day. Press Enter or click (+) to add.
                                                                                            </FormDescription>
                                                                                            <FormMessage />
                                                                                        </FormItem>
                                                                                    )}
                                                                                />

                                                                                <div className="space-y-4">
                                                                                    <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-xs">
                                                                                        <ImageIcon className="h-4 w-4" />
                                                                                        Day Gallery
                                                                                    </div>
                                                                                    <FormField
                                                                                        control={form.control}
                                                                                        name={`itinerary.${index}.images`}
                                                                                        render={({ field }) => (
                                                                                            <div className="bg-muted/20 p-4 rounded-2xl border border-dashed border-border/50">
                                                                                                <ImageUpload
                                                                                                    value={field.value}
                                                                                                    onChange={field.onChange}
                                                                                                    maxFiles={3}
                                                                                                />
                                                                                            </div>
                                                                                        )}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Right Column: Accommodation */}
                                                                        <div className="lg:col-span-5 bg-muted/10 p-8 space-y-6">
                                                                            <div className="flex justify-between items-center">
                                                                                <h4 className="font-black flex items-center gap-2 text-sm uppercase tracking-wider">
                                                                                    <Hotel className="h-4 w-4 text-primary" />
                                                                                    Stay Details
                                                                                </h4>
                                                                                {index > 0 && (
                                                                                    <Button
                                                                                        type="button"
                                                                                        variant="outline"
                                                                                        size="sm"
                                                                                        onClick={() => {
                                                                                            const prevStay = form.getValues(`itinerary.${index - 1}.stay`);
                                                                                            if (prevStay) {
                                                                                                form.setValue(`itinerary.${index}.stay`, {
                                                                                                    ...prevStay,
                                                                                                    distances: { ...prevStay.distances },
                                                                                                    facilities: [...(prevStay.facilities || [])]
                                                                                                });
                                                                                                showToast.success('Stay details copied from previous day');
                                                                                            }
                                                                                        }}
                                                                                        className="h-7 text-[10px] font-bold uppercase tracking-wider px-2"
                                                                                    >
                                                                                        Copy Previous Stay
                                                                                    </Button>
                                                                                )}
                                                                            </div>

                                                                            <div className="space-y-5">
                                                                                <FormField
                                                                                    control={form.control}
                                                                                    name={`itinerary.${index}.stay.name`}
                                                                                    render={({ field }) => (
                                                                                        <FormItem>
                                                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Hotel Name</FormLabel>
                                                                                            <FormControl>
                                                                                                <Input placeholder="e.g. The Oberoi" {...field} className="bg-background border-border/50 h-11 rounded-xl font-medium" />
                                                                                            </FormControl>
                                                                                            <FormMessage />
                                                                                        </FormItem>
                                                                                    )}
                                                                                />
                                                                                <FormField
                                                                                    control={form.control}
                                                                                    name={`itinerary.${index}.stay.location`}
                                                                                    render={({ field }) => (
                                                                                        <FormItem>
                                                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Location</FormLabel>
                                                                                            <FormControl>
                                                                                                <div className="relative">
                                                                                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50" />
                                                                                                    <Input placeholder="e.g. New Delhi" {...field} className="bg-background border-border/50 h-11 rounded-xl pl-10" />
                                                                                                </div>
                                                                                            </FormControl>
                                                                                            <FormMessage />
                                                                                        </FormItem>
                                                                                    )}
                                                                                />

                                                                                <div className="grid grid-cols-2 gap-4">
                                                                                    <FormField
                                                                                        control={form.control}
                                                                                        name={`itinerary.${index}.stay.stars`}
                                                                                        render={({ field }) => (
                                                                                            <FormItem>
                                                                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Stars</FormLabel>
                                                                                                <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                                                                                                    <FormControl>
                                                                                                        <SelectTrigger className="bg-background border-border/50 h-11 rounded-xl">
                                                                                                            <SelectValue placeholder="Stars" />
                                                                                                        </SelectTrigger>
                                                                                                    </FormControl>
                                                                                                    <SelectContent>
                                                                                                        {[1, 2, 3, 4, 5].map((s) => (
                                                                                                            <SelectItem key={s} value={s.toString()}>
                                                                                                                <div className="flex items-center gap-1">
                                                                                                                    {s} <Star className="h-3 w-3 fill-primary text-primary" />
                                                                                                                </div>
                                                                                                            </SelectItem>
                                                                                                        ))}
                                                                                                    </SelectContent>
                                                                                                </Select>
                                                                                                <FormMessage />
                                                                                            </FormItem>
                                                                                        )}
                                                                                    />
                                                                                    <FormField
                                                                                        control={form.control}
                                                                                        name={`itinerary.${index}.stay.cuisine`}
                                                                                        render={({ field }) => (
                                                                                            <FormItem>
                                                                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Cuisine</FormLabel>
                                                                                                <FormControl>
                                                                                                    <div className="relative">
                                                                                                        <Utensils className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50" />
                                                                                                        <Input placeholder="Indian..." {...field} className="bg-background border-border/50 h-11 rounded-xl pl-10" />
                                                                                                    </div>
                                                                                                </FormControl>
                                                                                                <FormMessage />
                                                                                            </FormItem>
                                                                                        )}
                                                                                    />
                                                                                </div>

                                                                                <FormField
                                                                                    control={form.control}
                                                                                    name={`itinerary.${index}.stay.facilities`}
                                                                                    render={({ field }) => (
                                                                                        <FormItem>
                                                                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Facilities</FormLabel>
                                                                                            <FormControl>
                                                                                                <Input
                                                                                                    placeholder="WiFi, Pool, Spa..."
                                                                                                    value={field.value?.join(', ')}
                                                                                                    onChange={(e) => field.onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                                                                                    className="bg-background border-border/50 h-11 rounded-xl"
                                                                                                />
                                                                                            </FormControl>
                                                                                            <FormMessage />
                                                                                        </FormItem>
                                                                                    )}
                                                                                />

                                                                                <div className="pt-2 space-y-4">
                                                                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                                                                                        <div className="h-px flex-1 bg-border/50" />
                                                                                        Distances
                                                                                        <div className="h-px flex-1 bg-border/50" />
                                                                                    </FormLabel>
                                                                                    <div className="grid grid-cols-1 gap-3">
                                                                                        <FormField
                                                                                            control={form.control}
                                                                                            name={`itinerary.${index}.stay.distances.airport`}
                                                                                            render={({ field }) => (
                                                                                                <div className="flex items-center gap-3 bg-background p-2.5 rounded-xl border border-border/50 shadow-sm">
                                                                                                    <div className="bg-primary/5 p-1.5 rounded-lg">
                                                                                                        <Plane className="h-3.5 w-3.5 text-primary" />
                                                                                                    </div>
                                                                                                    <input {...field} placeholder="Distance to Airport" className="bg-transparent text-xs outline-none w-full font-medium" />
                                                                                                </div>
                                                                                            )}
                                                                                        />
                                                                                        <FormField
                                                                                            control={form.control}
                                                                                            name={`itinerary.${index}.stay.distances.railway`}
                                                                                            render={({ field }) => (
                                                                                                <div className="flex items-center gap-3 bg-background p-2.5 rounded-xl border border-border/50 shadow-sm">
                                                                                                    <div className="bg-primary/5 p-1.5 rounded-lg">
                                                                                                        <Train className="h-3.5 w-3.5 text-primary" />
                                                                                                    </div>
                                                                                                    <input {...field} placeholder="Distance to Railway" className="bg-transparent text-xs outline-none w-full font-medium" />
                                                                                                </div>
                                                                                            )}
                                                                                        />
                                                                                        <FormField
                                                                                            control={form.control}
                                                                                            name={`itinerary.${index}.stay.distances.cityHeart`}
                                                                                            render={({ field }) => (
                                                                                                <div className="flex items-center gap-3 bg-background p-2.5 rounded-xl border border-border/50 shadow-sm">
                                                                                                    <div className="bg-primary/5 p-1.5 rounded-lg">
                                                                                                        <Building2 className="h-3.5 w-3.5 text-primary" />
                                                                                                    </div>
                                                                                                    <input {...field} placeholder="Distance to City Center" className="bg-transparent text-xs outline-none w-full font-medium" />
                                                                                                </div>
                                                                                            )}
                                                                                        />
                                                                                    </div>
                                                                                </div>

                                                                                <div className="pt-4 space-y-3">
                                                                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Hotel Image</FormLabel>
                                                                                    <FormField
                                                                                        control={form.control}
                                                                                        name={`itinerary.${index}.stay.image`}
                                                                                        render={({ field }) => (
                                                                                            <div className="bg-background p-3 rounded-2xl border border-border/50 shadow-sm">
                                                                                                <ImageUpload
                                                                                                    value={field.value ? [field.value] : []}
                                                                                                    onChange={(urls) => field.onChange(urls[0] || '')}
                                                                                                    maxFiles={1}
                                                                                                />
                                                                                            </div>
                                                                                        )}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </AccordionContent>
                                                            </>
                                                        </AccordionItem>
                                                    ))}
                                                </Accordion>

                                                <div className="flex justify-center pt-4">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => {
                                                            const newDayNumber = itineraryFields.length + 1;
                                                            appendDay({
                                                                day: newDayNumber,
                                                                title: '',
                                                                description: '',
                                                                experiences: [],
                                                                images: [],
                                                                stay: {
                                                                    name: '',
                                                                    image: '',
                                                                    stars: 5,
                                                                    location: '',
                                                                    distances: { airport: '', railway: '', cityHeart: '' },
                                                                    cuisine: '',
                                                                    facilities: []
                                                                }
                                                            });
                                                            setTimeout(() => {
                                                                const lastField = itineraryFields[itineraryFields.length];
                                                                if (lastField) setOpenDays(prev => [...prev, lastField.id]);
                                                            }, 100);
                                                        }}
                                                        className="gap-2 border-dashed border-2 h-16 px-10 rounded-2xl hover:bg-primary/5 hover:border-primary hover:text-primary transition-all group"
                                                    >
                                                        <Plus className="h-5 w-5 group-hover:scale-125 transition-transform" />
                                                        Add Day {itineraryFields.length + 1}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                </TabsContent>

                                <TabsContent value="media" className="space-y-4 mt-6">
                                    <Card className="border-border bg-card">
                                        <CardHeader>
                                            <CardTitle>Package Media</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            <div className="space-y-2">
                                                <FormLabel>Main Cover Image</FormLabel>
                                                <FormField
                                                    control={form.control}
                                                    name="mainImage"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <ImageUpload
                                                                value={field.value ? [field.value] : []}
                                                                onChange={(urls) => field.onChange(urls[0] || '')}
                                                                maxFiles={1}
                                                            />
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <FormLabel>Gallery Images (Max 10)</FormLabel>
                                                <FormField
                                                    control={form.control}
                                                    name="galleryImages"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <ImageUpload
                                                                value={field.value}
                                                                onChange={field.onChange}
                                                                maxFiles={10}
                                                            />
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="seo" className="space-y-6 mt-6">
                                    <Card className="border-border bg-card shadow-sm rounded-lg overflow-hidden">
                                        <CardHeader className="bg-muted/30 border-b border-border/50">
                                            <CardTitle className="flex items-center gap-2">
                                                <Search className="h-5 w-5 text-primary" />
                                                Search Engine Optimization
                                            </CardTitle>
                                            <CardDescription>Manage how this package appears in search engine results.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-6 grid gap-6">
                                            <FormField
                                                control={form.control}
                                                name="seo.title"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="font-bold">Meta Title</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="SEO Title" {...field} className="bg-background h-11 rounded-lg border-border/50" />
                                                        </FormControl>
                                                        <FormDescription className="text-xs">
                                                            Optimal length: 50-60 characters.
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="seo.description"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="font-bold">Meta Description</FormLabel>
                                                        <FormControl>
                                                            <Textarea
                                                                placeholder="Brief description for search results..."
                                                                {...field}
                                                                className="bg-background min-h-[100px] rounded-lg border-border/50"
                                                            />
                                                        </FormControl>
                                                        <FormDescription className="text-xs">
                                                            Optimal length: 150-160 characters.
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="seo.keywords"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="font-bold">Keywords</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="luxury travel, india tour, golden triangle..." {...field} className="bg-background h-11 rounded-lg border-border/50" />
                                                        </FormControl>
                                                        <FormDescription className="text-xs">
                                                            Separate keywords with commas.
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="seo.canonicalUrl"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="font-bold">Canonical URL</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="https://voyatrail.com/..." {...field} className="bg-background h-11 rounded-lg border-border/50" />
                                                        </FormControl>
                                                        <FormDescription className="text-xs">
                                                            The authoritative URL for this page (optional).
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </Tabs>
                        </form>
                    </Form>
                </div>
            </main >
        </div >
    );
}


