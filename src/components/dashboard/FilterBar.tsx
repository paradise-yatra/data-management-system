import { motion } from 'framer-motion';
import { Search, X, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/animate-ui/components/radix/dropdown-menu';
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-[140px] justify-between border-border bg-background font-normal">
                {filters.emailFilter === 'all' ? 'All Emails' : filters.emailFilter === 'has' ? 'Has Email' : 'No Email'}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[140px] bg-background border-border">
              <DropdownMenuItem onClick={() => updateFilter('emailFilter', 'all')}>All Emails</DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateFilter('emailFilter', 'has')}>Has Email</DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateFilter('emailFilter', 'none')}>No Email</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-[140px] justify-between border-border bg-background font-normal">
                {filters.phoneFilter === 'all' ? 'All Phones' : filters.phoneFilter === 'has' ? 'Has Phone' : 'No Phone'}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[140px] bg-background border-border">
              <DropdownMenuItem onClick={() => updateFilter('phoneFilter', 'all')}>All Phones</DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateFilter('phoneFilter', 'has')}>Has Phone</DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateFilter('phoneFilter', 'none')}>No Phone</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-[140px] justify-between border-border bg-background font-normal">
                <span className="truncate">{filters.sourceFilter === 'all' ? 'All Sources' : filters.sourceFilter}</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[140px] bg-background border-border max-h-[300px] overflow-y-auto">
              <DropdownMenuItem onClick={() => updateFilter('sourceFilter', 'all')}>All Sources</DropdownMenuItem>
              {sources.map((source) => (
                <DropdownMenuItem key={source} onClick={() => updateFilter('sourceFilter', source)}>
                  {source}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

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
