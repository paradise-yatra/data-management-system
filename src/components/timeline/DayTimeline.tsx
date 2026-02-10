import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertTriangle, Clock3, Route, Trash2 } from 'lucide-react';
import type { Place } from '@/services/logicTravelApi';
import type { BuilderDay, BuilderEvent } from '@/store/useTripStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DayTimelineProps {
  day: BuilderDay | null;
  placesById: Map<string, Place>;
  onRemoveEvent: (eventClientId: string) => void;
}

interface SortableEventCardProps {
  event: BuilderEvent;
  place?: Place;
  onRemove: () => void;
}

const SortableEventCard = ({ event, place, onRemove }: SortableEventCardProps) => {
  const sortableId = `event:${event.clientId}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
    data: {
      type: 'EVENT',
      eventClientId: event.clientId,
      placeId: event.placeId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isInvalid = event.validationStatus === 'INVALID';

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={cn(
          'rounded-lg border border-border bg-background p-3 shadow-sm transition',
          'hover:border-primary/40',
          isDragging && 'opacity-70',
          isInvalid && 'border-red-500/70 bg-red-500/5'
        )}
        {...attributes}
        {...listeners}
      >
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">{place?.name || 'Unknown Place'}</p>
            <p className="text-xs text-muted-foreground">Order {event.order + 1}</p>
          </div>
          <div className="flex items-center gap-2">
            {isInvalid && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {event.validationReason || 'Invalid'}
              </Badge>
            )}
            <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1">
            <Clock3 className="h-3.5 w-3.5" />
            {event.startTime || '--:--'} - {event.endTime || '--:--'}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1">
            <Route className="h-3.5 w-3.5" />
            {Number(event.distanceKm || 0).toFixed(1)} km / {event.travelTimeMin || 0} min
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1">
            {event.routeProvider || 'STATIC'}
          </span>
        </div>
      </div>
    </div>
  );
};

export const DayTimeline = ({ day, placesById, onRemoveEvent }: DayTimelineProps) => {
  const dropId = `day:${day?.dayIndex ?? 0}`;
  const { isOver, setNodeRef } = useDroppable({
    id: dropId,
    data: {
      type: 'DAY',
      dayIndex: day?.dayIndex ?? 0,
    },
  });

  const events = day?.events || [];
  const sortableIds = events.map((event) => `event:${event.clientId}`);

  return (
    <Card className="h-full">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="text-base">Day Timeline</CardTitle>
        <p className="text-xs text-muted-foreground">
          Drag places from inventory. Reorder cards to optimize route.
        </p>
      </CardHeader>
      <CardContent className="h-[52vh] p-3">
        <div
          ref={setNodeRef}
          className={cn(
            'h-full rounded-xl border border-dashed border-border p-3',
            isOver && 'border-primary bg-primary/5'
          )}
        >
          {events.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Drop places here to start building this day.
            </div>
          ) : (
            <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {events.map((event) => (
                  <SortableEventCard
                    key={event.clientId}
                    event={event}
                    place={placesById.get(event.placeId)}
                    onRemove={() => onRemoveEvent(event.clientId)}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

