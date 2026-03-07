import {
  CalendarDays,
  IndianRupee,
  MapPinned,
  NotebookPen,
  UserRound,
  WalletCards,
} from 'lucide-react';
import type { ReceiptRecord } from '@/services/financeApi';

interface ReceiptDetailsPanelProps {
  receipt: ReceiptRecord | null;
}

export function ReceiptDetailsPanel({ receipt }: ReceiptDetailsPanelProps) {
  if (!receipt) return null;

  const currency = receipt.brandingSnapshot?.currencyCode || 'INR';
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount || 0);

  const pendingAmount =
    (receipt.totals?.packageAmount ?? 0) -
    ((receipt.totals?.previousPayments ?? 0) +
      (receipt.payment?.receivedAmount ?? 0));

  return (
    <div className="space-y-6">
      {/* Primary summary row */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <WalletCards className="h-4 w-4" />
            <span>Receipt Type</span>
          </div>
          <p className="text-base text-foreground font-semibold">
            {receipt.type || '—'}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <IndianRupee className="h-4 w-4" />
            <span>Received Amount</span>
          </div>
          <p className="text-base text-foreground font-semibold">
            {formatCurrency(receipt.payment?.receivedAmount ?? 0)}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span>Payment Date</span>
          </div>
          <p className="text-base text-foreground">
            {receipt.payment?.paymentDate
              ? new Date(receipt.payment.paymentDate).toLocaleDateString(
                  'en-IN',
                  {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  },
                )
              : '—'}
          </p>
        </div>
      </div>

      {/* Customer + Trip */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <UserRound className="h-4 w-4" />
            <span>Customer</span>
          </div>
          <div className="space-y-1.5 text-sm">
            <p className="text-foreground font-medium">
              {receipt.customer?.leadName || '—'}
            </p>
            {receipt.customer?.phone && (
              <p className="text-muted-foreground">
                {receipt.customer.phone}
              </p>
            )}
            {receipt.customer?.email && (
              <p className="text-muted-foreground">
                {receipt.customer.email}
              </p>
            )}
            {receipt.customer?.address && (
              <p className="text-muted-foreground whitespace-pre-wrap">
                {receipt.customer.address}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <MapPinned className="h-4 w-4" />
            <span>Trip &amp; Travel</span>
          </div>
          <div className="space-y-1.5 text-sm">
            <p className="text-foreground font-medium">
              {receipt.tripDetails?.tripName || '—'}
            </p>
            {receipt.tripDetails?.destination && (
              <p className="text-muted-foreground">
                {receipt.tripDetails.destination}
              </p>
            )}
            {(receipt.tripDetails?.travelStartDate ||
              receipt.tripDetails?.travelEndDate) && (
              <p className="text-muted-foreground">
                {receipt.tripDetails?.travelStartDate
                  ? new Date(
                      receipt.tripDetails.travelStartDate,
                    ).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—'}{' '}
                –{' '}
                {receipt.tripDetails?.travelEndDate
                  ? new Date(
                      receipt.tripDetails.travelEndDate,
                    ).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Financial breakdown */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <NotebookPen className="h-4 w-4" />
            <span>Package Amount</span>
          </div>
          <p className="text-base text-foreground">
            {formatCurrency(receipt.totals?.packageAmount ?? 0)}
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <NotebookPen className="h-4 w-4" />
            <span>Previous Payments</span>
          </div>
          <p className="text-base text-foreground">
            {formatCurrency(receipt.totals?.previousPayments ?? 0)}
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <NotebookPen className="h-4 w-4" />
            <span>Balance</span>
          </div>
          <p className="text-base font-semibold text-emerald-500">
            {pendingAmount > 0 ? formatCurrency(pendingAmount) : 'Settled'}
          </p>
        </div>
      </div>

      {/* Notes */}
      {(receipt.notes?.publicNote || receipt.notes?.internalNote) && (
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <NotebookPen className="h-4 w-4" />
            <span>Notes</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            {receipt.notes?.publicNote && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Public
                </p>
                <p className="text-foreground whitespace-pre-wrap">
                  {receipt.notes.publicNote}
                </p>
              </div>
            )}
            {receipt.notes?.internalNote && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Internal
                </p>
                <p className="text-foreground whitespace-pre-wrap">
                  {receipt.notes.internalNote}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

