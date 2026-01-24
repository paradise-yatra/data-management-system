import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import ExcelJS from 'exceljs';

interface ParsedEntry {
  id: string;
  name: string;
  email: string;
  phone: string;
  interests: string[];
  source: string;
  remarks: string;
  errors: {
    source?: string;
    email?: string;
    general?: string;
  };
}

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: string[];
  onSave: (entries: Omit<ParsedEntry, 'id' | 'errors'>[]) => Promise<void>;
}

export function ExcelImportModal({ isOpen, onClose, sources, onSave }: ExcelImportModalProps) {
  const [entries, setEntries] = useState<ParsedEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setEntries([]);
      setFileName(null);
      setIsDragging(false);
      setIsProcessing(false);
    }
  }, [isOpen]);

  const validateEntry = (entry: Omit<ParsedEntry, 'errors'>): ParsedEntry['errors'] => {
    const errors: ParsedEntry['errors'] = {};

    // Source is required
    if (!entry.source || !entry.source.trim()) {
      errors.source = 'Source required';
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
        errors.email = 'Invalid email';
      }
    }

    return errors;
  };

  const parseExcelFile = async (file: File) => {
    setIsProcessing(true);
    setFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      
      // Check file type and load accordingly
      if (file.name.endsWith('.csv')) {
        await workbook.csv.load(arrayBuffer);
      } else {
        await workbook.xlsx.load(arrayBuffer);
      }

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new Error('No worksheet found in file');
      }

      const parsedEntries: ParsedEntry[] = [];
      let headerRow: string[] = [];

      worksheet.eachRow((row, rowNumber) => {
        const rowValues = row.values as (string | number | undefined)[];
        // Skip first element as ExcelJS uses 1-based indexing
        const values = rowValues.slice(1).map(v => (v !== undefined && v !== null ? String(v).trim() : ''));

        if (rowNumber === 1) {
          // First row is header
          headerRow = values.map(v => v.toLowerCase());
          return;
        }

        // Map columns to fields
        const nameIdx = headerRow.findIndex(h => h === 'name' || h === 'full name' || h === 'fullname');
        const emailIdx = headerRow.findIndex(h => h === 'email' || h === 'email address' || h === 'e-mail');
        const phoneIdx = headerRow.findIndex(h => h === 'phone' || h === 'mobile' || h === 'phone number' || h === 'contact');
        const sourceIdx = headerRow.findIndex(h => h === 'source' || h === 'lead source');
        const interestsIdx = headerRow.findIndex(h => h === 'interests' || h === 'interest' || h === 'packages');
        const remarksIdx = headerRow.findIndex(h => h === 'remarks' || h === 'notes' || h === 'comments');

        const name = nameIdx >= 0 ? values[nameIdx] || '' : '';
        const email = emailIdx >= 0 ? values[emailIdx] || '' : '';
        const phone = phoneIdx >= 0 ? values[phoneIdx] || '' : '';
        const source = sourceIdx >= 0 ? values[sourceIdx] || '' : '';
        const interestsRaw = interestsIdx >= 0 ? values[interestsIdx] || '' : '';
        const remarks = remarksIdx >= 0 ? values[remarksIdx] || '' : '';

        // Skip empty rows
        if (!name && !email && !phone && !source) {
          return;
        }

        // Parse interests (comma-separated)
        const interests = interestsRaw
          .split(',')
          .map(i => i.trim())
          .filter(i => i.length > 0);

        const entryData = {
          id: `${rowNumber}-${Date.now()}`,
          name,
          email,
          phone,
          interests,
          source,
          remarks,
        };

        const errors = validateEntry(entryData);
        parsedEntries.push({ ...entryData, errors });
      });

      setEntries(parsedEntries);
    } catch (error) {
      console.error('Error parsing file:', error);
      setEntries([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
      parseExcelFile(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseExcelFile(file);
    }
  };

  const handleDownloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template');

    // Add headers
    worksheet.columns = [
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Source', key: 'source', width: 15 },
      { header: 'Interests', key: 'interests', width: 30 },
      { header: 'Remarks', key: 'remarks', width: 30 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add sample row
    worksheet.addRow({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '9876543210',
      source: sources[0] || 'Website',
      interests: 'Bali Trip, Kerala Backwaters',
      remarks: 'VIP customer',
    });

    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import_template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    // Check if there are any errors
    const hasErrors = entries.some(e => Object.keys(e.errors).length > 0);
    if (hasErrors) {
      return;
    }

    setIsSaving(true);
    try {
      const validEntries = entries.map(({ id, errors, ...entry }) => entry);
      await onSave(validEntries);
      onClose();
    } catch (error) {
      console.error('Import error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setEntries([]);
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validCount = entries.filter(e => Object.keys(e.errors).length === 0).length;
  const errorCount = entries.filter(e => Object.keys(e.errors).length > 0).length;

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
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
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Import from Excel</h2>
                {fileName && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {fileName} • {entries.length} rows
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
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

            {/* Content */}
            {entries.length === 0 ? (
              /* Upload Zone */
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition-colors min-h-[300px] ${
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Processing file...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium text-foreground mb-1">
                      Drag and drop your file here
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      or click to browse • Supports .xlsx, .xls, .csv
                    </p>
                  </>
                )}
              </div>
            ) : (
              /* Data Preview Table */
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Status bar */}
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>{validCount} valid</span>
                  </div>
                  {errorCount > 0 && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span>{errorCount} with errors</span>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="ml-auto text-muted-foreground"
                  >
                    Upload different file
                  </Button>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto border border-border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead className="min-w-[120px]">Name</TableHead>
                        <TableHead className="min-w-[150px]">Email</TableHead>
                        <TableHead className="min-w-[120px]">Phone</TableHead>
                        <TableHead className="min-w-[120px]">Source</TableHead>
                        <TableHead className="min-w-[150px]">Interests</TableHead>
                        <TableHead className="min-w-[120px]">Remarks</TableHead>
                        <TableHead className="w-24">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry, index) => {
                        const hasErrors = Object.keys(entry.errors).length > 0;
                        const errorMessages = Object.values(entry.errors).join(', ');
                        
                        return (
                          <TableRow
                            key={entry.id}
                            className={hasErrors ? 'bg-destructive/5' : ''}
                          >
                            <TableCell className="font-medium text-muted-foreground">
                              {index + 1}
                            </TableCell>
                            <TableCell>{entry.name || '-'}</TableCell>
                            <TableCell className={entry.errors.email ? 'text-destructive' : ''}>
                              {entry.email || '-'}
                            </TableCell>
                            <TableCell>{entry.phone || '-'}</TableCell>
                            <TableCell className={entry.errors.source ? 'text-destructive' : ''}>
                              {entry.source || '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {entry.interests.length > 0 ? (
                                  entry.interests.map((interest, i) => (
                                    <Badge
                                      key={i}
                                      variant="secondary"
                                      className="text-xs px-1.5 h-5 bg-muted text-foreground"
                                    >
                                      {interest}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="truncate max-w-[150px]">
                              {entry.remarks || '-'}
                            </TableCell>
                            <TableCell>
                              {hasErrors ? (
                                <span className="text-xs text-destructive" title={errorMessages}>
                                  {errorMessages}
                                </span>
                              ) : (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Footer */}
            {entries.length > 0 && (
              <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="border-border"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={isSaving || errorCount > 0}
                  className="bg-foreground text-background hover:bg-foreground/90"
                >
                  {isSaving ? 'Importing...' : `Import ${validCount} Records`}
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
