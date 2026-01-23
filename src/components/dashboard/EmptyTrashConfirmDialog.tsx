import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyTrashConfirmDialogProps {
  isOpen: boolean;
  recordCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function EmptyTrashConfirmDialog({
  isOpen,
  recordCount,
  onConfirm,
  onCancel,
}: EmptyTrashConfirmDialogProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onCancel]);

  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-[201] w-full max-w-sm mx-4 rounded-lg border border-border bg-background p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-destructive/10 p-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Empty Trash
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to permanently delete all{' '}
                <span className="font-medium text-foreground">
                  {recordCount} record{recordCount !== 1 ? 's' : ''}
                </span>
                {' '}in trash? This action cannot be undone.
              </p>
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  onClick={onCancel}
                  className="flex-1 border-border"
                >
                  Cancel
                </Button>
                <Button
                  onClick={onConfirm}
                  className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete All
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

