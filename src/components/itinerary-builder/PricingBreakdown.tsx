import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

interface PricingBreakdownProps {
  pricing: {
    subtotal: number;
    markup: {
      percentage: number;
      amount: number;
    };
    total: number;
    breakdown?: {
      hotels: number;
      activities: number;
      transfers: number;
      sightseeings: number;
      otherServices: number;
    };
  } | null;
  isLoading?: boolean;
  currency?: string;
}

export const PricingBreakdown = ({
  pricing,
  isLoading = false,
  currency = 'INR',
}: PricingBreakdownProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card className="sticky top-6">
        <CardHeader>
          <CardTitle>Pricing Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!pricing) {
    return (
      <Card className="sticky top-6">
        <CardHeader>
          <CardTitle>Pricing Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Add services to see pricing breakdown
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="sticky top-6">
      <CardHeader>
        <CardTitle>Pricing Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pricing.breakdown && (
          <div className="space-y-2">
            {pricing.breakdown.hotels > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Hotels</span>
                <span>{formatCurrency(pricing.breakdown.hotels)}</span>
              </div>
            )}
            {pricing.breakdown.activities > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Activities</span>
                <span>{formatCurrency(pricing.breakdown.activities)}</span>
              </div>
            )}
            {pricing.breakdown.transfers > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Transfers</span>
                <span>{formatCurrency(pricing.breakdown.transfers)}</span>
              </div>
            )}
            {pricing.breakdown.sightseeings > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sightseeings</span>
                <span>{formatCurrency(pricing.breakdown.sightseeings)}</span>
              </div>
            )}
            {pricing.breakdown.otherServices > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Other Services</span>
                <span>{formatCurrency(pricing.breakdown.otherServices)}</span>
              </div>
            )}
          </div>
        )}

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatCurrency(pricing.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Markup ({pricing.markup.percentage}%)
            </span>
            <span>{formatCurrency(pricing.markup.amount)}</span>
          </div>
        </div>

        <Separator />

        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>{formatCurrency(pricing.total)}</span>
        </div>
      </CardContent>
    </Card>
  );
};



