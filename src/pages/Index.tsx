import { useState, useMemo, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Plus, Settings, Trash2, FileText, RefreshCw, ChevronDown, FileSpreadsheet } from 'lucide-react';
import { getCurrentISTDateTime, formatDateTimeIST } from '@/utils/dateUtils';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/dashboard/Header';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { FilterBar } from '@/components/dashboard/FilterBar';
import { DataTable } from '@/components/dashboard/DataTable';
import { RecordModal } from '@/components/dashboard/RecordModal';
import { DeleteConfirmDialog } from '@/components/dashboard/DeleteConfirmDialog';
import { SourceManagementModal } from '@/components/dashboard/SourceManagementModal';
import { RecordDetailsModal } from '@/components/dashboard/RecordDetailsModal';
import { TrashModalWithConfirm } from '@/components/dashboard/TrashModal';
import { LogsModal } from '@/components/dashboard/LogsModal';
import { BulkAddModal } from '@/components/dashboard/BulkAddModal';
import { ExcelImportModal } from '@/components/dashboard/ExcelImportModal';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LeadRecord, FilterState, SOURCES } from '@/types/record';
import { sourcesAPI, identitiesAPI, trashAPI } from '@/services/api';

const Index = () => {
  const { isAdmin } = useAuth();
  const [records, setRecords] = useState<LeadRecord[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    emailFilter: 'all',
    phoneFilter: 'all',
    sourceFilter: 'all',
    interestsFilter: 'all',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LeadRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<LeadRecord | null>(null);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [sources, setSources] = useState<string[]>([...SOURCES]);
  const [viewingRecord, setViewingRecord] = useState<LeadRecord | null>(null);
  const [isLoadingSources, setIsLoadingSources] = useState(true);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [deletedRecords, setDeletedRecords] = useState<LeadRecord[]>([]);
  const [isLoadingTrash, setIsLoadingTrash] = useState(true);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const selectionToastIdRef = useRef<string | number | null>(null);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);

  // Fetch sources from API on component mount
  useEffect(() => {
    const fetchSources = async () => {
      try {
        const fetchedSources = await sourcesAPI.getAll();
        if (fetchedSources.length > 0) {
          setSources(fetchedSources);
        }
      } catch (error) {
        console.error('Failed to fetch sources:', error);
        // Keep default sources if API fails
        toast('Failed to load sources from server. Using default sources.', {
          style: {
            background: 'hsl(45, 93%, 47%)',
            color: 'white',
            border: 'none',
          },
        });
      } finally {
        setIsLoadingSources(false);
      }
    };

    fetchSources();
  }, []);

  // Fetch identities from API on component mount
  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const fetchedRecords = await identitiesAPI.getAll();
        setRecords(fetchedRecords);
        setLastUpdated(getCurrentISTDateTime());
      } catch (error) {
        console.error('Failed to fetch records:', error);
        toast('Failed to load records from server.', {
          style: {
            background: 'hsl(45, 93%, 47%)',
            color: 'white',
            border: 'none',
          },
        });
      } finally {
        setIsLoadingRecords(false);
      }
    };

    const fetchTrash = async () => {
      // Only fetch trash for admins
      if (!isAdmin) {
        setIsLoadingTrash(false);
        return;
      }
      try {
        const fetchedTrash = await trashAPI.getAll();
        setDeletedRecords(fetchedTrash);
      } catch (error) {
        console.error('Error fetching trash:', error);
      } finally {
        setIsLoadingTrash(false);
      }
    };

    fetchRecords();
    fetchTrash();
  }, [isAdmin]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          record.name.toLowerCase().includes(searchLower) ||
          record.email.toLowerCase().includes(searchLower) ||
          record.phone.toLowerCase().includes(searchLower) ||
          record.interests.some((interest) => interest.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Email filter
      if (filters.emailFilter === 'has' && !record.email) return false;
      if (filters.emailFilter === 'none' && record.email) return false;

      // Phone filter
      if (filters.phoneFilter === 'has' && !record.phone) return false;
      if (filters.phoneFilter === 'none' && record.phone) return false;

      // Source filter
      if (filters.sourceFilter !== 'all' && record.source !== filters.sourceFilter)
        return false;

      // Interests filter
      if (filters.interestsFilter !== 'all' &&
        !record.interests.some((interest) => interest.toLowerCase().includes(filters.interestsFilter.toLowerCase())))
        return false;

      return true;
    });
  }, [records, filters]);

  // Show/hide selection toast notification
  useEffect(() => {
    if (selectedRecords.length > 0) {
      // Dismiss previous toast if exists
      if (selectionToastIdRef.current !== null) {
        toast.dismiss(selectionToastIdRef.current);
      }

      // Show toast with delete button
      const toastId = toast(
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium">
            {selectedRecords.length} record{selectedRecords.length !== 1 ? 's' : ''} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              try {
                // Get current records to delete (from all records, not just filtered)
                const recordsToDelete = records.filter((r) =>
                  selectedRecords.includes(r._id || r.id || '')
                );

                // Delete from identities and add to trash for each record
                const trashRecords: LeadRecord[] = [];
                for (const record of recordsToDelete) {
                  if (record._id) {
                    await identitiesAPI.delete(record._id);
                    // Get the trash record with the correct _id
                    const trashRecord = await trashAPI.add(record);
                    trashRecords.push(trashRecord);
                  }
                }

                // Update local state - use trash records with correct _id
                setRecords((prev) => prev.filter((r) => !selectedRecords.includes(r._id || r.id || '')));
                setDeletedRecords((prev) => [...trashRecords, ...prev]);
                setSelectedRecords([]);
                toast.dismiss(toastId);

                toast.error(`${recordsToDelete.length} record${recordsToDelete.length !== 1 ? 's' : ''} moved to trash`, {
                  style: {
                    background: 'hsl(0, 84%, 60%)',
                    color: 'white',
                    border: 'none',
                  },
                });
              } catch (error) {
                toast(error instanceof Error ? error.message : 'Failed to delete selected records', {
                  style: {
                    background: 'hsl(45, 93%, 47%)',
                    color: 'white',
                    border: 'none',
                  },
                });
              }
            }}
            className="gap-2 h-8"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </Button>
        </div>,
        {
          duration: Infinity, // Keep it open until dismissed
          style: {
            background: 'hsl(45, 93%, 47%)',
            color: 'white',
            border: 'none',
          },
        }
      );
      selectionToastIdRef.current = toastId;
    } else {
      // Dismiss toast when nothing is selected
      if (selectionToastIdRef.current !== null) {
        toast.dismiss(selectionToastIdRef.current);
        selectionToastIdRef.current = null;
      }
    }
  }, [selectedRecords.length, records]);

  const handleAddNew = () => {
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const handleEdit = (record: LeadRecord) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const handleSave = async (data: Omit<LeadRecord, '_id' | 'id' | 'uniqueId' | 'dateAdded'>) => {
    try {
      const recordData = {
        ...data,
        dateAdded: editingRecord?.dateAdded || getCurrentISTDateTime(),
      };

      if (editingRecord && editingRecord._id) {
        // Update existing record
        const updatedRecord = await identitiesAPI.update(editingRecord._id, recordData);
        setRecords((prev) =>
          prev.map((r) =>
            r._id === editingRecord._id ? updatedRecord : r
          )
        );
        toast('Record updated successfully', {
          style: {
            background: 'hsl(45, 93%, 47%)',
            color: 'white',
            border: 'none',
          },
        });
      } else {
        // Add new record
        const newRecord = await identitiesAPI.create(recordData);
        setRecords((prev) => [newRecord, ...prev]);
        toast.success('Record added successfully', {
          style: {
            background: 'hsl(142, 76%, 36%)',
            color: 'white',
            border: 'none',
          },
        });
      }
      setEditingRecord(null);
      setIsModalOpen(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save record';

      // Check if it's a duplicate error
      const isDuplicateError = errorMessage.includes('already exists');

      toast(errorMessage, {
        style: {
          background: isDuplicateError ? 'hsl(0, 84%, 60%)' : 'hsl(45, 93%, 47%)',
          color: 'white',
          border: 'none',
        },
      });
    }
  };

  const handleDeleteClick = (record: LeadRecord) => {
    setDeleteRecord(record);
  };

  const handleDeleteConfirm = async () => {
    if (deleteRecord && deleteRecord._id) {
      try {
        // Delete from identities collection
        await identitiesAPI.delete(deleteRecord._id);

        // Add to trash collection - this returns a new record with trash collection's _id
        const trashRecord = await trashAPI.add(deleteRecord);

        // Update local state - use the trash record with the correct _id
        setRecords((prev) => prev.filter((r) => r._id !== deleteRecord._id));
        setDeletedRecords((prev) => [trashRecord, ...prev]);

        toast.error('Record moved to trash', {
          style: {
            background: 'hsl(0, 84%, 60%)',
            color: 'white',
            border: 'none',
          },
        });
        setDeleteRecord(null);
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Failed to delete record', {
          style: {
            background: 'hsl(45, 93%, 47%)',
            color: 'white',
            border: 'none',
          },
        });
      }
    }
  };

  const handleRestore = async (record: LeadRecord) => {
    if (!record._id) return;

    try {
      // Restore from trash (moves back to identities collection)
      const restoredRecord = await trashAPI.restore(record._id);

      // Update local state
      setDeletedRecords((prev) => prev.filter((r) => r._id !== record._id));
      setRecords((prev) => [restoredRecord, ...prev]);

      toast('Record restored successfully', {
        style: {
          background: 'hsl(142, 76%, 36%)',
          color: 'white',
          border: 'none',
        },
      });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to restore record', {
        style: {
          background: 'hsl(45, 93%, 47%)',
          color: 'white',
          border: 'none',
        },
      });
    }
  };

  const handlePermanentDelete = async (record: LeadRecord) => {
    if (!record._id) return;

    try {
      // Permanently delete from trash collection
      await trashAPI.delete(record._id);

      // Update local state
      setDeletedRecords((prev) => prev.filter((r) => r._id !== record._id));

      toast.error('Record permanently deleted', {
        style: {
          background: 'hsl(0, 84%, 60%)',
          color: 'white',
          border: 'none',
        },
      });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to permanently delete record', {
        style: {
          background: 'hsl(45, 93%, 47%)',
          color: 'white',
          border: 'none',
        },
      });
    }
  };

  const handleEmptyTrash = async () => {
    try {
      // Permanently delete all records from trash collection
      await trashAPI.empty();

      const count = deletedRecords.length;
      setDeletedRecords([]);

      toast.error(`All ${count} record${count !== 1 ? 's' : ''} permanently deleted`, {
        style: {
          background: 'hsl(0, 84%, 60%)',
          color: 'white',
          border: 'none',
        },
      });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to empty trash', {
        style: {
          background: 'hsl(45, 93%, 47%)',
          color: 'white',
          border: 'none',
        },
      });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Fetch all data
      const [fetchedRecords, fetchedSources, fetchedTrash] = await Promise.all([
        identitiesAPI.getAll(),
        sourcesAPI.getAll(),
        isAdmin ? trashAPI.getAll() : Promise.resolve([]),
      ]);

      setRecords(fetchedRecords);
      setLastUpdated(getCurrentISTDateTime());
      if (fetchedSources.length > 0) {
        setSources(fetchedSources);
      }
      if (isAdmin) {
        setDeletedRecords(fetchedTrash);
      }
    } catch (error) {
      toast('Failed to refresh data', {
        style: {
          background: 'hsl(45, 93%, 47%)',
          color: 'white',
          border: 'none',
        },
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <div className="mx-auto max-w-7xl px-6 pt-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-semibold text-foreground">
              Identity Management System
            </h2>
            {lastUpdated && (
              <p className="text-sm text-muted-foreground">
                Last updated: {formatDateTimeIST(lastUpdated)}
              </p>
            )}
          </div>
        </div>
        <StatsCards records={records} />
        <div className="mx-auto max-w-7xl px-6 pb-4 flex justify-end gap-3">
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={isRefreshing}
            className="gap-2 border-border"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {isAdmin && (
            <>
              <Button
                onClick={() => setIsTrashModalOpen(true)}
                variant="outline"
                className="gap-2 border-border"
              >
                <Trash2 className="h-4 w-4" />
                Trash
                {deletedRecords.length > 0 && (
                  <span className="ml-1 rounded-full bg-destructive px-2 py-0.5 text-xs font-medium text-destructive-foreground">
                    {deletedRecords.length}
                  </span>
                )}
              </Button>
              <Button
                onClick={() => setIsLogsModalOpen(true)}
                variant="outline"
                className="gap-2 border-border"
              >
                <FileText className="h-4 w-4" />
                Logs
              </Button>
              <Button
                onClick={() => setIsSourceModalOpen(true)}
                variant="outline"
                className="gap-2 border-border"
              >
                <Settings className="h-4 w-4" />
                Sources
              </Button>
            </>
          )}
          <Button
            onClick={handleAddNew}
            className="gap-2 bg-foreground text-background hover:bg-foreground/90"
          >
            <Plus className="h-4 w-4" />
            Add New Record
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="gap-2 border-border"
              >
                Bulk Add
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsBulkAddModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Manual
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsExcelImportModalOpen(true)}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel Import
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <FilterBar filters={filters} onFiltersChange={setFilters} sources={sources} />
        <DataTable
          records={filteredRecords}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          onView={(record) => setViewingRecord(record)}
          selectedRecords={selectedRecords}
          onSelectionChange={setSelectedRecords}
        />
      </main>
      <RecordModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        editingRecord={editingRecord}
        sources={sources}
      />
      {isAdmin && (
        <SourceManagementModal
          isOpen={isSourceModalOpen}
          onClose={() => setIsSourceModalOpen(false)}
          sources={sources}
          onSourcesChange={async (newSources, showNotification = false) => {
            try {
              await sourcesAPI.updateAll(newSources);
              setSources(newSources);
              if (showNotification) {
                toast('Sources updated successfully', {
                  style: {
                    background: 'hsl(45, 93%, 47%)',
                    color: 'white',
                    border: 'none',
                  },
                });
              }
            } catch (error) {
              toast(error instanceof Error ? error.message : 'Failed to update sources', {
                style: {
                  background: 'hsl(45, 93%, 47%)',
                  color: 'white',
                  border: 'none',
                },
              });
            }
          }}
        />
      )}
      <RecordDetailsModal
        isOpen={!!viewingRecord}
        onClose={() => setViewingRecord(null)}
        record={viewingRecord}
      />
      <DeleteConfirmDialog
        isOpen={!!deleteRecord}
        record={deleteRecord}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteRecord(null)}
      />
      {isAdmin && (
        <TrashModalWithConfirm
          isOpen={isTrashModalOpen}
          onClose={() => setIsTrashModalOpen(false)}
          deletedRecords={deletedRecords}
          onRestore={handleRestore}
          onPermanentDelete={handlePermanentDelete}
          onEmptyTrash={handleEmptyTrash}
        />
      )}
      {isAdmin && (
        <LogsModal
          isOpen={isLogsModalOpen}
          onClose={() => setIsLogsModalOpen(false)}
        />
      )}
      <BulkAddModal
        isOpen={isBulkAddModalOpen}
        onClose={() => setIsBulkAddModalOpen(false)}
        sources={sources}
        onSave={async (entries) => {
          try {
            const result = await identitiesAPI.createBulk(entries);

            // Refresh records
            const fetchedRecords = await identitiesAPI.getAll();
            setRecords(fetchedRecords);

            // Show success/partial success notification
            if (result.failed === 0) {
              toast(`Successfully added ${result.success} record${result.success !== 1 ? 's' : ''}`, {
                style: {
                  background: 'hsl(142, 76%, 36%)',
                  color: 'white',
                  border: 'none',
                },
              });
            } else {
              toast(`Added ${result.success} of ${entries.length} records. ${result.failed} failed.`, {
                style: {
                  background: 'hsl(45, 93%, 47%)',
                  color: 'white',
                  border: 'none',
                },
              });

              // Show details of failed entries if any
              if (result.results.failed.length > 0) {
                const failedDetails = result.results.failed
                  .map((f) => `Row ${f.index}: ${f.error}`)
                  .join('\n');
                console.error('Failed entries:', failedDetails);
              }
            }
          } catch (error) {
            toast(error instanceof Error ? error.message : 'Failed to save bulk entries', {
              style: {
                background: 'hsl(0, 84%, 60%)',
                color: 'white',
                border: 'none',
              },
            });
            throw error;
          }
        }}
      />
      <ExcelImportModal
        isOpen={isExcelImportModalOpen}
        onClose={() => setIsExcelImportModalOpen(false)}
        sources={sources}
        onSave={async (entries) => {
          try {
            const result = await identitiesAPI.createBulk(entries);

            // Refresh records
            const fetchedRecords = await identitiesAPI.getAll();
            setRecords(fetchedRecords);

            // Show success/partial success notification
            if (result.failed === 0) {
              toast.success(`Successfully imported ${result.success} record${result.success !== 1 ? 's' : ''}`, {
                style: {
                  background: 'hsl(142, 76%, 36%)',
                  color: 'white',
                  border: 'none',
                },
              });
            } else {
              toast(`Imported ${result.success} of ${entries.length} records. ${result.failed} failed.`, {
                style: {
                  background: 'hsl(45, 93%, 47%)',
                  color: 'white',
                  border: 'none',
                },
              });

              if (result.results.failed.length > 0) {
                const failedDetails = result.results.failed
                  .map((f) => `Row ${f.index}: ${f.error}`)
                  .join('\n');
                console.error('Failed entries:', failedDetails);
              }
            }
          } catch (error) {
            toast(error instanceof Error ? error.message : 'Failed to import records', {
              style: {
                background: 'hsl(0, 84%, 60%)',
                color: 'white',
                border: 'none',
              },
            });
            throw error;
          }
        }}
      />
    </div>
  );
};

export default Index;
