import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { itinerariesAPI, Itinerary } from '@/services/itineraryApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
import { DeleteConfirmDialog } from '@/components/dashboard/DeleteConfirmDialog';

export const ItineraryList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteItinerary, setDeleteItinerary] = useState<Itinerary | null>(null);

  // Fetch itineraries
  const { data, isLoading } = useQuery({
    queryKey: ['itineraries', statusFilter, searchTerm],
    queryFn: async () => {
      const response = await itinerariesAPI.getAll({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        clientName: searchTerm || undefined,
        limit: 50,
      });
      return response;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: itinerariesAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itineraries'] });
      toast.success('Itinerary deleted successfully');
      setDeleteItinerary(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete itinerary');
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      draft: 'outline',
      sent: 'secondary',
      confirmed: 'default',
      cancelled: 'destructive',
    };
    return variants[status] || 'outline';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Itineraries</h1>
          <p className="text-muted-foreground mt-1">
            Manage client itineraries and pricing
          </p>
        </div>
        <Button onClick={() => navigate('/itinerary-builder/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Create Itinerary
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Client</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by client name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
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
              No itineraries found. Create your first itinerary to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Itinerary #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Destinations</TableHead>
                  <TableHead>Travel Dates</TableHead>
                  <TableHead>Pax</TableHead>
                  <TableHead>Total Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((itinerary) => (
                  <TableRow key={itinerary._id}>
                    <TableCell className="font-medium">
                      {itinerary.itineraryNumber}
                    </TableCell>
                    <TableCell>{itinerary.clientName}</TableCell>
                    <TableCell>
                      {itinerary.destinations.join(', ')}
                    </TableCell>
                    <TableCell>
                      {formatDate(itinerary.travelDates.startDate)} -{' '}
                      {formatDate(itinerary.travelDates.endDate)}
                    </TableCell>
                    <TableCell>
                      {itinerary.pax.adults}A + {itinerary.pax.children}C
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(itinerary.pricing.total)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(itinerary.status)}>
                        {itinerary.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/itinerary-builder/${itinerary._id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View itinerary</TooltipContent>
                        </Tooltip>
                        {itinerary.status === 'draft' && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/itinerary-builder/${itinerary._id}/edit`)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit itinerary</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteItinerary(itinerary)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete itinerary</TooltipContent>
                            </Tooltip>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      {deleteItinerary && (
        <DeleteConfirmDialog
          open={!!deleteItinerary}
          onOpenChange={(open) => !open && setDeleteItinerary(null)}
          onConfirm={() => {
            if (deleteItinerary) {
              deleteMutation.mutate(deleteItinerary._id);
            }
          }}
          title="Delete Itinerary"
          description={`Are you sure you want to delete itinerary "${deleteItinerary.itineraryNumber}"? This action cannot be undone.`}
        />
      )}
    </div>
  );
};


