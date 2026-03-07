import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Download,
  FileImage,
  FileText,
  Loader2,
  MessageSquareShare,
  RefreshCw,
  Save,
  ShieldBan,
  Plus,
  Search,
  Eye,
  Calendar,
  CreditCard,
  ChevronDown,
  Edit,
} from 'lucide-react';
import { toast } from 'sonner';
import { Sidebar } from '@/components/Sidebar';
import { ReceiptEditorPanel } from '@/components/finance/ReceiptEditorPanel';
import { ReceiptDetailsPanel } from '@/components/finance/ReceiptDetailsPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { leadsPoolAPI } from '@/services/api';
import {
  financeApi,
  type PaymentMode,
  type ReceiptDocumentFormat,
  type ReceiptDocumentRecord,
  type ReceiptPayload,
  type ReceiptPreviewResponse,
  type ReceiptRecord,
  type ReceiptSettingsFormValues,
  type ReceiptSettingRecord,
  type ReceiptStatus,
} from '@/services/financeApi';
import type { LeadPoolRecord } from '@/types/leadsPool';

type FinanceRequestError = Error & {
  details?: unknown;
  status?: number;
};

const EMPTY_DRAFT: ReceiptPayload = {
  type: 'ADVANCE',
  linkedLeadId: null,
  customer: { leadName: '', phone: '', email: '', address: '' },
  tripDetails: { tripName: '', destination: '', travelStartDate: '', travelEndDate: '' },
  payment: {
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMode: 'UPI',
    transactionReference: '',
    receivedAmount: 0,
  },
  totals: { packageAmount: 0, previousPayments: 0 },
  notes: { publicNote: '', internalNote: '' },
};

const SETTINGS_KEY_MAP: Array<{ key: keyof ReceiptSettingsFormValues; settingKey: string; description: string }> = [
  { key: 'companyName', settingKey: 'company_name', description: 'Primary company name shown on receipts' },
  { key: 'companyAddress', settingKey: 'company_address', description: 'Company address block for receipt header' },
  { key: 'companyPhone', settingKey: 'company_phone', description: 'Finance contact number for receipts' },
  { key: 'companyEmail', settingKey: 'company_email', description: 'Finance contact email for receipts' },
  { key: 'companyWebsite', settingKey: 'company_website', description: 'Website shown in receipt header/footer' },
  { key: 'companyGstin', settingKey: 'company_gstin', description: 'Optional GSTIN field for finance receipts' },
  { key: 'logoUrl', settingKey: 'receipt_logo_url', description: 'Optional logo URL' },
  { key: 'footerNote', settingKey: 'receipt_footer_note', description: 'Footer note printed on exported receipts' },
  { key: 'primaryColor', settingKey: 'receipt_primary_color', description: 'Primary template color' },
  { key: 'accentColor', settingKey: 'receipt_accent_color', description: 'Accent template color' },
  { key: 'currencyCode', settingKey: 'receipt_currency_code', description: 'Currency code' },
  { key: 'locale', settingKey: 'receipt_locale', description: 'Default locale' },
  { key: 'timezone', settingKey: 'receipt_timezone', description: 'Default timezone' },
];

const DEFAULT_SETTINGS: ReceiptSettingsFormValues = {
  companyName: 'Paradise Yatra',
  companyAddress: '',
  companyPhone: '',
  companyEmail: '',
  companyWebsite: '',
  companyGstin: '',
  logoUrl: '',
  footerNote: 'This is a system-generated receipt and is valid without signature.',
  primaryColor: '#0f766e',
  accentColor: '#7c2d12',
  currencyCode: 'INR',
  locale: 'en-IN',
  timezone: 'Asia/Kolkata',
};

const COMPANY_SETTING_FIELDS: Array<{ key: keyof ReceiptSettingsFormValues; label: string; multiline?: boolean; full?: boolean }> = [
  { key: 'companyName', label: 'Company Name', full: true },
  { key: 'companyAddress', label: 'Company Address', multiline: true, full: true },
  { key: 'companyPhone', label: 'Phone' },
  { key: 'companyEmail', label: 'Email' },
  { key: 'companyWebsite', label: 'Website' },
  { key: 'companyGstin', label: 'GSTIN' },
  { key: 'logoUrl', label: 'Logo URL', full: true },
];

const TEMPLATE_SETTING_FIELDS: Array<{ key: keyof ReceiptSettingsFormValues; label: string; multiline?: boolean; full?: boolean }> = [
  { key: 'primaryColor', label: 'Primary Color' },
  { key: 'accentColor', label: 'Accent Color' },
  { key: 'currencyCode', label: 'Currency Code' },
  { key: 'locale', label: 'Locale' },
  { key: 'timezone', label: 'Timezone', full: true },
  { key: 'footerNote', label: 'Footer Note', multiline: true, full: true },
];

function receiptToDraft(receipt: ReceiptRecord): ReceiptPayload {
  return {
    type: receipt.type,
    linkedLeadId: receipt.linkedLeadId,
    linkedTripId: receipt.linkedTripId,
    customer: { ...receipt.customer },
    tripDetails: {
      ...receipt.tripDetails,
      travelStartDate: receipt.tripDetails.travelStartDate ? receipt.tripDetails.travelStartDate.slice(0, 10) : '',
      travelEndDate: receipt.tripDetails.travelEndDate ? receipt.tripDetails.travelEndDate.slice(0, 10) : '',
    },
    payment: {
      ...receipt.payment,
      paymentDate: receipt.payment.paymentDate ? receipt.payment.paymentDate.slice(0, 10) : '',
    },
    totals: {
      packageAmount: receipt.totals.packageAmount,
      previousPayments: receipt.totals.previousPayments,
    },
    notes: {
      publicNote: receipt.notes.publicNote,
      internalNote: receipt.notes.internalNote,
    },
    brandingSnapshot: receipt.brandingSnapshot,
  };
}

function settingsToForm(settings: ReceiptSettingRecord[]) {
  const next = { ...DEFAULT_SETTINGS };
  for (const field of SETTINGS_KEY_MAP) {
    const found = settings.find((setting) => setting.key === field.settingKey);
    if (found?.value != null) next[field.key] = String(found.value);
  }
  return next;
}

function normalizeLeadTravelDate(value?: string) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

function validateReceiptSubmission(receipt: ReceiptPayload) {
  const errors: string[] = [];

  if (!receipt.customer?.leadName?.trim()) {
    errors.push('Customer name is required.');
  }

  if (!receipt.payment?.paymentDate) {
    errors.push('Payment date is required.');
  }

  if (!receipt.payment?.receivedAmount || Number(receipt.payment.receivedAmount) <= 0) {
    errors.push('Received amount must be greater than zero.');
  }

  if (!receipt.totals?.packageAmount || Number(receipt.totals.packageAmount) <= 0) {
    errors.push('Package amount must be greater than zero.');
  }

  return errors;
}

function getErrorDetails(error: unknown) {
  const details = (error as FinanceRequestError | undefined)?.details;
  if (Array.isArray(details)) {
    return details.filter((detail): detail is string => typeof detail === 'string' && detail.trim().length > 0);
  }
  return [];
}

function showErrorToast(error: unknown, fallbackMessage: string) {
  const message = error instanceof Error ? error.message : fallbackMessage;
  const details = getErrorDetails(error);

  if (details.length > 0) {
    toast.error(message, {
      description: details.join(' '),
    });
    return;
  }

  toast.error(message);
}

function buildReceiptFileName(customerName: string | undefined, extension: string) {
  const normalizedName = (customerName || 'Customer')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return `Payment Receipt For ${normalizedName || 'Customer'}.${extension}`;
}

export default function FinanceReceipts() {
  const location = useLocation();
  const isHistory = location.pathname.endsWith('/history');
  const isSettings = location.pathname.endsWith('/settings');
  const isAllReceipts = !isHistory && !isSettings;

  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [documents, setDocuments] = useState<ReceiptDocumentRecord[]>([]);
  const [leads, setLeads] = useState<LeadPoolRecord[]>([]);
  const [settingsForm, setSettingsForm] = useState<ReceiptSettingsFormValues>(DEFAULT_SETTINGS);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<ReceiptRecord | null>(null);
  const [draft, setDraft] = useState<ReceiptPayload>(EMPTY_DRAFT);
  const [preview, setPreview] = useState<ReceiptPreviewResponse | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [renderingFormat, setRenderingFormat] = useState<ReceiptDocumentFormat | null>(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportMessage, setExportMessage] = useState('Preparing export');
  const [savingSettings, setSavingSettings] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReceiptStatus | 'ALL'>('ALL');
  const [paymentModeFilter, setPaymentModeFilter] = useState<PaymentMode | 'ALL'>('ALL');
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const loadReceipts = useCallback(async () => {
    const response = await financeApi.receipts.list({ search, status: statusFilter, paymentMode: paymentModeFilter });
    setReceipts(response.data || []);
    return response.data || [];
  }, [paymentModeFilter, search, statusFilter]);

  const loadDocuments = useCallback(async (receiptId: string) => {
    setLoadingDocuments(true);
    try {
      const response = await financeApi.receipts.listDocuments(receiptId);
      setDocuments(response.data || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load receipt documents');
      setDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  }, []);

  const initializeWorkspace = useCallback(async () => {
    setLoadingWorkspace(true);
    try {
      const [receiptList, leadList, settingsList] = await Promise.all([
        loadReceipts(),
        leadsPoolAPI.getAll(),
        financeApi.settings.list().then((response) => response.data || []),
      ]);
      setLeads(leadList);
      setSettingsForm(settingsToForm(settingsList));

      if (selectedReceiptId) {
        const existing = receiptList.find((receipt) => receipt._id === selectedReceiptId) || null;
        if (existing) {
          setActiveReceipt(existing);
          setDraft(receiptToDraft(existing));
          await loadDocuments(existing._id);
        }
      } else if (receiptList.length > 0 && !isFormModalOpen) {
        const latest = receiptList[0];
        setSelectedReceiptId(latest._id);
        setActiveReceipt(latest);
        setDraft(receiptToDraft(latest));
        await loadDocuments(latest._id);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to initialize finance workspace');
    } finally {
      setLoadingWorkspace(false);
    }
  }, [loadDocuments, loadReceipts, selectedReceiptId, isFormModalOpen]);

  useEffect(() => {
    void initializeWorkspace();
  }, [initializeWorkspace]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadReceipts(), 250);
    return () => window.clearTimeout(timer);
  }, [loadReceipts]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setPreviewing(true);
      try {
        const response = await financeApi.receipts.preview(draft);
        setPreview(response.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to refresh preview');
      } finally {
        setPreviewing(false);
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [draft]);

  useEffect(() => {
    if (!renderingFormat) {
      setExportProgress(0);
      setExportMessage('Preparing export');
    }
  }, [renderingFormat]);

  const receiptCounts = useMemo(
    () => ({
      total: receipts.length,
      issued: receipts.filter((receipt) => receipt.status === 'ISSUED').length,
      void: receipts.filter((receipt) => receipt.status === 'VOID').length,
    }),
    [receipts]
  );

  const sortedHistory = useMemo(
    () => [...(activeReceipt?.activityTrail || [])].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [activeReceipt]
  );

  const workspaceReceivedTotal = useMemo(
    () => receipts.reduce((sum, receipt) => sum + (receipt.payment.receivedAmount || 0), 0),
    [receipts]
  );

  const isVoidReceipt = activeReceipt?.status === 'VOID';
  const validationErrors = useMemo(() => validateReceiptSubmission(draft), [draft]);

  const activeCurrencyCode =
    preview?.viewModel?.agency?.currencyCode ||
    activeReceipt?.brandingSnapshot?.currencyCode ||
    settingsForm.currencyCode ||
    'INR';

  const formatCurrency = useCallback(
    (value: number) =>
      new Intl.NumberFormat('en-IN', { style: 'currency', currency: activeCurrencyCode, maximumFractionDigits: 0 }).format(value || 0),
    [activeCurrencyCode]
  );

  const refreshAfterMutation = useCallback(
    async (nextSelectedId: string | null) => {
      const receiptList = await loadReceipts();
      if (!nextSelectedId) {
        setActiveReceipt(null);
        setSelectedReceiptId(null);
        setDocuments([]);
        return;
      }
      const latest = receiptList.find((receipt) => receipt._id === nextSelectedId) || null;
      setActiveReceipt(latest);
      if (latest) {
        setSelectedReceiptId(latest._id);
        setDraft(receiptToDraft(latest));
        setDirty(false);
        await loadDocuments(latest._id);
      }
    },
    [loadDocuments, loadReceipts]
  );

  const ensureSavedReceipt = useCallback(async () => {
    if (activeReceipt?._id) {
      if (!dirty) return activeReceipt;
      setSaving(true);
      try {
        const response = await financeApi.receipts.update(activeReceipt._id, draft);
        toast.success(response.message || 'Receipt updated successfully');
        await refreshAfterMutation(response.data._id);
        return response.data;
      } finally {
        setSaving(false);
      }
    }
    setSaving(true);
    try {
      const response = await financeApi.receipts.create(draft);
      toast.success(response.message || 'Receipt created successfully');
      await refreshAfterMutation(response.data._id);
      return response.data;
    } finally {
      setSaving(false);
    }
  }, [activeReceipt, dirty, draft, refreshAfterMutation]);

  const handleCreateFresh = () => {
    setSelectedReceiptId(null);
    setActiveReceipt(null);
    setDraft(EMPTY_DRAFT);
    setDocuments([]);
    setDirty(false);
    setIsFormModalOpen(true);
  };

  const syncReceiptWorkspace = useCallback(
    async (receipt: ReceiptRecord | null) => {
      setSelectedReceiptId(receipt?._id || null);
      setActiveReceipt(receipt);

      if (!receipt) {
        setDocuments([]);
        return;
      }

      setDraft(receiptToDraft(receipt));
      setDirty(false);
      await loadDocuments(receipt._id);
    },
    [loadDocuments]
  );

  const openReceiptDetails = useCallback(
    (receipt: ReceiptRecord) => {
      void syncReceiptWorkspace(receipt);
      setIsDetailsModalOpen(true);
    },
    [syncReceiptWorkspace]
  );

  const openReceiptEditor = useCallback(
    (receipt: ReceiptRecord) => {
      setIsDetailsModalOpen(false);
      void syncReceiptWorkspace(receipt);
      setIsFormModalOpen(true);
    },
    [syncReceiptWorkspace]
  );

  const openVoidDialog = useCallback(
    (receipt: ReceiptRecord) => {
      void syncReceiptWorkspace(receipt);
      setVoidReason('');
      setVoidDialogOpen(true);
    },
    [syncReceiptWorkspace]
  );

  const updateDraft = (updater: (current: ReceiptPayload) => ReceiptPayload) => {
    setDraft((current) => updater(current));
    setDirty(true);
  };

  const handleSelectLead = (leadId: string) => {
    const lead = leads.find((item) => item._id === leadId);
    updateDraft((current) => ({
      ...current,
      linkedLeadId: leadId,
      customer: {
        ...current.customer,
        leadName: lead?.leadName || current.customer?.leadName || '',
        phone: lead?.phone || current.customer?.phone || '',
        email: lead?.email || current.customer?.email || '',
      },
      tripDetails: {
        ...current.tripDetails,
        destination: lead?.destination || current.tripDetails?.destination || '',
        travelStartDate: current.tripDetails?.travelStartDate || normalizeLeadTravelDate(lead?.travelDate),
      },
    }));
  };

  const handleSave = async () => {
    if (!isVoidReceipt && validationErrors.length > 0) {
      toast.error(activeReceipt ? 'Complete the required fields before saving changes' : 'Complete the required fields before creating the receipt', {
        description: validationErrors.join(' '),
      });
      return;
    }

    try {
      await ensureSavedReceipt();
      setIsFormModalOpen(false);
    } catch (error) {
      showErrorToast(error, 'Failed to save receipt');
    }
  };

  const handleVoid = async () => {
    if (!activeReceipt?._id) return;
    if (!voidReason.trim()) {
      toast.error('Void reason is required');
      return;
    }
    try {
      const response = await financeApi.receipts.void(activeReceipt._id, voidReason.trim());
      toast.success(response.message || 'Receipt voided successfully');
      setVoidDialogOpen(false);
      setVoidReason('');
      await refreshAfterMutation(response.data._id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to void receipt');
    }
  };

  const handleRender = async (format: ReceiptDocumentFormat, receiptOverride?: ReceiptRecord | null) => {
    const targetReceipt = receiptOverride || activeReceipt;

    if (!targetReceipt?._id) {
      toast.error('Open a receipt before exporting documents');
      return;
    }

    setRenderingFormat(format);
    setExportProgress(3);
    setExportMessage('Starting export');
    try {
      const jobStart = await financeApi.receipts.startRenderJob(targetReceipt._id, format);
      let job = jobStart.data;

      setExportProgress(job.progress || 5);
      setExportMessage(job.message || 'Starting export');

      while (job.status === 'queued' || job.status === 'running') {
        await new Promise((resolve) => window.setTimeout(resolve, 220));
        const polled = await financeApi.receipts.getRenderJob(targetReceipt._id, job.jobId);
        job = polled.data;
        setExportProgress(job.progress);
        setExportMessage(job.message || `Generating ${format} export`);
      }

      if (job.status !== 'completed' || !job.documentId) {
        throw new Error(job.error || job.message || `Failed to export ${format}`);
      }

      setExportProgress(100);
      setExportMessage('Downloading file');
      toast.success(`${format} generated successfully`);
      await loadDocuments(targetReceipt._id);
      const blob = await financeApi.receipts.downloadDocument(targetReceipt._id, job.documentId);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = buildReceiptFileName(
        targetReceipt.customer?.leadName,
        format === 'PDF' ? 'pdf' : format === 'PNG' ? 'png' : 'jpg'
      );
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
      await refreshAfterMutation(targetReceipt._id);
      await new Promise((resolve) => window.setTimeout(resolve, 220));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to export ${format}`);
    } finally {
      setRenderingFormat(null);
    }
  };

  const handleDownload = async (doc: ReceiptDocumentRecord) => {
    if (!activeReceipt?._id) return;
    try {
      const blob = await financeApi.receipts.downloadDocument(activeReceipt._id, doc._id);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = buildReceiptFileName(
        activeReceipt.customer?.leadName,
        doc.format === 'PDF' ? 'pdf' : doc.format === 'PNG' ? 'png' : 'jpg'
      );
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
      await refreshAfterMutation(activeReceipt._id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to download document');
    }
  };

  const handleCopyWhatsApp = async () => {
    const text = preview?.viewModel.whatsAppSummary;
    if (!text) {
      toast.error('Nothing to copy yet');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success('WhatsApp summary copied');
    } catch {
      toast.error('Failed to copy WhatsApp summary');
    }
  };

  const updateSettingField = (key: keyof ReceiptSettingsFormValues, value: string) => {
    setSettingsForm((current) => ({ ...current, [key]: value }));
    setSettingsDirty(true);
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await Promise.all(
        SETTINGS_KEY_MAP.map((item) =>
          financeApi.settings.update(item.settingKey, { value: settingsForm[item.key], description: item.description })
        )
      );
      const latest = await financeApi.settings.list();
      setSettingsForm(settingsToForm(latest.data || []));
      setSettingsDirty(false);
      toast.success('Receipt settings saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const renderSettingField = (field: (typeof COMPANY_SETTING_FIELDS)[number] | (typeof TEMPLATE_SETTING_FIELDS)[number]) => (
    <div key={field.key} className={`space-y-1 ${field.full ? 'md:col-span-2' : ''}`}>
      <Label>{field.label}</Label>
      {field.multiline ? (
        <Textarea value={settingsForm[field.key]} onChange={(event) => updateSettingField(field.key, event.target.value)} />
      ) : (
        <Input value={settingsForm[field.key]} onChange={(event) => updateSettingField(field.key, event.target.value)} />
      )}
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar project="finance" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-4 border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-3 w-full">
            <div className="rounded-full bg-primary/10 p-2">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-foreground">
                {isAllReceipts ? 'Finance Receipts' : isHistory ? 'History & Exports' : 'Receipt Settings'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isAllReceipts
                  ? `${receiptCounts.total} receipts \u2022 ${receiptCounts.issued} active \u2022 ${receiptCounts.void} voided`
                  : isHistory
                    ? 'View exported documents and activity log'
                    : 'Configure receipt branding and template controls'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isAllReceipts && (
                <Button type="button" onClick={handleCreateFresh} className="gap-2 shadow-sm">
                  <Plus className="h-4 w-4" />
                  New Receipt
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-muted/10 p-6">
          {loadingWorkspace && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading finance receipts&hellip;
            </div>
          )}
          {isAllReceipts ? (
            /* â”€â”€ ALL RECEIPTS FULL-WIDTH TABLE VIEW â”€â”€ */
            <div className="h-full flex flex-col gap-5">
              {/* Filters Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, receipt no, or phone..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ReceiptStatus | 'ALL')}>
                    <SelectTrigger className="h-9 min-w-[140px]">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All statuses</SelectItem>
                      <SelectItem value="ISSUED">Issued</SelectItem>
                      <SelectItem value="VOID">Void</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={paymentModeFilter}
                    onValueChange={(value) => setPaymentModeFilter(value as PaymentMode | 'ALL')}
                  >
                    <SelectTrigger className="h-9 min-w-[160px]">
                      <SelectValue placeholder="All payment modes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All payment modes</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="sm" onClick={() => void loadReceipts()} className="gap-2 h-9">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid gap-4 sm:grid-cols-4">
                {[
                  { label: 'Total Receipts', value: String(receiptCounts.total), accent: 'text-foreground' },
                  { label: 'Active (Issued)', value: String(receiptCounts.issued), accent: 'text-emerald-600' },
                  { label: 'Voided', value: String(receiptCounts.void), accent: 'text-amber-600' },
                  { label: 'Total Received', value: formatCurrency(workspaceReceivedTotal), accent: 'text-primary' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                    <p className={`mt-1 text-xl font-bold ${stat.accent}`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Receipts Table */}
              <div className="flex-1 min-h-0 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="h-full overflow-auto">
                  {receipts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground/30" />
                      <div>
                        <p className="font-semibold text-foreground">No receipts found</p>
                        <p className="mt-1 text-sm text-muted-foreground">Create your first receipt to get started.</p>
                      </div>
                      <Button type="button" onClick={handleCreateFresh} className="gap-2 mt-2">
                        <Plus className="h-4 w-4" />
                        Create Receipt
                      </Button>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="bg-card px-4 py-3 text-left font-medium shadow-[inset_0_-1px_0_hsl(var(--border))]">Receipt #</th>
                          <th className="bg-card px-4 py-3 text-left font-medium shadow-[inset_0_-1px_0_hsl(var(--border))]">Customer</th>
                          <th className="bg-card px-4 py-3 text-left font-medium shadow-[inset_0_-1px_0_hsl(var(--border))]">Type</th>
                          <th className="bg-card px-4 py-3 text-left font-medium shadow-[inset_0_-1px_0_hsl(var(--border))]">Status</th>
                          <th className="bg-card px-4 py-3 text-left font-medium shadow-[inset_0_-1px_0_hsl(var(--border))]">Payment</th>
                          <th className="bg-card px-4 py-3 text-right font-medium shadow-[inset_0_-1px_0_hsl(var(--border))]">Amount</th>
                          <th className="bg-card px-4 py-3 text-left font-medium shadow-[inset_0_-1px_0_hsl(var(--border))]">Date</th>
                          <th className="bg-card px-4 py-3 text-left font-medium shadow-[inset_0_-1px_0_hsl(var(--border))]">Created By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {receipts.map((receipt) => (
                          <ContextMenu key={receipt._id}>
                            <ContextMenuTrigger asChild>
                              <tr
                                className="transition-colors hover:bg-muted/20 cursor-pointer"
                                onClick={() => openReceiptDetails(receipt)}
                              >
                                <td className="px-4 py-3 font-medium text-foreground">
                                  {receipt.receiptNumber || <span className="text-muted-foreground italic">Pending</span>}
                                </td>
                                <td className="px-4 py-3">
                                  <div>
                                    <p className="font-medium text-foreground">{receipt.customer.leadName || '\u2014'}</p>
                                    {receipt.customer.phone && <p className="text-xs text-muted-foreground">{receipt.customer.phone}</p>}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <Badge variant="outline" className="border-border bg-muted/30 text-foreground text-xs">{receipt.type}</Badge>
                                </td>
                                <td className="px-4 py-3">
                                  <Badge
                                    variant="outline"
                                    className={
                                      receipt.status === 'ISSUED'
                                        ? 'border-emerald-300/50 bg-emerald-500/10 text-emerald-700'
                                        : receipt.status === 'VOID'
                                          ? 'border-rose-300/50 bg-rose-500/10 text-rose-700'
                                          : 'border-amber-300/50 bg-amber-500/10 text-amber-700'
                                    }
                                  >
                                    {receipt.status}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <CreditCard className="h-3.5 w-3.5" />
                                    <span className="text-xs">{receipt.payment.paymentMode}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right font-semibold text-foreground tabular-nums">
                                  {formatCurrency(receipt.payment.receivedAmount)}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span className="text-xs">{new Date(receipt.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-left">
                                  <span className="text-xs text-muted-foreground">
                                    {receipt.createdByName || '—'}
                                  </span>
                                </td>
                              </tr>
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                              <ContextMenuItem
                                onClick={() => openReceiptDetails(receipt)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Open
                              </ContextMenuItem>
                              {receipt.status !== 'VOID' && (
                                <ContextMenuItem onClick={() => openReceiptEditor(receipt)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </ContextMenuItem>
                              )}
                              {receipt.status === 'ISSUED' && (
                                <>
                                  <ContextMenuSeparator />
                                  <ContextMenuItem onClick={() => void handleRender('PDF', receipt)}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    Export PDF
                                  </ContextMenuItem>
                                  <ContextMenuItem onClick={() => void handleRender('PNG', receipt)}>
                                    <FileImage className="mr-2 h-4 w-4" />
                                    Export PNG
                                  </ContextMenuItem>
                                  <ContextMenuItem onClick={() => void handleRender('JPG', receipt)}>
                                    <FileImage className="mr-2 h-4 w-4" />
                                    Export JPG
                                  </ContextMenuItem>
                                  <ContextMenuSeparator />
                                  <ContextMenuItem
                                    className="text-destructive"
                                    onClick={() => openVoidDialog(receipt)}
                                  >
                                    <ShieldBan className="mr-2 h-4 w-4" />
                                    Void Receipt
                                  </ContextMenuItem>
                                </>
                              )}
                            </ContextMenuContent>
                          </ContextMenu>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          ) : isSettings ? (
            /* â”€â”€ SETTINGS VIEW â”€â”€ */
            <ScrollArea className="h-full bg-card rounded-xl border border-border p-6 shadow-sm">
              <div className="max-w-4xl mx-auto flex flex-col gap-6 w-full">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/15 px-4 py-3">
                  <div>
                    <p className="font-semibold text-lg">Receipt Branding Settings</p>
                    <p className="text-sm text-muted-foreground">These values populate new receipts and branding snapshots.</p>
                  </div>
                  <Button type="button" onClick={() => void handleSaveSettings()} disabled={!settingsDirty || savingSettings}>
                    {savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Configuration
                  </Button>
                </div>

                <Card className="border-border shadow-sm">
                  <CardHeader className="pb-3 border-b border-border/50 mb-4 bg-muted/10">
                    <CardTitle className="text-base text-primary font-bold tracking-tight">Company Details</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-6 md:grid-cols-2">
                    {COMPANY_SETTING_FIELDS.map(renderSettingField)}
                  </CardContent>
                </Card>

                <Card className="border-border shadow-sm">
                  <CardHeader className="pb-3 border-b border-border/50 mb-4 bg-muted/10">
                    <CardTitle className="text-base text-primary font-bold tracking-tight">Template Controls</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-6 md:grid-cols-2">
                    {TEMPLATE_SETTING_FIELDS.map(renderSettingField)}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          ) : isHistory ? (
            /* â”€â”€ HISTORY & EXPORTS VIEW â”€â”€ */
            <Tabs defaultValue="documents" className="flex h-full flex-col bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="border-b border-border bg-muted/20 px-4 py-2 flex justify-between items-center">
                <TabsList className="grid w-[400px] grid-cols-2">
                  <TabsTrigger value="documents">Exported Documents</TabsTrigger>
                  <TabsTrigger value="history">Activity Log</TabsTrigger>
                </TabsList>
                <Button type="button" variant="outline" size="sm" onClick={() => void initializeWorkspace()} className="h-8 gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Refresh History
                </Button>
              </div>

              <div className="flex-1 min-h-0">
                <TabsContent value="documents" className="m-0 h-full data-[state=active]:block p-4">
                  <ScrollArea className="h-full">
                    <div className="space-y-3">
                      {loadingDocuments ? (
                        <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/15 px-4 py-6 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading document history...
                        </div>
                      ) : documents.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                          No exported documents yet. Open a receipt and use Export to generate PDF or image versions.
                        </div>
                      ) : (
                        documents.map((document) => (
                          <div key={document._id} className="rounded-xl border border-border bg-background p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 transition-colors hover:bg-muted/10 shadow-sm">
                            <div>
                              <div className="flex items-center gap-3">
                                <p className="font-semibold text-foreground">{document.format} Export <span className="text-muted-foreground font-normal ml-1">v{document.version}</span></p>
                                <Badge variant="outline" className={document.status === 'SUCCESS' ? 'border-emerald-300/50 bg-emerald-500/10 text-emerald-700' : 'border-rose-300/50 bg-rose-500/10 text-rose-700'}>
                                  {document.status}
                                </Badge>
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground font-medium">{new Date(document.generatedAt).toLocaleString('en-IN')} &bull; {(document.fileSizeBytes / 1024).toFixed(1)} KB</p>
                            </div>

                            <div>
                              {document.status === 'SUCCESS' ? (
                                <Button type="button" size="sm" onClick={() => void handleDownload(document)} className="gap-2 shadow-sm">
                                  <Download className="h-4 w-4" />
                                  Download File
                                </Button>
                              ) : (
                                <span className="text-xs text-rose-500 bg-rose-500/10 px-2 py-1 rounded-md">{document.failureReason || 'Export failed'}</span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="history" className="m-0 h-full data-[state=active]:block p-4">
                  <ScrollArea className="h-full">
                    <div className="space-y-3">
                      {sortedHistory.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                          No activity history available yet.
                        </div>
                      ) : (
                        sortedHistory.map((entry) => (
                          <div key={entry._id} className="rounded-xl border border-border bg-background p-4 shadow-sm">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold capitalize text-foreground">{entry.action.replace(/_/g, ' ')}</p>
                              <span className="text-[11px] font-medium text-muted-foreground px-2 py-0.5 bg-muted rounded-md">{new Date(entry.timestamp).toLocaleString('en-IN')}</span>
                            </div>
                            <p className="mt-1.5 text-sm text-muted-foreground">Action performed by <span className="font-medium text-foreground">{entry.actorName || 'System'}</span></p>
                            {entry.details && (
                              <pre className="mt-3 overflow-auto rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                                {JSON.stringify(entry.details, null, 2)}
                              </pre>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>
          ) : null}
        </main>
      </div>

      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="w-full max-w-5xl max-h-[90vh] overflow-y-auto mx-4 rounded-lg border border-border bg-background p-6 shadow-xl [&>button]:hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-4 mb-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <h3 className="text-lg font-semibold">{activeReceipt?.receiptNumber || 'Receipt'}</h3>
                <p className="text-xs text-muted-foreground">Customer: {activeReceipt?.customer.leadName || 'N/A'}</p>
              </div>
              <Badge
                variant="outline"
                className={
                  activeReceipt?.status === 'ISSUED'
                    ? 'border-emerald-300/50 bg-emerald-500/10 text-emerald-700'
                    : activeReceipt?.status === 'VOID'
                      ? 'border-rose-300/50 bg-rose-500/10 text-rose-700'
                      : 'border-amber-300/50 bg-amber-500/10 text-amber-700'
                }
              >
                {activeReceipt?.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {activeReceipt?.status === 'ISSUED' && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Download className="h-4 w-4" />
                        Export
                        <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[150px]">
                      <DropdownMenuItem onClick={() => void handleRender('PDF')}>
                        <FileText className="mr-2 h-4 w-4" /> PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void handleRender('PNG')}>
                        <FileImage className="mr-2 h-4 w-4" /> PNG
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void handleRender('JPG')}>
                        <FileImage className="mr-2 h-4 w-4" /> JPG
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      if (activeReceipt) {
                        openVoidDialog(activeReceipt);
                      }
                    }}
                  >
                    <ShieldBan className="h-4 w-4" />
                    Void
                  </Button>
                </>
              )}
              <Button
                variant="default"
                size="sm"
                className="gap-2"
                onClick={() => {
                  if (activeReceipt) {
                    openReceiptEditor(activeReceipt);
                  }
                }}
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsDetailsModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
          <ReceiptDetailsPanel receipt={activeReceipt} />
        </DialogContent>
      </Dialog>

      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent className="w-full max-w-5xl max-h-[90vh] overflow-y-auto mx-4 rounded-lg border border-border bg-background p-6 shadow-xl [&>button]:hidden">
          <div className="flex flex-col gap-4 border-b border-border pb-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <h3 className="text-lg font-semibold">
                  {activeReceipt ? `Edit Receipt: ${activeReceipt.receiptNumber || 'Receipt'}` : 'New Receipt'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {activeReceipt ? 'Modify existing receipt' : 'Create a new receipt entry'}
                </p>
                {isVoidReceipt && (
                  <p className="mt-1 text-[11px] font-medium text-amber-400">
                    This receipt is voided. Fields are locked to preserve finance history.
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsFormModalOpen(false)}>
                Cancel
              </Button>
              {isVoidReceipt ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button size="sm" disabled className="gap-2 cursor-not-allowed opacity-70">
                        <Save className="h-4 w-4" />
                        Save Receipt
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <span>Void receipts cannot be edited or re-saved.</span>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  size="sm"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="gap-2"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? (activeReceipt ? 'Saving...' : 'Creating...') : activeReceipt ? 'Save Changes' : 'Create Receipt'}
                </Button>
              )}
            </div>
          </div>
          <ReceiptEditorPanel
            key={activeReceipt?._id ?? 'new'}
            draft={draft}
            activeReceipt={activeReceipt}
            leads={leads}
            onSelectLead={handleSelectLead}
            onTypeChange={(value) => updateDraft((current) => ({ ...current, type: value }))}
            onCustomerChange={(field, value) =>
              updateDraft((current) => ({ ...current, customer: { ...current.customer, [field]: value } }))
            }
            onTripChange={(field, value) =>
              updateDraft((current) => ({ ...current, tripDetails: { ...current.tripDetails, [field]: value } }))
            }
            onPaymentChange={(field, value) =>
              updateDraft((current) => ({ ...current, payment: { ...current.payment, [field]: value } }))
            }
            onTotalsChange={(field, value) =>
              updateDraft((current) => ({ ...current, totals: { ...current.totals, [field]: value } }))
            }
            onNotesChange={(field, value) =>
              updateDraft((current) => ({ ...current, notes: { ...current.notes, [field]: value } }))
            }
          />
        </DialogContent>
      </Dialog>

      <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Receipt</DialogTitle>
            <DialogDescription>Voiding is permanent for finance history. A reason is mandatory before the receipt can be voided.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Void Reason</Label>
            <Textarea value={voidReason} onChange={(event) => setVoidReason(event.target.value)} placeholder="State why this issued receipt is being voided..." className="min-h-[110px]" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setVoidDialogOpen(false)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={() => void handleVoid()}>
              <ShieldBan className="mr-2 h-4 w-4" />
              Void Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {renderingFormat ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-background/72 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card/95 p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold text-foreground">
                  Generating {renderingFormat} export
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {exportMessage}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold tabular-nums text-foreground">{exportProgress}%</p>
              </div>
            </div>
            <div className="mt-5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-[width] duration-200 ease-out"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>Server progress</span>
              <span>Downloading file</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
