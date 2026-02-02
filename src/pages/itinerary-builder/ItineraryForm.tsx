import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save, Lock, Plus, Trash2, Calendar } from 'lucide-react';
import { itinerariesAPI, costItemsAPI, settingsAPI, Day, ServiceItem, TransferItem } from '@/services/itineraryApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DayBuilder } from '@/components/itinerary-builder/DayBuilder';
import { PricingBreakdown } from '@/components/itinerary-builder/PricingBreakdown';
import { usePricingCalculation } from '@/hooks/usePricingCalculation';

export const ItineraryForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  // Form state
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [destinations, setDestinations] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [adults, setAdults] = useState<number | undefined>(undefined);
  const [children, setChildren] = useState<number | undefined>(undefined);
  const [nights, setNights] = useState<number | undefined>(undefined);
  const [rooms, setRooms] = useState<number | undefined>(undefined);
  const [days, setDays] = useState<Day[]>([]);
  const [markupPercentage, setMarkupPercentage] = useState<number | null>(null);
  const [isCustomMarkup, setIsCustomMarkup] = useState(false);

  // Fetch existing itinerary
  const { data: itineraryData, isLoading: isLoadingItinerary } = useQuery({
    queryKey: ['itinerary', id],
    queryFn: () => itinerariesAPI.getById(id!),
    enabled: !!id,
  });

  // Fetch default markup
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.getAll(),
  });

  // Fetch cost items for dropdowns
  const { data: costItemsData } = useQuery({
    queryKey: ['costItems', 'all'],
    queryFn: () => costItemsAPI.getAll({ isActive: true, limit: 1000 }),
  });

  // Load itinerary data
  useEffect(() => {
    if (itineraryData?.data) {
      const it = itineraryData.data;
      setClientName(it.clientName);
      setClientEmail(it.clientEmail || '');
      setClientPhone(it.clientPhone || '');
      setDestinations(it.destinations);
      setStartDate(it.travelDates.startDate.split('T')[0]);
      setEndDate(it.travelDates.endDate.split('T')[0]);
      setAdults(it.pax.adults);
      setChildren(it.pax.children);
      setNights(it.nights);
      setRooms(it.rooms);
      setDays(it.days || []);
      if (it.pricing.markup.isCustom) {
        setMarkupPercentage(it.pricing.markup.percentage);
        setIsCustomMarkup(true);
      }
    }
  }, [itineraryData]);

  // Set default markup
  useEffect(() => {
    if (!isCustomMarkup && settingsData?.data?.default_markup_percentage) {
      setMarkupPercentage(settingsData.data.default_markup_percentage);
    }
  }, [settingsData, isCustomMarkup]);

  // Calculate nights from dates (only for new itineraries)
  useEffect(() => {
    if (isEdit) return; // Don't auto-calculate for existing itineraries

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end > start) {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setNights((prevNights) => {
          // Only update if different to prevent loops
          return prevNights !== diffDays ? diffDays : prevNights;
        });
      }
    }
  }, [startDate, endDate, isEdit]);

  // Auto-generate days based on nights
  useEffect(() => {
    // Only run for new itineraries (not when editing existing)
    if (isEdit) return;

    if (nights > 0) {
      setDays((prevDays) => {
        // If days already match nights, don't update
        if (prevDays.length === nights) {
          return prevDays;
        }

        const newDays: Day[] = [];
        for (let i = 1; i <= nights; i++) {
          const existingDay = prevDays.find((d) => d.dayNumber === i);
          if (existingDay) {
            newDays.push(existingDay);
          } else {
            newDays.push({
              dayNumber: i,
              date: startDate
                ? new Date(new Date(startDate).getTime() + (i - 1) * 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split('T')[0]
                : null,
              activities: [],
              transfers: [],
              sightseeings: [],
              otherServices: [],
              notes: '',
            });
          }
        }
        return newDays;
      });
    }
  }, [nights, startDate, isEdit]);

  // Calculate pricing
  const { pricing, isCalculating } = usePricingCalculation({
    days,
    pax: { adults: adults || 1, children: children || 0, total: (adults || 1) + (children || 0) },
    nights: nights || 1,
    rooms: rooms || 1,
    markupPercentage: markupPercentage || 0,
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        clientName,
        clientEmail,
        clientPhone,
        destinations,
        travelDates: {
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
        },
        pax: {
          adults: adults || 1,
          children: children || 0,
          total: (adults || 1) + (children || 0),
        },
        nights: nights || 1,
        rooms: rooms || 1,
        days,
        markupPercentage: isCustomMarkup ? markupPercentage : undefined,
        status: itineraryData?.data?.status || 'draft',
      };

      if (isEdit && id) {
        return itinerariesAPI.update(id, payload);
      } else {
        return itinerariesAPI.create(payload);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['itineraries'] });
      toast.success(isEdit ? 'Itinerary updated successfully' : 'Itinerary created successfully');
      if (!isEdit) {
        navigate(`/itinerary-builder/${data.data._id}`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save itinerary');
    },
  });

  // Lock mutation
  const lockMutation = useMutation({
    mutationFn: () => itinerariesAPI.lock(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itinerary', id] });
      toast.success('Itinerary locked successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to lock itinerary');
    },
  });

  const handleSave = () => {
    if (!clientName || !destinations.length || !startDate || !endDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    saveMutation.mutate();
  };

  const handleLock = () => {
    if (!id) return;
    lockMutation.mutate();
  };

  const updateDay = (dayNumber: number, updatedDay: Day) => {
    setDays((prev) =>
      prev.map((d) => (d.dayNumber === dayNumber ? updatedDay : d))
    );
  };

  const isLocked = !!itineraryData?.data?.lockedAt || ['sent', 'confirmed'].includes(itineraryData?.data?.status || '');

  if (isLoadingItinerary && isEdit) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {isEdit ? `Edit Itinerary ${itineraryData?.data?.itineraryNumber || ''}` : 'Create New Itinerary'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Build your client itinerary with automatic pricing
          </p>
        </div>
        <div className="flex gap-2">
          {isEdit && id && !isLocked && (
            <Button variant="outline" onClick={handleLock} disabled={lockMutation.isPending}>
              <Lock className="mr-2 h-4 w-4" />
              Lock Pricing
            </Button>
          )}
          <Button onClick={handleSave} disabled={saveMutation.isPending || isLocked}>
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? 'Saving...' : 'Save Itinerary'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Client Name *</Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    disabled={isLocked}
                    placeholder="Enter client name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientEmail">Email</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    disabled={isLocked}
                    placeholder="client@example.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientPhone">Phone</Label>
                <Input
                  id="clientPhone"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  disabled={isLocked}
                  placeholder="+91 1234567890"
                />
              </div>
            </CardContent>
          </Card>

          {/* Travel Details */}
          <Card>
            <CardHeader>
              <CardTitle>Travel Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="destinations">Destinations *</Label>
                <Input
                  id="destinations"
                  value={destinations.join(', ')}
                  onChange={(e) =>
                    setDestinations(
                      e.target.value.split(',').map((d) => d.trim()).filter(Boolean)
                    )
                  }
                  disabled={isLocked}
                  placeholder="Delhi, Agra, Jaipur"
                />
                <p className="text-sm text-muted-foreground">
                  Separate multiple destinations with commas
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={isLocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={isLocked}
                    min={startDate}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adults">Adults *</Label>
                  <Input
                    id="adults"
                    type="number"
                    min="1"
                    value={adults ?? ''}
                    onChange={(e) => setAdults(parseInt(e.target.value) || undefined)}
                    disabled={isLocked}
                    placeholder="Enter guests"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="children">Children</Label>
                  <Input
                    id="children"
                    type="number"
                    min="0"
                    value={children ?? ''}
                    onChange={(e) => setChildren(parseInt(e.target.value) || 0)}
                    disabled={isLocked}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-1">
                    <Label htmlFor="nights">Nights *</Label>
                    <Badge variant="secondary" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
                      {(nights || 0) + 1} Days
                    </Badge>
                  </div>
                  <Input
                    id="nights"
                    type="number"
                    min="1"
                    value={nights ?? ''}
                    onChange={(e) => setNights(parseInt(e.target.value) || undefined)}
                    disabled={isLocked}
                    placeholder="Enter nights"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rooms">Rooms *</Label>
                  <Input
                    id="rooms"
                    type="number"
                    min="1"
                    value={rooms ?? ''}
                    onChange={(e) => setRooms(parseInt(e.target.value) || undefined)}
                    disabled={isLocked}
                    placeholder="Enter rooms"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Markup Override */}
          <Card>
            <CardHeader>
              <CardTitle>Markup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="customMarkup"
                  checked={isCustomMarkup}
                  onChange={(e) => {
                    setIsCustomMarkup(e.target.checked);
                    if (!e.target.checked) {
                      setMarkupPercentage(settingsData?.data?.default_markup_percentage || 20);
                    }
                  }}
                  disabled={isLocked}
                  className="h-4 w-4"
                />
                <Label htmlFor="customMarkup">Use custom markup</Label>
              </div>
              {isCustomMarkup && (
                <div className="space-y-2">
                  <Label htmlFor="markupPercentage">Markup Percentage</Label>
                  <Input
                    id="markupPercentage"
                    type="number"
                    min="0"
                    step="0.1"
                    value={markupPercentage || ''}
                    onChange={(e) => setMarkupPercentage(parseFloat(e.target.value) || 0)}
                    disabled={isLocked}
                  />
                </div>
              )}
              {!isCustomMarkup && (
                <p className="text-sm text-muted-foreground">
                  Using default markup: {settingsData?.data?.default_markup_percentage || 20}%
                </p>
              )}
            </CardContent>
          </Card>

          {/* Day-wise Builder */}
          <Card>
            <CardHeader>
              <CardTitle>Day-wise Itinerary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {days.map((day) => (
                <DayBuilder
                  key={day.dayNumber}
                  day={day}
                  costItems={costItemsData?.data || []}
                  onUpdate={(updatedDay) => updateDay(day.dayNumber, updatedDay)}
                  disabled={isLocked}
                />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Pricing */}
        <div className="lg:col-span-1">
          <PricingBreakdown
            pricing={pricing}
            isLoading={isCalculating}
            currency="INR"
          />
        </div>
      </div>
    </div>
  );
};

