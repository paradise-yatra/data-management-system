import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Place, PlaceClosure } from '@/services/logicTravelApi';
import { logicTravelApi } from '@/services/logicTravelApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ClosuresAdminPanelProps {
  places: Place[];
}

export const ClosuresAdminPanel = ({ places }: ClosuresAdminPanelProps) => {
  const [closures, setClosures] = useState<PlaceClosure[]>([]);
  const [placeId, setPlaceId] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isClosedFullDay, setIsClosedFullDay] = useState<boolean>(true);
  const [startTime, setStartTime] = useState<string>('12:00');
  const [endTime, setEndTime] = useState<string>('14:00');

  const placeMap = useMemo(
    () => new Map(places.map((place) => [place._id, place.name])),
    [places]
  );

  const loadClosures = async () => {
    try {
      const response = await logicTravelApi.closures.list();
      setClosures(response.data || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load closures');
    }
  };

  useEffect(() => {
    loadClosures();
  }, []);

  const handleCreate = async () => {
    if (!placeId) {
      toast.warning('Select a place');
      return;
    }
    if (!date) {
      toast.warning('Select a date');
      return;
    }

    try {
      await logicTravelApi.closures.create({
        placeId,
        date: new Date(date).toISOString(),
        reason: reason.trim(),
        isClosedFullDay,
        closedRanges: isClosedFullDay ? [] : [{ startTime, endTime }],
      });
      toast.success('Closure created');
      setReason('');
      setDate('');
      setPlaceId('');
      setIsClosedFullDay(true);
      await loadClosures();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create closure');
    }
  };

  const handleDelete = async (closureId: string) => {
    if (!window.confirm('Delete this closure?')) return;
    try {
      await logicTravelApi.closures.remove(closureId);
      toast.success('Closure deleted');
      await loadClosures();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete closure');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <Card className="xl:col-span-5">
        <CardHeader>
          <CardTitle className="text-base">Create Closure Override</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Place</Label>
            <Select value={placeId} onValueChange={setPlaceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select place" />
              </SelectTrigger>
              <SelectContent>
                {places.map((place) => (
                  <SelectItem key={place._id} value={place._id}>
                    {place.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Holiday or maintenance" />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="full-day-closure" checked={isClosedFullDay} onCheckedChange={(value) => setIsClosedFullDay(Boolean(value))} />
            <Label htmlFor="full-day-closure">Closed full day</Label>
          </div>
          {!isClosedFullDay && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
              </div>
            </div>
          )}
          <Button type="button" onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Closure
          </Button>
        </CardContent>
      </Card>

      <Card className="xl:col-span-7">
        <CardHeader>
          <CardTitle className="text-base">Closure Overrides ({closures.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {closures
            .slice()
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((closure) => (
              <div
                key={closure._id}
                className="flex items-center justify-between rounded-md border border-border bg-card p-3"
              >
                <div>
                  <p className="font-medium">{placeMap.get(closure.placeId) || closure.placeId}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(closure.date).toLocaleDateString('en-IN')} |{' '}
                    {closure.isClosedFullDay
                      ? 'Closed full day'
                      : closure.closedRanges.map((range) => `${range.startTime}-${range.endTime}`).join(', ')}
                  </p>
                  {closure.reason && <p className="text-xs text-muted-foreground">Reason: {closure.reason}</p>}
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  onClick={() => handleDelete(closure._id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          {closures.length === 0 && <p className="text-sm text-muted-foreground">No closure overrides found.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

