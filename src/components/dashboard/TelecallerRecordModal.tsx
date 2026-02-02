import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/animate-ui/components/radix/dropdown-menu';
import { ChevronDown, Calendar as CalendarIcon } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { parseISO, formatISO } from 'date-fns';
import { TelecallerLeadRecord } from '@/types/telecaller';

const formSchema = z.object({
    leadName: z.string().optional(),
    phone: z.string().min(1, 'Phone number is required').min(10, 'Phone number requires at least 10 digits'),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    destination: z.string().optional(),
    duration: z.string().optional(),
    travelDate: z.string().optional(),
    budget: z.preprocess((val) => (typeof val === 'string' && val.trim() === '') || val === null || val === undefined ? undefined : Number(val), z.number().optional()),
    paxCount: z.preprocess((val) => (typeof val === 'string' && val.trim() === '') || val === null || val === undefined ? undefined : Number(val), z.number().optional()),
    status: z.enum(['Hot', 'Cold', 'Not Reachable', 'Not Interested', 'Follow-up'], {
        required_error: 'Please select a status',
    }),
    nextFollowUp: z.string().optional(),
    remarks: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface TelecallerRecordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<TelecallerLeadRecord, '_id' | 'uniqueId' | 'dateAdded'>) => void;
    editingRecord?: TelecallerLeadRecord | null;
    destinations: { _id: string, name: string }[];
}

export function TelecallerRecordModal({
    isOpen,
    onClose,
    onSave,
    editingRecord,
    destinations,
}: TelecallerRecordModalProps) {
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        control,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            leadName: '',
            phone: '',
            email: '',
            destination: '',
            duration: '',
            travelDate: '',
            budget: undefined,
            paxCount: undefined,
            status: 'Hot',
            nextFollowUp: '',
            remarks: '',
        },
    });

    const watchedStatus = watch('status');
    const watchedDestination = watch('destination');

    useEffect(() => {
        if (isOpen) {
            setSaveSuccess(false);
            setSaveError(null);
            if (editingRecord) {
                reset({
                    leadName: editingRecord.leadName,
                    phone: editingRecord.phone,
                    email: editingRecord.email || '',
                    destination: editingRecord.destination,
                    duration: editingRecord.duration || '',
                    travelDate: editingRecord.travelDate || '',
                    budget: editingRecord.budget || undefined,
                    paxCount: editingRecord.paxCount || undefined,
                    status: editingRecord.status,
                    nextFollowUp: editingRecord.nextFollowUp || '',
                    remarks: editingRecord.remarks || '',
                });
            } else {
                reset({
                    leadName: '',
                    phone: '',
                    email: '',
                    destination: '',
                    duration: '',
                    travelDate: '',
                    budget: undefined,
                    paxCount: undefined,
                    status: 'Hot',
                    nextFollowUp: '',
                    remarks: '',
                });
            }
        }
    }, [editingRecord, reset, isOpen]);

    const onSubmit = async (data: FormData) => {
        setSaveError(null);
        setSaveSuccess(false);
        try {
            await onSave(data as Omit<TelecallerLeadRecord, '_id' | 'uniqueId' | 'dateAdded'>);
            setSaveSuccess(true);
        } catch (error: any) {
            setSaveSuccess(false);
            setSaveError(error.message || 'An unexpected error occurred');
        }
    };

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    if (typeof window === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative z-[101] w-full max-w-2xl mx-4 rounded-lg border border-border bg-background p-6 shadow-xl max-h-[90vh] overflow-y-auto"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-foreground">
                                {editingRecord ? 'Edit Travel Lead' : 'Add New Travel Lead'}
                            </h2>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-foreground">Lead Name</Label>
                                    <Input {...register('leadName')} placeholder="John Doe" className="border-border bg-background" />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-foreground">Phone Number</Label>
                                    <Input {...register('phone')} placeholder="9876543210" className="border-border bg-background" />
                                    {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-foreground">Email</Label>
                                    <Input {...register('email')} type="email" placeholder="john@example.com" className="border-border bg-background" />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-foreground">Destination</Label>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="w-full gap-2 justify-between border-border font-normal">
                                                {watchedDestination || 'Select destination'}
                                                <ChevronDown className="h-4 w-4 opacity-50" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="min-w-[300px]">
                                            {destinations.map((d) => (
                                                <DropdownMenuItem key={d._id} onClick={() => setValue('destination', d.name)}>
                                                    {d.name}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <Label className="text-foreground">Duration (Nights)</Label>
                                        <div className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full border border-primary/20">
                                            {Math.max(0, parseInt(watch('duration')) || 0) + 1} Days
                                        </div>
                                    </div>
                                    <Input
                                        type="number"
                                        placeholder="Number of nights"
                                        defaultValue={parseInt(watch('duration')) || 0}
                                        onChange={(e) => {
                                            const nights = parseInt(e.target.value) || 0;
                                            setValue('duration', `${nights} Nights / ${nights + 1} Days`, { shouldDirty: true });
                                        }}
                                        className="bg-background h-10 rounded-lg border-border/50"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-foreground">Travel Date</Label>
                                    <Controller
                                        control={control}
                                        name="travelDate"
                                        render={({ field }) => (
                                            <DatePicker
                                                date={field.value ? new Date(field.value) : undefined}
                                                setDate={(date) => field.onChange(date ? formatISO(date, { representation: 'date' }) : '')}
                                                placeholder="Select date"
                                            />
                                        )}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-foreground">Budget</Label>
                                    <Input {...register('budget')} type="number" placeholder="Enter budget" className="border-border bg-background" />
                                    {errors.budget && <p className="text-xs text-destructive">{errors.budget.message}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-foreground">Pax Count</Label>
                                    <Input {...register('paxCount')} type="number" placeholder="Number of guests" className="border-border bg-background" />
                                    {errors.paxCount && <p className="text-xs text-destructive">{errors.paxCount.message}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-foreground">Status</Label>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="w-full gap-2 justify-between border-border font-normal">
                                                {watchedStatus || 'Select status'}
                                                <ChevronDown className="h-4 w-4 opacity-50" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="min-w-[300px]">
                                            {['Hot', 'Cold', 'Not Reachable', 'Not Interested', 'Follow-up'].map((s) => (
                                                <DropdownMenuItem key={s} onClick={() => setValue('status', s as any, { shouldValidate: true })}>
                                                    {s}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    {errors.status && <p className="text-xs text-destructive mt-1">{errors.status.message}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-foreground">Next Follow-up</Label>
                                    <Controller
                                        control={control}
                                        name="nextFollowUp"
                                        render={({ field }) => (
                                            <DatePicker
                                                date={field.value ? new Date(field.value) : undefined}
                                                setDate={(date) => field.onChange(date ? formatISO(date) : '')}
                                                placeholder="Select next follow-up"
                                            />
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-foreground">Remarks</Label>
                                <Textarea {...register('remarks')} placeholder="Conversation details..." rows={3} className="border-border bg-background resize-none" />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="outline" onClick={onClose} className="border-border">Cancel</Button>
                                <Button
                                    type="submit"
                                    className="bg-foreground text-background hover:bg-foreground/90 min-w-[100px]"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                                            Saving...
                                        </div>
                                    ) : (
                                        editingRecord ? 'Save Changes' : 'Add Lead'
                                    )}
                                </Button>
                            </div>
                            {saveSuccess && (
                                <p className="text-xs text-green-500 font-medium text-center mt-2 animate-in fade-in slide-in-from-bottom-1">
                                    {editingRecord ? 'Changes saved successfully!' : 'Lead added successfully!'}
                                </p>
                            )}
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
