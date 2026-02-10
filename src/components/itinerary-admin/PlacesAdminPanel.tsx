import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Place, PlaceCategory } from '@/services/logicTravelApi';
import { logicTravelApi } from '@/services/logicTravelApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const EMPTY_FORM = {
  name: '',
  description: '',
  category: 'SIGHTSEEING' as PlaceCategory,
  longitude: '77.2090',
  latitude: '28.6139',
  avgDurationMin: '90',
  opensAt: '09:00',
  closesAt: '17:00',
  closedDays: '',
  priceDomestic: '0',
  priceForeigner: '0',
};

interface PlacesAdminPanelProps {
  onPlacesChanged?: () => Promise<void> | void;
}

export const PlacesAdminPanel = ({ onPlacesChanged }: PlacesAdminPanelProps) => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadPlaces = async () => {
    setLoading(true);
    try {
      const response = await logicTravelApi.places.list({ limit: 300 });
      setPlaces(response.data || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load places');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlaces();
  }, []);

  const sortedPlaces = useMemo(
    () => [...places].sort((a, b) => a.name.localeCompare(b.name)),
    [places]
  );

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleEdit = (place: Place) => {
    setEditingId(place._id);
    setForm({
      name: place.name,
      description: place.description || '',
      category: place.category,
      longitude: String(place.location.coordinates[0]),
      latitude: String(place.location.coordinates[1]),
      avgDurationMin: String(place.avgDurationMin),
      opensAt: place.opensAt,
      closesAt: place.closesAt,
      closedDays: (place.closedDays || []).join(','),
      priceDomestic: String(place.priceDomestic || 0),
      priceForeigner: String(place.priceForeigner || 0),
    });
  };

  const handleDelete = async (placeId: string) => {
    if (!window.confirm('Delete this place?')) return;

    try {
      await logicTravelApi.places.remove(placeId);
      toast.success('Place deleted');
      await loadPlaces();
      await onPlacesChanged?.();
      if (editingId === placeId) {
        resetForm();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete place');
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.warning('Place name is required');
      return;
    }

    const lon = Number(form.longitude);
    const lat = Number(form.latitude);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      toast.warning('Longitude and latitude must be valid numbers');
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category,
      location: {
        type: 'Point' as const,
        coordinates: [lon, lat] as [number, number],
      },
      avgDurationMin: Math.max(1, Number(form.avgDurationMin) || 90),
      opensAt: form.opensAt,
      closesAt: form.closesAt,
      closedDays: form.closedDays
        .split(',')
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean),
      priceDomestic: Math.max(0, Number(form.priceDomestic) || 0),
      priceForeigner: Math.max(0, Number(form.priceForeigner) || 0),
      isActive: true,
    };

    try {
      if (editingId) {
        await logicTravelApi.places.update(editingId, payload);
        toast.success('Place updated');
      } else {
        await logicTravelApi.places.create(payload);
        toast.success('Place created');
      }
      resetForm();
      await loadPlaces();
      await onPlacesChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save place');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <Card className="xl:col-span-5">
        <CardHeader>
          <CardTitle className="text-base">{editingId ? 'Edit Place' : 'Create Place'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={form.category}
              onValueChange={(value) => setForm((prev) => ({ ...prev, category: value as PlaceCategory }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SIGHTSEEING">SIGHTSEEING</SelectItem>
                <SelectItem value="FOOD">FOOD</SelectItem>
                <SelectItem value="ADVENTURE">ADVENTURE</SelectItem>
                <SelectItem value="RELAXATION">RELAXATION</SelectItem>
                <SelectItem value="SHOPPING">SHOPPING</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Longitude</Label>
              <Input
                value={form.longitude}
                onChange={(event) => setForm((prev) => ({ ...prev, longitude: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Latitude</Label>
              <Input
                value={form.latitude}
                onChange={(event) => setForm((prev) => ({ ...prev, latitude: event.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Open Time</Label>
              <Input
                type="time"
                value={form.opensAt}
                onChange={(event) => setForm((prev) => ({ ...prev, opensAt: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Close Time</Label>
              <Input
                type="time"
                value={form.closesAt}
                onChange={(event) => setForm((prev) => ({ ...prev, closesAt: event.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Duration (min)</Label>
              <Input
                type="number"
                min={1}
                value={form.avgDurationMin}
                onChange={(event) => setForm((prev) => ({ ...prev, avgDurationMin: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Domestic Price</Label>
              <Input
                type="number"
                min={0}
                value={form.priceDomestic}
                onChange={(event) => setForm((prev) => ({ ...prev, priceDomestic: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Foreigner Price</Label>
              <Input
                type="number"
                min={0}
                value={form.priceForeigner}
                onChange={(event) => setForm((prev) => ({ ...prev, priceForeigner: event.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Closed Days (comma separated)</Label>
            <Input
              placeholder="MONDAY,FRIDAY"
              value={form.closedDays}
              onChange={(event) => setForm((prev) => ({ ...prev, closedDays: event.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button type="button" onClick={handleSubmit} className="gap-2">
              <Plus className="h-4 w-4" />
              {editingId ? 'Update Place' : 'Create Place'}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel Edit
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="xl:col-span-7">
        <CardHeader>
          <CardTitle className="text-base">Golden Database Places ({places.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading places...</p>
          ) : (
            sortedPlaces.map((place) => (
              <div
                key={place._id}
                className="flex items-center justify-between rounded-md border border-border bg-card p-3"
              >
                <div>
                  <p className="font-medium">{place.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{place.category}</Badge>
                    <span>{place.opensAt} - {place.closesAt}</span>
                    <span>{place.avgDurationMin} min</span>
                    <span>{place.location.coordinates[0]}, {place.location.coordinates[1]}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" size="icon" variant="outline" onClick={() => handleEdit(place)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant="destructive" onClick={() => handleDelete(place._id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
          {!loading && sortedPlaces.length === 0 && (
            <p className="text-sm text-muted-foreground">No places found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

