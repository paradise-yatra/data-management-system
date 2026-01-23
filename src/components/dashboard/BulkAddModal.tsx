import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BulkEntry {
  id: string;
  name: string;
  email: string;
  phone: string;
  interests: string[];
  source: string;
  remarks: string;
  errors: {
    name?: string;
    email?: string;
    phone?: string;
    source?: string;
    interests?: string;
    general?: string;
  };
}

interface BulkAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: string[];
  onSave: (entries: Omit<BulkEntry, 'id' | 'errors'>[]) => Promise<void>;
}

export function BulkAddModal({ isOpen, onClose, sources, onSave }: BulkAddModalProps) {
  const [entries, setEntries] = useState<BulkEntry[]>([]);
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({});
  const [editingTagRow, setEditingTagRow] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Initialize with one empty entry
      setEntries([
        {
          id: Date.now().toString(),
          name: '',
          email: '',
          phone: '',
          interests: [],
          source: '',
          remarks: '',
          errors: {},
        },
      ]);
      setTagInputs({});
      setEditingTagRow(null);
    }
  }, [isOpen]);

  const addRow = () => {
    const newEntry: BulkEntry = {
      id: Date.now().toString() + Math.random(),
      name: '',
      email: '',
      phone: '',
      interests: [],
      source: '',
      remarks: '',
      errors: {},
    };
    setEntries([...entries, newEntry]);
  };

  const removeRow = (id: string) => {
    if (entries.length > 1) {
      setEntries(entries.filter((entry) => entry.id !== id));
      const newTagInputs = { ...tagInputs };
      delete newTagInputs[id];
      setTagInputs(newTagInputs);
      if (editingTagRow === id) {
        setEditingTagRow(null);
      }
    }
  };

  const updateEntry = (id: string, field: keyof Omit<BulkEntry, 'id' | 'errors'>, value: any) => {
    setEntries(
      entries.map((entry) => {
        if (entry.id === id) {
          return { ...entry, [field]: value, errors: {} };
        }
        return entry;
      })
    );
  };

  const addTag = (entryId: string) => {
    const tagInput = tagInputs[entryId]?.trim();
    if (tagInput) {
      setEntries(
        entries.map((entry) => {
          if (entry.id === entryId) {
            if (!entry.interests.includes(tagInput)) {
              return { ...entry, interests: [...entry.interests, tagInput] };
            }
            return entry;
          }
          return entry;
        })
      );
      setTagInputs({ ...tagInputs, [entryId]: '' });
    }
  };

  const removeTag = (entryId: string, tag: string) => {
    setEntries(
      entries.map((entry) => {
        if (entry.id === entryId) {
          return { ...entry, interests: entry.interests.filter((t) => t !== tag) };
        }
        return entry;
      })
    );
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, entryId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(entryId);
    }
    if (e.key === 'Escape') {
      setEditingTagRow(null);
      setTagInputs({ ...tagInputs, [entryId]: '' });
    }
  };

  const validateEntry = (entry: BulkEntry): BulkEntry['errors'] => {
    const errors: BulkEntry['errors'] = {};

    // Source is required
    if (!entry.source || !entry.source.trim()) {
      errors.source = 'Required';
    }

    // At least one of email or phone is required
    const hasEmail = entry.email && entry.email.trim();
    const hasPhone = entry.phone && entry.phone.trim();
    if (!hasEmail && !hasPhone) {
      errors.general = 'Email or Phone required';
    }

    // Email validation if provided
    if (hasEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(entry.email.trim())) {
        errors.email = 'Invalid';
      }
    }

    return errors;
  };

  const validateAll = (): boolean => {
    let isValid = true;
    const updatedEntries = entries.map((entry) => {
      const errors = validateEntry(entry);
      if (Object.keys(errors).length > 0) {
        isValid = false;
      }
      return { ...entry, errors };
    });
    setEntries(updatedEntries);
    return isValid;
  };

  const handleSave = async () => {
    if (!validateAll()) {
      return;
    }

    setIsSaving(true);
    try {
      const validEntries = entries.map(({ id, errors, ...entry }) => entry);
      await onSave(validEntries);
      onClose();
    } catch (error) {
      // Error is handled by parent component
      console.error('Bulk save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen && editingTagRow === null) {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, editingTagRow]);

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
            className="relative z-[101] w-full max-w-7xl mx-4 rounded-lg border border-border bg-background p-6 shadow-xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Bulk Add Records</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-auto border border-border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="min-w-[120px]">Name</TableHead>
                    <TableHead className="min-w-[150px]">
                      Email <span className="text-muted-foreground text-xs">(optional)</span>
                    </TableHead>
                    <TableHead className="min-w-[130px]">
                      Phone <span className="text-muted-foreground text-xs">(optional)</span>
                    </TableHead>
                    <TableHead className="min-w-[140px]">
                      Source <span className="text-destructive">*</span>
                    </TableHead>
                    <TableHead className="min-w-[180px]">Interests</TableHead>
                    <TableHead className="min-w-[150px]">Remarks</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry, index) => (
                    <TableRow key={entry.id} className={Object.keys(entry.errors).length > 0 ? 'bg-destructive/5' : ''}>
                      <TableCell className="font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={entry.name}
                          onChange={(e) => updateEntry(entry.id, 'name', e.target.value)}
                          placeholder="Name"
                          className="h-8 border-border bg-background"
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <Input
                            type="email"
                            value={entry.email}
                            onChange={(e) => updateEntry(entry.id, 'email', e.target.value)}
                            placeholder="Email"
                            className={`h-8 border-border bg-background ${
                              entry.errors.email ? 'border-destructive' : ''
                            }`}
                          />
                          {entry.errors.email && (
                            <p className="text-xs text-destructive mt-0.5">{entry.errors.email}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="tel"
                          value={entry.phone}
                          onChange={(e) => updateEntry(entry.id, 'phone', e.target.value)}
                          placeholder="Phone"
                          className="h-8 border-border bg-background"
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <Select
                            value={entry.source}
                            onValueChange={(value) => updateEntry(entry.id, 'source', value)}
                          >
                            <SelectTrigger
                              className={`h-8 border-border bg-background ${
                                entry.errors.source ? 'border-destructive' : ''
                              }`}
                            >
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent className="z-[110]">
                              {sources.map((source) => (
                                <SelectItem key={source} value={source}>
                                  {source}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {entry.errors.source && (
                            <p className="text-xs text-destructive mt-0.5">{entry.errors.source}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex flex-wrap gap-1">
                            {entry.interests.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="gap-1 h-5 text-xs px-1.5 bg-muted text-foreground"
                              >
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => removeTag(entry.id, tag)}
                                  className="hover:text-destructive"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                          {editingTagRow === entry.id ? (
                            <Input
                              autoFocus
                              value={tagInputs[entry.id] || ''}
                              onChange={(e) =>
                                setTagInputs({ ...tagInputs, [entry.id]: e.target.value })
                              }
                              onKeyDown={(e) => handleTagInputKeyDown(e, entry.id)}
                              onBlur={() => {
                                if (tagInputs[entry.id]?.trim()) {
                                  addTag(entry.id);
                                }
                                setEditingTagRow(null);
                              }}
                              placeholder="Type & Enter"
                              className="h-6 text-xs border-border bg-background"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditingTagRow(entry.id)}
                              className="text-xs text-muted-foreground hover:text-foreground"
                            >
                              + Add interest
                            </button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={entry.remarks}
                          onChange={(e) => updateEntry(entry.id, 'remarks', e.target.value)}
                          placeholder="Remarks"
                          className="h-8 border-border bg-background"
                        />
                      </TableCell>
                      <TableCell>
                        {entries.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeRow(entry.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {entries.some((e) => Object.keys(e.errors).length > 0) && (
              <div className="mt-2 text-xs text-destructive">
                Please fix errors before saving
              </div>
            )}

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={addRow}
                className="gap-2 border-border"
              >
                <Plus className="h-4 w-4" />
                Add Row
              </Button>
              <div className="flex gap-3">
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
                  disabled={isSaving}
                  className="bg-foreground text-background hover:bg-foreground/90"
                >
                  {isSaving ? 'Saving...' : `Save All (${entries.length})`}
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
