import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LeadRecord } from '@/types/record';

const formSchema = z
  .object({
    name: z.string().default(''),
    email: z.string().default(''),
    phone: z.string().default(''),
    interests: z.array(z.string()).default([]),
    source: z.string().min(1, 'Please select a source'),
    remarks: z.string().default(''),
  })
  .refine((data) => {
    // Email validation: if provided, must be valid email format
    if (data.email && data.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email.trim())) {
        return false;
      }
    }
    return true;
  }, {
    message: 'Invalid email format',
    path: ['email'],
  })
  .refine((data) => {
    const hasEmail = data.email && data.email.trim();
    const hasPhone = data.phone && data.phone.trim();
    return hasEmail || hasPhone;
  }, {
    message: 'At least one of Email or Phone Number is required',
    path: ['email'],
  });

type FormData = z.infer<typeof formSchema>;

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<LeadRecord, '_id' | 'id' | 'uniqueId' | 'dateAdded'>) => void;
  editingRecord?: LeadRecord | null;
  sources: string[];
}

export function RecordModal({
  isOpen,
  onClose,
  onSave,
  editingRecord,
  sources,
}: RecordModalProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      interests: [],
      source: '',
      remarks: '',
    },
  });

  const [tagInput, setTagInput] = useState('');
  const watchedInterests = watch('interests') || [];
  const watchedSource = watch('source') || undefined;

  useEffect(() => {
    if (editingRecord) {
      reset({
        name: editingRecord.name,
        email: editingRecord.email,
        phone: editingRecord.phone,
        interests: editingRecord.interests || [],
        source: editingRecord.source,
        remarks: editingRecord.remarks,
      });
    } else {
      reset({
        name: '',
        email: '',
        phone: '',
        interests: [],
        source: '',
        remarks: '',
      });
    }
    setTagInput('');
  }, [editingRecord, reset, isOpen]);

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !watchedInterests.includes(trimmed)) {
      setValue('interests', [...watchedInterests, trimmed], { shouldValidate: true });
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setValue('interests', watchedInterests.filter((tag) => tag !== tagToRemove), { shouldValidate: true });
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const onSubmit = (data: FormData) => {
    onSave({
      name: (data.name && data.name.trim()) ? data.name.trim() : '',
      email: (data.email && data.email.trim()) ? data.email.trim() : '',
      phone: (data.phone && data.phone.trim()) ? data.phone.trim() : '',
      interests: data.interests || [],
      source: data.source,
      remarks: (data.remarks && data.remarks.trim()) ? data.remarks.trim() : '',
    });
    onClose();
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
            className="relative z-[101] w-full max-w-2xl mx-4 rounded-lg border border-border bg-background p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                {editingRecord ? 'Edit Record' : 'Add New Record'}
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

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground">
                    Name <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="Enter name"
                    className="border-border bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">
                    Email <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="Enter email"
                    className="border-border bg-background"
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-foreground">
                    Phone Number <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="phone"
                    {...register('phone')}
                    placeholder="Enter phone number"
                    className="border-border bg-background"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-foreground">Interests</Label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagInputKeyDown}
                        placeholder="Type an interest and press Enter"
                        className="border-border bg-background"
                      />
                      <Button
                        type="button"
                        onClick={addTag}
                        variant="outline"
                        className="border-border whitespace-nowrap"
                      >
                        Add
                      </Button>
                    </div>
                    {watchedInterests.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {watchedInterests.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="bg-muted text-foreground px-3 py-1"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="ml-2 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    {errors.interests && (
                      <p className="text-sm text-destructive">{errors.interests.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Source</Label>
                  <Select
                    value={watchedSource}
                    onValueChange={(value) => setValue('source', value, { shouldValidate: true })}
                  >
                    <SelectTrigger className="border-border bg-background">
                      <SelectValue placeholder="Select a source" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border">
                      {sources.map((source) => (
                        <SelectItem key={source} value={source}>
                          {source}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.source && (
                    <p className="text-sm text-destructive">{errors.source.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remarks" className="text-foreground">
                    Remarks <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Textarea
                    id="remarks"
                    {...register('remarks')}
                    placeholder="Add any notes..."
                    rows={1}
                    className="border-border bg-background resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="border-border"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-foreground text-background hover:bg-foreground/90"
                >
                  {editingRecord ? 'Save Changes' : 'Add Record'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
