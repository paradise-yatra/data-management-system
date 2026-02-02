import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CostItem, CostItemType, CostType } from '@/services/itineraryApi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { DatePicker } from '@/components/ui/date-picker';
import { formatISO } from 'date-fns';

const costItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['hotel', 'transfer', 'activity', 'sightseeing', 'other']),
  destination: z.string().min(1, 'Destination is required'),
  costType: z.enum(['per_person', 'per_night', 'per_vehicle', 'flat']),
  baseCost: z.number().min(0, 'Base cost must be positive'),
  currency: z.string().default('INR'),
  validityStart: z.string().optional().nullable(),
  validityEnd: z.string().optional().nullable(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

type CostItemFormData = z.infer<typeof costItemSchema>;

interface CostItemFormProps {
  item: CostItem | null;
  onClose: () => void;
  onSubmit: (data: Omit<CostItem, '_id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) => void;
  isSubmitting?: boolean;
}

export const CostItemForm = ({ item, onClose, onSubmit, isSubmitting = false }: CostItemFormProps) => {
  const form = useForm<CostItemFormData>({
    resolver: zodResolver(costItemSchema),
    defaultValues: {
      name: item?.name || '',
      type: item?.type || 'hotel',
      destination: item?.destination || '',
      costType: item?.costType || 'per_person',
      baseCost: item?.baseCost || undefined,
      currency: item?.currency || 'INR',
      validityStart: item?.validityStart || null,
      validityEnd: item?.validityEnd || null,
      description: item?.description || '',
      isActive: item?.isActive ?? true,
    },
  });

  const handleSubmit = (data: CostItemFormData) => {
    onSubmit({
      ...data,
      name: data.name,
      type: data.type,
      destination: data.destination,
      costType: data.costType,
      baseCost: data.baseCost,
      currency: data.currency || 'INR',
      isActive: data.isActive ?? true,
      validityStart: data.validityStart || null,
      validityEnd: data.validityEnd || null,
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Cost Item' : 'Create Cost Item'}</DialogTitle>
          <DialogDescription>
            {item ? 'Update the cost item details' : 'Add a new cost item to your library'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Taj Hotel Delhi" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="hotel">Hotel</SelectItem>
                        <SelectItem value="transfer">Transfer</SelectItem>
                        <SelectItem value="activity">Activity</SelectItem>
                        <SelectItem value="sightseeing">Sightseeing</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="destination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Delhi" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="costType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="per_person">Per Person</SelectItem>
                        <SelectItem value="per_night">Per Night</SelectItem>
                        <SelectItem value="per_vehicle">Per Vehicle</SelectItem>
                        <SelectItem value="flat">Flat</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="baseCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Cost *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional description..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="validityStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Validity Start</FormLabel>
                    <FormControl>
                      <DatePicker
                        date={field.value ? new Date(field.value) : undefined}
                        setDate={(date) => field.onChange(date ? formatISO(date, { representation: 'date' }) : null)}
                        placeholder="Select start date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="validityEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Validity End</FormLabel>
                    <FormControl>
                      <DatePicker
                        date={field.value ? new Date(field.value) : undefined}
                        setDate={(date) => field.onChange(date ? formatISO(date, { representation: 'date' }) : null)}
                        placeholder="Select end date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <FormDescription>
                      Inactive items won't appear in dropdowns
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : item ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};


