import { useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Search, Clock3, Wallet } from 'lucide-react';
import type { Place, PlaceCategory } from '@/services/logicTravelApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface InventoryListProps {
  places: Place[];
  search: string;
  selectedCategory: 'ALL' | PlaceCategory;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: 'ALL' | PlaceCategory) => void;
}

const CATEGORY_OPTIONS: Array<'ALL' | PlaceCategory> = [
  'ALL',
  'SIGHTSEEING',
  'FOOD',
  'ADVENTURE',
  'RELAXATION',
  'SHOPPING',
];

interface DraggablePlaceCardProps {
  place: Place;
}

const DraggablePlaceCard = ({ place }: DraggablePlaceCardProps) => {
  const draggableId = `place:${place._id}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId,
    data: {
      type: 'PLACE',
      placeId: place._id,
    },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style}>
      <button
        type="button"
        className={cn(
          'w-full rounded-lg border border-border bg-card p-3 text-left transition hover:border-primary/40 hover:shadow-sm',
          isDragging && 'opacity-70 ring-2 ring-primary/40'
        )}
        {...attributes}
        {...listeners}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-sm font-semibold text-foreground">{place.name}</p>
          <Badge variant="secondary" className="text-[10px]">
            {place.category}
          </Badge>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock3 className="h-3.5 w-3.5" />
            <span>{place.opensAt} - {place.closesAt}</span>
          </div>
          <div className="flex items-center gap-2">
            <Wallet className="h-3.5 w-3.5" />
            <span>Domestic {place.priceDomestic.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </button>
    </div>
  );
};

export const InventoryList = ({
  places,
  search,
  selectedCategory,
  onSearchChange,
  onCategoryChange,
}: InventoryListProps) => {
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return places.filter((place) => {
      if (selectedCategory !== 'ALL' && place.category !== selectedCategory) {
        return false;
      }
      if (!term) return true;
      return (
        place.name.toLowerCase().includes(term) ||
        place.description?.toLowerCase().includes(term) ||
        place.category.toLowerCase().includes(term)
      );
    });
  }, [places, search, selectedCategory]);

  return (
    <Card className="h-full">
      <CardHeader className="space-y-3 border-b border-border pb-4">
        <CardTitle className="text-base">Inventory</CardTitle>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search places..."
            className="pl-8"
          />
        </div>
        <Select value={selectedCategory} onValueChange={(value) => onCategoryChange(value as 'ALL' | PlaceCategory)}>
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[52vh] p-3">
          <div className="space-y-2">
            {filtered.map((place) => (
              <DraggablePlaceCard key={place._id} place={place} />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="px-2 py-8 text-center text-sm text-muted-foreground">
              No places match your filters.
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

