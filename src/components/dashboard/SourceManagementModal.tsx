import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SourceDeleteConfirmDialog } from '@/components/dashboard/SourceDeleteConfirmDialog';
import { sourcesAPI } from '@/services/api';

interface SourceManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: string[];
  onSourcesChange: (sources: string[], showNotification?: boolean) => void;
}

export function SourceManagementModal({
  isOpen,
  onClose,
  sources,
  onSourcesChange,
}: SourceManagementModalProps) {
  const [localSources, setLocalSources] = useState<string[]>([]);
  const [newSource, setNewSource] = useState('');
  const [sourceToDelete, setSourceToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLocalSources([...sources]);
      setNewSource('');
    }
  }, [isOpen, sources]);

  const handleAddSource = () => {
    const trimmed = newSource.trim();
    if (trimmed && !localSources.includes(trimmed)) {
      setLocalSources([...localSources, trimmed]);
      setNewSource('');
      toast.success('Source added', {
        style: {
          background: 'hsl(142, 76%, 36%)',
          color: 'white',
          border: 'none',
        },
      });
    }
  };

  const handleRemoveSource = (sourceToRemove: string) => {
    setSourceToDelete(sourceToRemove);
  };

  const handleConfirmDelete = async () => {
    if (!sourceToDelete) return;

    try {
      // Try to delete the source via API (this will check if it's in use)
      await sourcesAPI.delete(sourceToDelete);
      
      // If successful, remove from local list
      const updatedSources = localSources.filter((source) => source !== sourceToDelete);
      setLocalSources(updatedSources);
      
      // Update parent sources without showing notification
      await onSourcesChange(updatedSources, false);
      
      toast.error('Source deleted', {
        style: {
          background: 'hsl(0, 84%, 60%)',
          color: 'white',
          border: 'none',
        },
      });
      
      setSourceToDelete(null);
    } catch (error) {
      // Show error message from API
      toast.error(error instanceof Error ? error.message : 'Failed to delete source', {
        style: {
          background: 'hsl(0, 84%, 60%)',
          color: 'white',
          border: 'none',
        },
      });
      setSourceToDelete(null);
    }
  };

  const handleSave = async () => {
    try {
      await onSourcesChange(localSources);
      toast('Changes saved', {
        style: {
          background: 'hsl(45, 93%, 47%)',
          color: 'white',
          border: 'none',
        },
      });
      onClose();
    } catch (error) {
      // Error is handled by parent component
      // Don't close modal on error so user can retry
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSource();
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-[101] w-full max-w-2xl mx-4 rounded-lg border border-border bg-background p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                Source Management
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Add New Source</Label>
                <div className="flex gap-2">
                  <Input
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter source name"
                    className="border-border bg-background"
                  />
                  <Button
                    type="button"
                    onClick={handleAddSource}
                    variant="outline"
                    className="border-border whitespace-nowrap"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Sources ({localSources.length})</Label>
                <div className="rounded-lg border border-border bg-card p-4 max-h-64 overflow-y-auto">
                  {localSources.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No sources added yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {localSources.map((source) => (
                        <div
                          key={source}
                          className="flex items-center justify-between p-2 rounded border border-border bg-background hover:bg-muted/50 transition-colors"
                        >
                          <span className="text-sm text-foreground">{source}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveSource(source)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="border-border"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  className="bg-foreground text-background hover:bg-foreground/90"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </motion.div>
          <SourceDeleteConfirmDialog
            isOpen={!!sourceToDelete}
            sourceName={sourceToDelete}
            onConfirm={handleConfirmDelete}
            onCancel={() => setSourceToDelete(null)}
          />
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

