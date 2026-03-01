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
import { TelecallerLeadRecord } from '@/types/telecaller';

interface ParsedTelecallerEntry {
    id: string;
    leadName: string;
    phone: string;
    email: string;
    destination: string;
    source: string;
    adults: number;
    children: number;
    budget: number;
    travelDate: string;
    duration: string;
    remarks: string;
    errors: {
        phone?: string;
        source?: string;
        general?: string;
    };
}

interface TelecallerImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (entries: Partial<TelecallerLeadRecord>[]) => Promise<void>;
}

export function TelecallerImportModal({ isOpen, onClose, onSave }: TelecallerImportModalProps) {
    const [entries, setEntries] = useState<ParsedTelecallerEntry[]>([]);
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

    const validateEntry = (entry: Omit<ParsedTelecallerEntry, 'errors'>): ParsedTelecallerEntry['errors'] => {
        const errors: ParsedTelecallerEntry['errors'] = {};

        // Phone is required
        if (!entry.phone || !entry.phone.trim()) {
            errors.phone = 'Phone number required';
        }

        // Source defaults to 'Excel Import' if missing, but let's require it if strict, otherwise default
        if (!entry.source || !entry.source.trim()) {
            // We'll set default in parsing, so this might not occur
        }

        return errors;
    };

    const parseExcelFile = async (file: File) => {
        setIsProcessing(true);
        setFileName(file.name);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = new ExcelJS.Workbook();

            if (file.name.endsWith('.csv')) {
                await workbook.csv.load(arrayBuffer);
            } else {
                await workbook.xlsx.load(arrayBuffer);
            }

            const worksheet = workbook.worksheets[0];
            if (!worksheet) {
                throw new Error('No worksheet found in file');
            }

            const parsedEntries: ParsedTelecallerEntry[] = [];
            let headerRow: string[] = [];

            worksheet.eachRow((row, rowNumber) => {
                const rowValues = row.values as (string | number | undefined)[];
                const values = rowValues.slice(1).map(v => (v !== undefined && v !== null ? String(v).trim() : ''));

                if (rowNumber === 1) {
                    headerRow = values.map(v => v.toLowerCase());
                    return;
                }

                // Map columns
                const nameIdx = headerRow.findIndex(h => h.includes('name'));
                const phoneIdx = headerRow.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('contact'));
                const emailIdx = headerRow.findIndex(h => h.includes('email'));
                const destIdx = headerRow.findIndex(h => h.includes('destination') || h.includes('location'));
                const sourceIdx = headerRow.findIndex(h => h.includes('source'));
                const adultsIdx = headerRow.findIndex(h => h.includes('adult'));
                const childIdx = headerRow.findIndex(h => h.includes('child'));
                const dateIdx = headerRow.findIndex(h => h.includes('date'));
                const budgetIdx = headerRow.findIndex(h => h.includes('budget'));
                const durationIdx = headerRow.findIndex(h => h.includes('duration'));
                const remarksIdx = headerRow.findIndex(h => h.includes('remark') || h.includes('note'));


                const leadName = nameIdx >= 0 ? values[nameIdx] || '' : '';
                const phone = phoneIdx >= 0 ? values[phoneIdx] || '' : '';

                // Skip completely empty rows
                if (!leadName && !phone) return;

                const entryData = {
                    id: `${rowNumber}-${Date.now()}`,
                    leadName,
                    phone: phone.replace(/[^0-9+]/g, ''), // Basic cleanup
                    email: emailIdx >= 0 ? values[emailIdx] || '' : '',
                    destination: destIdx >= 0 ? values[destIdx] || '' : '',
                    source: sourceIdx >= 0 ? values[sourceIdx] || 'Excel Import' : 'Excel Import',
                    adults: adultsIdx >= 0 ? Number(values[adultsIdx]) || 0 : 0,
                    children: childIdx >= 0 ? Number(values[childIdx]) || 0 : 0,
                    travelDate: dateIdx >= 0 ? values[dateIdx] || '' : '',
                    budget: budgetIdx >= 0 ? Number(values[budgetIdx]) || 0 : 0,
                    duration: durationIdx >= 0 ? values[durationIdx] || '' : '',
                    remarks: remarksIdx >= 0 ? values[remarksIdx] || '' : '',
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
        if (e.dataTransfer.files?.[0]) parseExcelFile(e.dataTransfer.files[0]);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDownloadTemplate = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Leads Template');

        worksheet.columns = [
            { header: 'Lead Name', key: 'name', width: 20 },
            { header: 'Phone', key: 'phone', width: 15 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Destination', key: 'destination', width: 20 },
            { header: 'Source', key: 'source', width: 15 },
            { header: 'Travel Date', key: 'date', width: 15 },
            { header: 'Duration', key: 'duration', width: 15 },
            { header: 'Adults', key: 'adults', width: 10 },
            { header: 'Children', key: 'children', width: 10 },
            { header: 'Budget', key: 'budget', width: 15 },
            { header: 'Remarks', key: 'remarks', width: 30 },
        ];

        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' },
        };

        worksheet.addRow({
            name: 'John Doe',
            phone: '9876543210',
            email: 'john@example.com',
            destination: 'Bali',
            source: 'Website',
            date: '2026-04-15',
            duration: '5N/6D',
            adults: 2,
            children: 0,
            budget: 50000,
            remarks: 'Honeymoon trip',
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'leads_import_template.xlsx';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = async () => {
        const hasErrors = entries.some(e => Object.keys(e.errors).length > 0);
        if (hasErrors) return;

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

    const validCount = entries.filter(e => Object.keys(e.errors).length === 0).length;
    const errorCount = entries.filter(e => Object.keys(e.errors).length > 0).length;

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
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative z-[101] w-full max-w-6xl mx-4 rounded-lg border border-border bg-background p-6 shadow-xl max-h-[90vh] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-semibold text-foreground">Import Leads</h2>
                                {fileName && (
                                    <p className="text-sm text-muted-foreground mt-1">{fileName} • {entries.length} rows</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={handleDownloadTemplate} className="gap-2">
                                    <Download className="h-4 w-4" /> Template
                                </Button>
                                <Button variant="ghost" size="icon" onClick={onClose}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {entries.length === 0 ? (
                            <div
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onClick={() => fileInputRef.current?.click()}
                                className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition-colors min-h-[300px] ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
                                    }`}
                            >
                                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && parseExcelFile(e.target.files[0])} />
                                {isProcessing ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                        <p className="text-sm text-muted-foreground">Processing...</p>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                                        <p className="text-lg font-medium text-foreground mb-1">Drag and drop or click to upload</p>
                                        <p className="text-sm text-muted-foreground mb-4">.xlsx, .xls, .csv</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-green-500" /> {validCount} valid</div>
                                    {errorCount > 0 && <div className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" /> {errorCount} errors</div>}
                                    <Button variant="ghost" size="sm" onClick={() => { setEntries([]); setFileName(null); }} className="ml-auto">Reset</Button>
                                </div>
                                <div className="flex-1 overflow-auto border border-border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>#</TableHead>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Phone</TableHead>
                                                <TableHead>Destination</TableHead>
                                                <TableHead>Pax</TableHead>
                                                <TableHead>Budget</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {entries.map((e, i) => (
                                                <TableRow key={e.id} className={Object.keys(e.errors).length > 0 ? 'bg-destructive/5' : ''}>
                                                    <TableCell>{i + 1}</TableCell>
                                                    <TableCell>{e.leadName || '-'}</TableCell>
                                                    <TableCell className={e.errors.phone ? 'text-destructive font-medium' : ''}>{e.phone || '-'}</TableCell>
                                                    <TableCell>{e.destination || '-'}</TableCell>
                                                    <TableCell>{(e.adults || 0) + (e.children || 0)}</TableCell>
                                                    <TableCell>{e.budget || '-'}</TableCell>
                                                    <TableCell>
                                                        {Object.keys(e.errors).length > 0 ? (
                                                            <span className="text-xs text-destructive">{Object.values(e.errors).join(', ')}</span>
                                                        ) : <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}

                        {entries.length > 0 && (
                            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-border">
                                <Button variant="outline" onClick={onClose}>Cancel</Button>
                                <Button onClick={handleImport} disabled={isSaving || errorCount > 0}>
                                    {isSaving ? 'Importing...' : `Import ${validCount} Leads`}
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
