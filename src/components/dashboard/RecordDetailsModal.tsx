import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Mail, Phone, Tag, Globe, Calendar, FileText, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LeadRecord } from '@/types/record';

interface RecordDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: LeadRecord | null;
}

export function RecordDetailsModal({
  isOpen,
  onClose,
  record,
}: RecordDetailsModalProps) {
  const formatDateTime = (dateString: string) => {
    try {
      let date: Date;
      if (dateString.includes('T')) {
        date = new Date(dateString);
      } else {
        // If only date, assume midnight IST
        date = new Date(dateString + 'T00:00:00+05:30');
      }
      
      return date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch (error) {
      return dateString;
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
      {isOpen && record && (
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
            className="relative z-[101] w-full max-w-4xl mx-4 rounded-lg border border-border bg-background p-6 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                Record Details
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Unique ID */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Hash className="h-4 w-4" />
                  Unique ID
                </div>
                <p className="text-base text-foreground font-mono">
                  {record.uniqueId || '—'}
                </p>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <User className="h-4 w-4" />
                  Name
                </div>
                <p className="text-base text-foreground">
                  {record.name || '—'}
                </p>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  Email
                </div>
                <p className="text-base text-foreground">
                  {record.email || '—'}
                </p>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </div>
                <p className="text-base text-foreground">
                  {record.phone || '—'}
                </p>
              </div>

              {/* Source */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  Source
                </div>
                <p className="text-base text-foreground">
                  {record.source || '—'}
                </p>
              </div>

              {/* Date Added */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Date Added
                </div>
                <p className="text-base text-foreground">
                  {formatDateTime(record.dateAdded)}
                </p>
              </div>

              {/* Interests */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Tag className="h-4 w-4" />
                  Interests
                </div>
                {record.interests && record.interests.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {record.interests.map((interest, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="bg-muted text-foreground px-3 py-1"
                      >
                        {interest}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-base text-muted-foreground">—</p>
                )}
              </div>

              {/* Remarks */}
              {record.remarks && (
                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    Remarks
                  </div>
                  <p className="text-base text-foreground whitespace-pre-wrap">
                    {record.remarks}
                  </p>
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

