import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FilterState } from '@/types/record';

interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  sources: string[];
}

export function FilterBar({ filters, onFiltersChange, sources }: FilterBarProps) {
  const updateFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      emailFilter: 'all',
      phoneFilter: 'all',
      sourceFilter: 'all',
      interestsFilter: 'all',
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.emailFilter !== 'all' ||
    filters.phoneFilter !== 'all' ||
    filters.sourceFilter !== 'all' ||
    filters.interestsFilter !== 'all';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mx-auto max-w-7xl px-6"
    >
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone, or interests..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="pl-9 border-border bg-background"
            />
          </div>

          <Select
            value={filters.emailFilter}
            onValueChange={(value) =>
              updateFilter('emailFilter', value as FilterState['emailFilter'])
            }
          >
            <SelectTrigger className="w-[140px] border-border bg-background">
              <SelectValue placeholder="Email" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border">
              <SelectItem value="all">All Emails</SelectItem>
              <SelectItem value="has">Has Email</SelectItem>
              <SelectItem value="none">No Email</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.phoneFilter}
            onValueChange={(value) =>
              updateFilter('phoneFilter', value as FilterState['phoneFilter'])
            }
          >
            <SelectTrigger className="w-[140px] border-border bg-background">
              <SelectValue placeholder="Phone" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border">
              <SelectItem value="all">All Phones</SelectItem>
              <SelectItem value="has">Has Phone</SelectItem>
              <SelectItem value="none">No Phone</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.sourceFilter}
            onValueChange={(value) => updateFilter('sourceFilter', value)}
          >
            <SelectTrigger className="w-[140px] border-border bg-background">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border">
              <SelectItem value="all">All Sources</SelectItem>
              {sources.map((source) => (
                <SelectItem key={source} value={source}>
                  {source}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Filter by interest..."
            value={filters.interestsFilter === 'all' ? '' : filters.interestsFilter}
            onChange={(e) => updateFilter('interestsFilter', e.target.value || 'all')}
            className="w-[160px] border-border bg-background"
          />

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
