import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LeadRecord } from '@/types/record';
import { formatDateTimeIST } from '@/utils/dateUtils';
import { EmptyTrashConfirmDialog } from '@/components/dashboard/EmptyTrashConfirmDialog';

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  deletedRecords: LeadRecord[];
  onRestore?: (record: LeadRecord) => void;
  onPermanentDelete?: (record: LeadRecord) => void;
  onEmptyTrash?: () => void;
}

export function TrashModal({
  isOpen,
  onClose,
  deletedRecords,
  onRestore,
  onPermanentDelete,
  onEmptyTrash,
}: TrashModalProps) {
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
            className="relative z-[101] w-full max-w-6xl mx-4 rounded-lg border border-border bg-background p-6 shadow-xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-destructive/10 p-2">
                  <Trash2 className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Trash
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {deletedRecords.length} deleted record{deletedRecords.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {deletedRecords.length > 0 && onEmptyTrash && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onEmptyTrash()}
                    className="gap-2"
                  >
                    <Trash className="h-4 w-4" />
                    Empty Trash
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {deletedRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <Trash2 className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium text-foreground mb-2">
                    Trash is empty
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Deleted records will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deletedRecords.map((record) => (
                    <motion.div
                      key={record._id || record.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-lg border border-border bg-card p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Unique ID
                            </p>
                            <p className="text-sm font-mono text-foreground">
                              {record.uniqueId || '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Name
                            </p>
                            <p className="text-sm text-foreground">
                              {record.name || '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Email / Phone
                            </p>
                            <p className="text-sm text-foreground">
                              {record.email || record.phone || '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Source
                            </p>
                            <p className="text-sm text-foreground">
                              {record.source || '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Date Added
                            </p>
                            <p className="text-sm text-foreground">
                              {record.dateAdded ? formatDateTimeIST(record.dateAdded) : '—'}
                            </p>
                          </div>
                          {record.interests && record.interests.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                Interests
                              </p>
                              <p className="text-sm text-foreground">
                                {record.interests.join(', ')}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {onRestore && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onRestore(record)}
                              className="border-border"
                            >
                              Restore
                            </Button>
                          )}
                          {onPermanentDelete && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => onPermanentDelete(record)}
                            >
                              Delete Permanently
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-border"
              >
                Close
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// Separate component to handle the confirmation dialog
export function TrashModalWithConfirm({
  isOpen,
  onClose,
  deletedRecords,
  onRestore,
  onPermanentDelete,
  onEmptyTrash,
}: TrashModalProps) {
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);

  return (
    <>
      <TrashModal
        isOpen={isOpen}
        onClose={onClose}
        deletedRecords={deletedRecords}
        onRestore={onRestore}
        onPermanentDelete={onPermanentDelete}
        onEmptyTrash={() => {
          setShowEmptyConfirm(true);
        }}
      />
      <EmptyTrashConfirmDialog
        isOpen={showEmptyConfirm}
        recordCount={deletedRecords.length}
        onConfirm={() => {
          if (onEmptyTrash) {
            onEmptyTrash();
          }
          setShowEmptyConfirm(false);
        }}
        onCancel={() => setShowEmptyConfirm(false)}
      />
    </>
  );
}

