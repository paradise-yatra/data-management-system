import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Search, Filter, Edit, Trash2 } from 'lucide-react';
import { costItemsAPI, CostItem, CostItemType, CostType } from '@/services/itineraryApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CostItemForm } from '@/components/itinerary-builder/CostItemForm';
import { DeleteConfirmDialog } from '@/components/dashboard/DeleteConfirmDialog';

export const CostLibrary = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<CostItemType | 'all'>('all');
  const [destinationFilter, setDestinationFilter] = useState<string>('all');
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | 'all'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CostItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<CostItem | null>(null);
  const [destinations, setDestinations] = useState<string[]>([]);

  // Fetch cost items
  const { data, isLoading } = useQuery({
    queryKey: ['costItems', typeFilter, destinationFilter, isActiveFilter, searchTerm],
    queryFn: async () => {
      const response = await costItemsAPI.getAll({
        type: typeFilter !== 'all' ? typeFilter : undefined,
        destination: destinationFilter !== 'all' ? destinationFilter : undefined,
        isActive: isActiveFilter !== 'all' ? isActiveFilter : undefined,
        search: searchTerm || undefined,
        limit: 100,
      });
      return response;
    },
  });

  // Extract unique destinations
  useEffect(() => {
    if (data?.data) {
      const uniqueDestinations = Array.from(
        new Set(data.data.map((item) => item.destination))
      ).sort();
      setDestinations(uniqueDestinations);
    }
  }, [data]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: costItemsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costItems'] });
      toast.success('Cost item created successfully');
      setIsFormOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create cost item');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CostItem> }) =>
      costItemsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costItems'] });
      toast.success('Cost item updated successfully');
      setIsFormOpen(false);
      setEditingItem(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update cost item');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: costItemsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costItems'] });
      toast.success('Cost item deleted successfully');
      setDeleteItem(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete cost item');
    },
  });

  const handleEdit = (item: CostItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleDelete = (item: CostItem) => {
    setDeleteItem(item);
  };

  const handleFormSubmit = (formData: Omit<CostItem, '_id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem._id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getTypeBadgeVariant = (type: CostItemType) => {
    const variants: Record<CostItemType, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      hotel: 'default',
      transfer: 'secondary',
      activity: 'outline',
      sightseeing: 'outline',
      other: 'destructive',
    };
    return variants[type] || 'default';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCostTypeLabel = (costType: CostType) => {
    const labels: Record<CostType, string> = {
      per_person: 'Per Person',
      per_night: 'Per Night',
      per_vehicle: 'Per Vehicle',
      flat: 'Flat',
    };
    return labels[costType];
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cost Library</h1>
          <p className="text-muted-foreground mt-1">
            Manage your cost items for hotels, transfers, activities, and more
          </p>
        </div>
        <Button onClick={() => {
          setEditingItem(null);
          setIsFormOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Cost Item
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as CostItemType | 'all')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="hotel">Hotel</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="activity">Activity</SelectItem>
                  <SelectItem value="sightseeing">Sightseeing</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Destination</label>
              <Select value={destinationFilter} onValueChange={setDestinationFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Destinations</SelectItem>
                  {destinations.map((dest) => (
                    <SelectItem key={dest} value={dest}>
                      {dest}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={isActiveFilter === 'all' ? 'all' : isActiveFilter.toString()}
                onValueChange={(value) =>
                  setIsActiveFilter(value === 'all' ? 'all' : value === 'true')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : !data?.data || data.data.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No cost items found. Create your first cost item to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Cost Type</TableHead>
                  <TableHead>Base Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <Badge variant={getTypeBadgeVariant(item.type)}>
                        {item.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.destination}</TableCell>
                    <TableCell>{getCostTypeLabel(item.costType)}</TableCell>
                    <TableCell>{formatCurrency(item.baseCost)}</TableCell>
                    <TableCell>
                      <Badge variant={item.isActive ? 'default' : 'secondary'}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Form Modal */}
      {isFormOpen && (
        <CostItemForm
          item={editingItem}
          onClose={() => {
            setIsFormOpen(false);
            setEditingItem(null);
          }}
          onSubmit={handleFormSubmit}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Delete Confirmation */}
      {deleteItem && (
        <DeleteConfirmDialog
          open={!!deleteItem}
          onOpenChange={(open) => !open && setDeleteItem(null)}
          onConfirm={() => {
            if (deleteItem) {
              deleteMutation.mutate(deleteItem._id);
            }
          }}
          title="Delete Cost Item"
          description={`Are you sure you want to delete "${deleteItem.name}"? This action cannot be undone.`}
        />
      )}
    </div>
  );
};



