import { useState } from 'react';
import { formatISO, parseISO } from 'date-fns';
import type { LeadPoolRecord } from '@/types/leadsPool';
import { DatePicker } from '@/components/ui/date-picker';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  PaymentMode,
  ReceiptPayload,
  ReceiptRecord,
  ReceiptType,
} from '@/services/financeApi';

interface ReceiptEditorPanelProps {
  draft: ReceiptPayload;
  activeReceipt: ReceiptRecord | null;
  leads: LeadPoolRecord[];
  onSelectLead: (leadId: string) => void;
  onTypeChange: (value: ReceiptType) => void;
  onCustomerChange: (field: 'leadName' | 'phone' | 'email' | 'address', value: string) => void;
  onTripChange: (
    field: 'tripName' | 'destination' | 'travelStartDate' | 'travelEndDate',
    value: string
  ) => void;
  onPaymentChange: (
    field: 'paymentDate' | 'paymentMode' | 'transactionReference' | 'receivedAmount',
    value: string | number
  ) => void;
  onTotalsChange: (field: 'packageAmount' | 'previousPayments', value: number) => void;
  onNotesChange: (field: 'publicNote' | 'internalNote', value: string) => void;
  readOnly?: boolean;
}

const PAYMENT_MODE_OPTIONS: PaymentMode[] = [
  'Cash',
  'UPI',
  'Bank Transfer',
  'Card',
  'Cheque',
  'Other',
];

const formatINR = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

function toPickerDate(value?: string | null) {
  if (!value) return undefined;

  try {
    const parsed = parseISO(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  } catch {
    return undefined;
  }
}

export function ReceiptEditorPanel({
  draft,
  activeReceipt,
  leads,
  onSelectLead,
  onTypeChange,
  onCustomerChange,
  onTripChange,
  onPaymentChange,
  onTotalsChange,
  onNotesChange,
  readOnly = false,
}: ReceiptEditorPanelProps) {
  const isActuallyReadOnly = readOnly || activeReceipt?.status === 'VOID';
  const pendingAmount =
    (draft.totals?.packageAmount ?? 0) -
    ((draft.totals?.previousPayments ?? 0) + (draft.payment?.receivedAmount ?? 0));

  const [linkMode, setLinkMode] = useState<'lead' | 'normal'>(draft.linkedLeadId ? 'lead' : 'normal');

  const leadOptions = leads.map((lead) => ({
    label: `${lead.leadName || lead.phone} (${lead.phone})`,
    value: lead._id || '',
  }));

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {!readOnly ? (
            <div className="sm:col-span-2 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Label className="text-xs font-medium">Customer source</Label>
                <p className="text-[11px] text-muted-foreground">
                  {linkMode === 'lead'
                    ? 'Pull details from an existing pool lead.'
                    : 'Fill in customer details manually.'}
                </p>
              </div>
              <Select
                value={linkMode}
                onValueChange={(value) => setLinkMode(value as 'lead' | 'normal')}
                disabled={isActuallyReadOnly}
              >
                <SelectTrigger className="h-8 w-full text-xs sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Link pool lead</SelectItem>
                  <SelectItem value="normal">Manual entry</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {linkMode === 'lead' ? (
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-medium">Link Pool Lead</Label>
              <SearchableSelect
                options={leadOptions}
                value={draft.linkedLeadId || undefined}
                onChange={onSelectLead}
                placeholder="Select pool lead..."
                disabled={isActuallyReadOnly}
              />
            </div>
          ) : (
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-medium">Customer Name</Label>
              <Input
                value={draft.customer?.leadName || ''}
                onChange={(event) => onCustomerChange('leadName', event.target.value)}
                disabled={isActuallyReadOnly}
                placeholder="Enter name manually"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Receipt Type</Label>
            <Select
              value={draft.type || 'ADVANCE'}
              onValueChange={(value) => onTypeChange(value as ReceiptType)}
              disabled={isActuallyReadOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADVANCE">Advance</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
                <SelectItem value="FULL">Full</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Payment Mode</Label>
            <Select
              value={draft.payment?.paymentMode || 'UPI'}
              onValueChange={(value) => onPaymentChange('paymentMode', value as PaymentMode)}
              disabled={isActuallyReadOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_MODE_OPTIONS.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {mode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Payment Date</Label>
            <DatePicker
              date={toPickerDate(draft.payment?.paymentDate)}
              setDate={(date) =>
                onPaymentChange('paymentDate', date ? formatISO(date, { representation: 'date' }) : '')
              }
              placeholder="Select payment date"
              className="h-10"
              disabled={isActuallyReadOnly}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Transaction Reference</Label>
            <Input
              value={draft.payment?.transactionReference || ''}
              onChange={(event) => onPaymentChange('transactionReference', event.target.value)}
              disabled={isActuallyReadOnly}
              placeholder="UTR / Txn ID"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {linkMode === 'normal' ? (
          <div className="space-y-3 xl:col-span-2">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <h3 className="text-sm font-semibold text-foreground">Customer Contact</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Phone</Label>
                <Input
                  value={draft.customer?.phone || ''}
                  onChange={(event) => onCustomerChange('phone', event.target.value)}
                  placeholder="Enter phone number"
                  disabled={isActuallyReadOnly}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Email</Label>
                <Input
                  value={draft.customer?.email || ''}
                  onChange={(event) => onCustomerChange('email', event.target.value)}
                  placeholder="Enter email address"
                  disabled={isActuallyReadOnly}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-medium">Address</Label>
                <Textarea
                  value={draft.customer?.address || ''}
                  onChange={(event) => onCustomerChange('address', event.target.value)}
                  placeholder="Enter customer address"
                  disabled={isActuallyReadOnly}
                  className="min-h-[72px] resize-none"
                />
              </div>
            </div>
          </div>
        ) : null}

        <div className="space-y-3 xl:col-span-2">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <h3 className="text-sm font-semibold text-foreground">Travel Details</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-medium">Trip Name / Package</Label>
              <Input
                value={draft.tripDetails?.tripName || ''}
                onChange={(event) => onTripChange('tripName', event.target.value)}
                placeholder="Enter trip or package name"
                disabled={isActuallyReadOnly}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-medium">Destination</Label>
              <Input
                value={draft.tripDetails?.destination || ''}
                onChange={(event) => onTripChange('destination', event.target.value)}
                placeholder="Enter destination"
                disabled={isActuallyReadOnly}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Travel Start</Label>
              <DatePicker
                date={toPickerDate(draft.tripDetails?.travelStartDate)}
                setDate={(date) =>
                  onTripChange('travelStartDate', date ? formatISO(date, { representation: 'date' }) : '')
                }
                placeholder="Select start date"
                className="h-10"
                disabled={isActuallyReadOnly}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Travel End</Label>
              <DatePicker
                date={toPickerDate(draft.tripDetails?.travelEndDate)}
                setDate={(date) =>
                  onTripChange('travelEndDate', date ? formatISO(date, { representation: 'date' }) : '')
                }
                placeholder="Select end date"
                className="h-10"
                disabled={isActuallyReadOnly}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-3 h-full">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <h3 className="text-sm font-semibold text-foreground">Payment</h3>
            </div>
            <div className="flex flex-col gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Received Amount</Label>
                <Input
                  type="number"
                  min={0}
                  value={draft.payment?.receivedAmount ? String(draft.payment.receivedAmount) : ''}
                  onChange={(event) => onPaymentChange('receivedAmount', Number(event.target.value || 0))}
                  disabled={isActuallyReadOnly}
                  placeholder="Enter received amount"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 h-full">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <h3 className="text-sm font-semibold text-foreground">Financial Summary</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Package Amount</Label>
                <Input
                  type="number"
                  min={0}
                  value={draft.totals?.packageAmount ? String(draft.totals.packageAmount) : ''}
                  onChange={(event) => onTotalsChange('packageAmount', Number(event.target.value || 0))}
                  disabled={isActuallyReadOnly}
                  placeholder="Enter package amount"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Previous Payments</Label>
                <Input
                  type="number"
                  min={0}
                  value={draft.totals?.previousPayments ? String(draft.totals.previousPayments) : ''}
                  onChange={(event) => onTotalsChange('previousPayments', Number(event.target.value || 0))}
                  disabled={isActuallyReadOnly}
                  placeholder="Enter previous payments"
                />
              </div>
              <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 sm:col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700/80">
                  Computed Balance
                </p>
                <p className="mt-0.5 text-base font-bold text-emerald-800">
                  {pendingAmount > 0 ? formatINR(pendingAmount) : 'Settled'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <h3 className="text-sm font-semibold text-foreground">Notes</h3>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Public Note</Label>
              <Textarea
                value={draft.notes?.publicNote || ''}
                onChange={(event) => onNotesChange('publicNote', event.target.value)}
                disabled={isActuallyReadOnly}
                className="min-h-[100px] resize-none"
                placeholder="Visible on the receipt..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Internal Note</Label>
              <Textarea
                value={draft.notes?.internalNote || ''}
                onChange={(event) => onNotesChange('internalNote', event.target.value)}
                disabled={isActuallyReadOnly}
                className="min-h-[100px] resize-none"
                placeholder="Internal use only..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
