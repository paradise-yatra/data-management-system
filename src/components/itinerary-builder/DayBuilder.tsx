import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Day, CostItem, ServiceItem, TransferItem } from '@/services/itineraryApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface DayBuilderProps {
  day: Day;
  costItems: CostItem[];
  onUpdate: (day: Day) => void;
  disabled?: boolean;
}

export const DayBuilder = ({ day, costItems, onUpdate, disabled = false }: DayBuilderProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const updateDay = (updates: Partial<Day>) => {
    onUpdate({ ...day, ...updates });
  };

  const getCostItemsByType = (type: CostItem['type']) => {
    return costItems.filter((item) => item.type === type && item.isActive);
  };

  const addService = (type: 'activities' | 'sightseeings' | 'otherServices', costItemId: string) => {
    const item = costItems.find((ci) => ci._id === costItemId);
    if (!item) return;

    const serviceItem: ServiceItem = {
      costItemId: item._id,
      name: item.name,
      costType: item.costType,
      baseCost: item.baseCost,
    };

    updateDay({
      [type]: [...(day[type] || []), serviceItem],
    });
  };

  const removeService = (type: 'activities' | 'sightseeings' | 'otherServices', index: number) => {
    const services = [...(day[type] || [])];
    services.splice(index, 1);
    updateDay({ [type]: services });
  };

  const addTransfer = (costItemId: string) => {
    const item = costItems.find((ci) => ci._id === costItemId);
    if (!item) return;

    const transferItem: TransferItem = {
      costItemId: item._id,
      name: item.name,
      costType: item.costType,
      baseCost: item.baseCost,
      tripCount: 1,
    };

    updateDay({
      transfers: [...(day.transfers || []), transferItem],
    });
  };

  const removeTransfer = (index: number) => {
    const transfers = [...(day.transfers || [])];
    transfers.splice(index, 1);
    updateDay({ transfers });
  };

  const updateTransferTripCount = (index: number, tripCount: number) => {
    const transfers = [...(day.transfers || [])];
    transfers[index] = { ...transfers[index], tripCount };
    updateDay({ transfers });
  };

  const updateHotel = (costItemId: string) => {
    const item = costItems.find((ci) => ci._id === costItemId);
    if (!item) return;

    updateDay({
      hotel: {
        costItemId: item._id,
        name: item.name,
        costType: item.costType,
        baseCost: item.baseCost,
      },
    });
  };

  const removeHotel = () => {
    updateDay({ hotel: null });
  };

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <CardTitle className="flex items-center justify-between">
          <span>Day {day.dayNumber}</span>
          {day.date && (
            <Badge variant="outline">
              {new Date(day.date).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
              })}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Hotel */}
          <div className="space-y-2">
            <Label>Hotel</Label>
            {day.hotel ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 p-2 border rounded-md">
                  {day.hotel.name}
                </div>
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeHotel}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ) : (
              !disabled && (
                <Select
                  onValueChange={updateHotel}
                  value=""
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select hotel" />
                  </SelectTrigger>
                  <SelectContent>
                    {getCostItemsByType('hotel').map((item) => (
                      <SelectItem key={item._id} value={item._id}>
                        {item.name} - {item.destination}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            )}
          </div>

          {/* Activities */}
          <div className="space-y-2">
            <Label>Activities</Label>
            {day.activities?.map((activity, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1 p-2 border rounded-md">
                  {activity.name}
                </div>
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeService('activities', index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {!disabled && (
              <Select
                onValueChange={(value) => addService('activities', value)}
                value=""
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add activity" />
                </SelectTrigger>
                <SelectContent>
                  {getCostItemsByType('activity').map((item) => (
                    <SelectItem key={item._id} value={item._id}>
                      {item.name} - {item.destination}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Transfers */}
          <div className="space-y-2">
            <Label>Transfers</Label>
            {day.transfers?.map((transfer, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1 p-2 border rounded-md">
                  {transfer.name}
                </div>
                {!disabled && (
                  <>
                    <Input
                      type="number"
                      min="1"
                      value={transfer.tripCount}
                      onChange={(e) =>
                        updateTransferTripCount(index, parseInt(e.target.value) || 1)
                      }
                      className="w-20"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTransfer(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}
            {!disabled && (
              <Select
                onValueChange={addTransfer}
                value=""
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add transfer" />
                </SelectTrigger>
                <SelectContent>
                  {getCostItemsByType('transfer').map((item) => (
                    <SelectItem key={item._id} value={item._id}>
                      {item.name} - {item.destination}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Sightseeings */}
          <div className="space-y-2">
            <Label>Sightseeings</Label>
            {day.sightseeings?.map((sightseeing, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1 p-2 border rounded-md">
                  {sightseeing.name}
                </div>
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeService('sightseeings', index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {!disabled && (
              <Select
                onValueChange={(value) => addService('sightseeings', value)}
                value=""
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add sightseeing" />
                </SelectTrigger>
                <SelectContent>
                  {getCostItemsByType('sightseeing').map((item) => (
                    <SelectItem key={item._id} value={item._id}>
                      {item.name} - {item.destination}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Other Services */}
          <div className="space-y-2">
            <Label>Other Services</Label>
            {day.otherServices?.map((service, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1 p-2 border rounded-md">
                  {service.name}
                </div>
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeService('otherServices', index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {!disabled && (
              <Select
                onValueChange={(value) => addService('otherServices', value)}
                value=""
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add service" />
                </SelectTrigger>
                <SelectContent>
                  {getCostItemsByType('other').map((item) => (
                    <SelectItem key={item._id} value={item._id}>
                      {item.name} - {item.destination}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={day.notes || ''}
              onChange={(e) => updateDay({ notes: e.target.value })}
              disabled={disabled}
              placeholder="Add day notes..."
              rows={2}
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
};


