import { FilePlus2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PaymentMode, ReceiptRecord, ReceiptStatus } from '@/services/financeApi';
import { cn } from '@/lib/utils';

interface ReceiptListPanelProps {
  receipts: ReceiptRecord[];
  selectedReceiptId: string | null;
  search: string;
  statusFilter: ReceiptStatus | 'ALL';
  paymentModeFilter: PaymentMode | 'ALL';
  onSearchChange: (value: string) => void;
  onStatusChange: (value: ReceiptStatus | 'ALL') => void;
  onPaymentModeChange: (value: PaymentMode | 'ALL') => void;
  onSelectReceipt: (receiptId: string) => void;
  onCreateNew: () => void;
}

const statusBadgeClass: Record<ReceiptStatus, string> = {
  DRAFT: 'border-amber-300/50 bg-amber-500/10 text-amber-700',
  ISSUED: 'border-emerald-300/50 bg-emerald-500/10 text-emerald-700',
  VOID: 'border-rose-300/50 bg-rose-500/10 text-rose-700',
};

const statusLabel: Record<ReceiptStatus, string> = {
  DRAFT: 'Pending',
  ISSUED: 'Issued',
  VOID: 'Void',
};

export function ReceiptListPanel({
  receipts,
  selectedReceiptId,
  search,
  statusFilter,
  paymentModeFilter,
  onSearchChange,
  onStatusChange,
  onPaymentModeChange,
  onSelectReceipt,
  onCreateNew,
}: ReceiptListPanelProps) {
  const visibleTotal = receipts.reduce((sum, receipt) => sum + (receipt.payment.receivedAmount || 0), 0);
  const issuedCount = receipts.filter((receipt) => receipt.status === 'ISSUED').length;

  return (
    <Card className="h-full min-h-0 overflow-hidden border-border bg-card shadow-sm">
      <CardHeader className="space-y-4 border-b border-border/60 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Receipt Inbox</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Search, filter, and reopen receipts.</p>
          </div>
          <Button type="button" size="sm" className="gap-2" onClick={onCreateNew}>
            <FilePlus2 className="h-4 w-4" />
            New Receipt
          </Button>
        </div>

        <div className="flex flex-col gap-2 bg-muted/30 p-3 rounded-lg">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Visible Receipts</span>
            <span className="font-medium">{receipts.length} ({issuedCount} issued)</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Collections</span>
            <span className="font-semibold text-emerald-600">
              {new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0,
              }).format(visibleTotal)}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Receipt no., customer, destination..."
                className="pl-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={(value) => onStatusChange(value as ReceiptStatus | 'ALL')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="ISSUED">Issued</SelectItem>
                  <SelectItem value="VOID">Void</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Payment Mode</Label>
              <Select
                value={paymentModeFilter}
                onValueChange={(value) => onPaymentModeChange(value as PaymentMode | 'ALL')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All modes</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="h-[calc(100%-14.4rem)] min-h-0 p-0">
        <ScrollArea className="h-full">
          <div className="space-y-3 p-4">
            {receipts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                No receipts match the current filters.
              </div>
            ) : (
              receipts.map((receipt) => {
                const isActive = selectedReceiptId === receipt._id;
                return (
                  <button
                    key={receipt._id}
                    type="button"
                    onClick={() => onSelectReceipt(receipt._id)}
                    className={cn(
                      'w-full rounded-xl border p-4 text-left transition-all',
                      isActive
                        ? 'border-primary/50 bg-primary/10 shadow-sm ring-1 ring-primary/20'
                        : 'border-border bg-background hover:border-primary/25 hover:bg-muted/20'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {receipt.receiptNumber || 'Receipt'}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {receipt.customer.leadName || 'Unnamed customer'}
                        </p>
                      </div>
                      <Badge variant="outline" className={statusBadgeClass[receipt.status]}>
                        {statusLabel[receipt.status]}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm py-1 border-b border-border/50">
                      <span className="font-semibold text-emerald-600">
                        {new Intl.NumberFormat('en-IN', {
                          style: 'currency',
                          currency: receipt.brandingSnapshot?.currencyCode || 'INR',
                          maximumFractionDigits: 0,
                        }).format(receipt.payment.receivedAmount || 0)}
                      </span>
                      <span className="text-muted-foreground font-medium">{receipt.payment.paymentMode}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <p className="truncate">
                        {receipt.tripDetails.destination || receipt.tripDetails.tripName || 'No trip data'}
                      </p>
                      <p className="text-right">
                        {new Date(receipt.updatedAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
