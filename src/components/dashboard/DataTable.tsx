import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LeadRecord } from '@/types/record';

interface DataTableProps {
  records: LeadRecord[];
  onEdit: (record: LeadRecord) => void;
  onDelete: (record: LeadRecord) => void;
  onView: (record: LeadRecord) => void;
  selectedRecords?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  onDeleteSelected?: (selectedIds: string[]) => void;
}

const RECORDS_PER_PAGE = 10;

export function DataTable({
  records,
  onEdit,
  onDelete,
  onView,
  selectedRecords = [],
  onSelectionChange,
  onDeleteSelected,
}: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(records.length / RECORDS_PER_PAGE);
  const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
  const paginatedRecords = records.slice(
    startIndex,
    startIndex + RECORDS_PER_PAGE
  );

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      const allIds = paginatedRecords.map((r) => r._id || r.id).filter(Boolean) as string[];
      const newSelection = [...new Set([...selectedRecords, ...allIds])];
      onSelectionChange(newSelection);
    } else {
      const pageIds = paginatedRecords.map((r) => r._id || r.id).filter(Boolean) as string[];
      onSelectionChange(selectedRecords.filter((id) => !pageIds.includes(id)));
    }
  };

  const handleSelectRecord = (recordId: string, checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange([...selectedRecords, recordId]);
    } else {
      onSelectionChange(selectedRecords.filter((id) => id !== recordId));
    }
  };

  const isAllSelected = paginatedRecords.length > 0 &&
    paginatedRecords.every((r) => selectedRecords.includes(r._id || r.id || ''));

  const isSomeSelected = paginatedRecords.some((r) => selectedRecords.includes(r._id || r.id || ''));

  const formatDate = (dateString: string) => {
    try {
      let date: Date;
      if (dateString.includes('T')) {
        date = new Date(dateString);
      } else {
        date = new Date(dateString + 'T00:00:00+05:30');
      }

      return date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      return dateString;
    }
  };

  if (records.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mx-auto max-w-7xl px-6 py-12"
      >
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <p className="text-lg font-medium text-foreground">No records found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first entry to get started.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="mx-auto max-w-7xl px-6 py-4"
    >
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-muted/50 hover:bg-muted/50">
                {onSelectionChange && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableHead>
                )}
                <TableHead className="font-semibold text-foreground">Name</TableHead>
                <TableHead className="font-semibold text-foreground">Email</TableHead>
                <TableHead className="font-semibold text-foreground">Phone</TableHead>
                <TableHead className="font-semibold text-foreground">Interests</TableHead>
                <TableHead className="font-semibold text-foreground">Source</TableHead>
                <TableHead className="font-semibold text-foreground">Date Added</TableHead>
                <TableHead className="font-semibold text-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {paginatedRecords.map((record, index) => (
                  <motion.tr
                    key={record._id || record.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => onView(record)}
                    className={`border-border transition-colors hover:bg-muted/30 cursor-pointer ${selectedRecords.includes(record._id || record.id || '') ? 'bg-muted/50' : ''
                      }`}
                  >
                    {onSelectionChange && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedRecords.includes(record._id || record.id || '')}
                          onCheckedChange={(checked) => {
                            const recordId = record._id || record.id || '';
                            if (recordId) {
                              handleSelectRecord(recordId, checked as boolean);
                            }
                          }}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium text-foreground">
                      {record.name || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {record.email || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {record.phone || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {record.interests && record.interests.length > 0 ? (
                          (() => {
                            const maxChars = 50;
                            let displayedTags: string[] = [];
                            let charCount = 0;
                            let hasMore = false;

                            for (const tag of record.interests) {
                              const tagDisplay = tag.length + 2; // +2 for spacing
                              if (charCount + tagDisplay > maxChars) {
                                hasMore = true;
                                break;
                              }
                              displayedTags.push(tag);
                              charCount += tagDisplay;
                            }

                            return (
                              <>
                                {displayedTags.map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {hasMore && (
                                  <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                                    ...
                                  </span>
                                )}
                              </>
                            );
                          })()
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {record.source}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(record.dateAdded)}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onEdit(record)}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit record</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDelete(record)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete record</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to{' '}
            {Math.min(startIndex + RECORDS_PER_PAGE, records.length)} of{' '}
            {records.length} records
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="gap-1 border-border"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={page === currentPage ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={
                    page === currentPage
                      ? 'bg-foreground text-background hover:bg-foreground/90'
                      : 'text-muted-foreground hover:text-foreground'
                  }
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="gap-1 border-border"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
