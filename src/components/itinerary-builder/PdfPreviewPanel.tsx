import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FileText, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { logicTravelApi, type ItineraryDocument, type ItineraryPdfViewModel } from '@/services/logicTravelApi';
import type { BuilderDay } from '@/store/useTripStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PdfPreviewPanelProps {
  tripId: string | null;
  draftDays: BuilderDay[];
}

const DEFAULT_TRAVELER = {
  leadName: '',
  adults: 2,
  children: 0,
  infants: 0,
  nationality: 'DOMESTIC' as const,
};

const DEFAULT_PRICING = {
  markupPercent: 0,
  gstPercent: 5,
  discountAmount: 0,
};

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const normalizeTime = (value?: string | null) => {
  if (!value) return null;
  return TIME_PATTERN.test(value) ? value : null;
};

function toPdfPayload(draftDays: BuilderDay[], traveler: typeof DEFAULT_TRAVELER, pricing: typeof DEFAULT_PRICING, notes: string) {
  return {
    draftDays: draftDays
      .slice()
      .sort((a, b) => a.dayIndex - b.dayIndex)
      .map((day) => ({
        dayIndex: day.dayIndex,
        date: day.date,
        events: day.events
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((event, index) => ({
            placeId: event.placeId,
            order: index,
            startTime: normalizeTime(event.startTime),
            endTime: normalizeTime(event.endTime),
            travelTimeMin: event.travelTimeMin ?? 0,
            distanceKm: event.distanceKm ?? 0,
            validationStatus: event.validationStatus ?? 'VALID',
            validationReason: event.validationReason ?? null,
            routeProvider: event.routeProvider ?? 'STATIC',
          })),
      })),
    traveler,
    pricing,
    notes: notes
      .split(/\r?\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 20),
  };
}

export const PdfPreviewPanel = ({ tripId, draftDays }: PdfPreviewPanelProps) => {
  const [traveler, setTraveler] = useState(DEFAULT_TRAVELER);
  const [pricing, setPricing] = useState(DEFAULT_PRICING);
  const [notes, setNotes] = useState('');
  const [preview, setPreview] = useState<ItineraryPdfViewModel | null>(null);
  const [documents, setDocuments] = useState<ItineraryDocument[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [renderingPdf, setRenderingPdf] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const payload = useMemo(
    () => toPdfPayload(draftDays, traveler, pricing, notes),
    [draftDays, traveler, pricing, notes]
  );

  const loadDocuments = useCallback(async () => {
    if (!tripId) return;
    setLoadingDocuments(true);
    try {
      const response = await logicTravelApi.trips.listPdfDocuments(tripId);
      setDocuments(response.data || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load PDF history');
    } finally {
      setLoadingDocuments(false);
    }
  }, [tripId]);

  const loadPreview = useCallback(async () => {
    if (!tripId) return;
    setLoadingPreview(true);
    setPreviewError(null);
    try {
      const response = await logicTravelApi.trips.getPdfPreviewData(tripId, payload);
      setPreview(response.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load PDF preview';
      setPreviewError(message);
      toast.error(message);
    } finally {
      setLoadingPreview(false);
    }
  }, [payload, tripId]);

  const downloadDocument = useCallback(
    async (documentId: string, version?: number) => {
      if (!tripId) return;
      try {
        const blob = await logicTravelApi.trips.downloadPdfDocument(tripId, documentId);
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        const fileVersion = Number.isFinite(version) ? String(version).padStart(3, '0') : documentId;
        anchor.download = `itinerary-${tripId}-v${fileVersion}.pdf`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to download PDF');
      }
    },
    [tripId]
  );

  const handleRenderPdf = async () => {
    if (!tripId) return;
    setRenderingPdf(true);
    try {
      const response = await logicTravelApi.trips.renderPdf(tripId, payload);
      const data = response.data;
      toast.success(`PDF generated (v${data.version}, ${data.pageCount} page${data.pageCount > 1 ? 's' : ''})`);
      await loadDocuments();
      await downloadDocument(data.documentId, data.version);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate PDF');
    } finally {
      setRenderingPdf(false);
    }
  };

  useEffect(() => {
    if (!tripId) {
      setPreview(null);
      setDocuments([]);
      return;
    }

    void loadDocuments();
  }, [loadDocuments, tripId]);

  useEffect(() => {
    if (!tripId) return;
    const timer = window.setTimeout(() => {
      void loadPreview();
    }, 600);
    return () => window.clearTimeout(timer);
  }, [loadPreview, payload, tripId]);

  if (!tripId) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base">A4 PDF Preview</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Select a trip to preview and generate itinerary PDFs.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="space-y-3 border-b border-border pb-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">A4 PDF Preview</CardTitle>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={loadPreview} disabled={loadingPreview}>
              {loadingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button type="button" size="sm" onClick={handleRenderPdf} disabled={renderingPdf || loadingPreview}>
              {renderingPdf ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FileText className="mr-1 h-4 w-4" />}
              Generate PDF
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label>Lead Name</Label>
            <Input
              value={traveler.leadName}
              onChange={(event) => setTraveler((prev) => ({ ...prev, leadName: event.target.value }))}
              placeholder="Traveler name"
            />
          </div>
          <div className="space-y-1">
            <Label>Adults</Label>
            <Input
              type="number"
              min={0}
              value={traveler.adults}
              onChange={(event) =>
                setTraveler((prev) => ({
                  ...prev,
                  adults: Number(event.target.value || 0),
                }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Children</Label>
            <Input
              type="number"
              min={0}
              value={traveler.children}
              onChange={(event) =>
                setTraveler((prev) => ({
                  ...prev,
                  children: Number(event.target.value || 0),
                }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Discount (INR)</Label>
            <Input
              type="number"
              min={0}
              value={pricing.discountAmount}
              onChange={(event) =>
                setPricing((prev) => ({
                  ...prev,
                  discountAmount: Number(event.target.value || 0),
                }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Nationality</Label>
            <Select
              value={traveler.nationality}
              onValueChange={(value: 'DOMESTIC' | 'FOREIGNER') =>
                setTraveler((prev) => ({ ...prev, nationality: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DOMESTIC">Domestic</SelectItem>
                <SelectItem value="FOREIGNER">Foreigner</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Markup %</Label>
            <Input
              type="number"
              min={0}
              value={pricing.markupPercent}
              onChange={(event) =>
                setPricing((prev) => ({
                  ...prev,
                  markupPercent: Number(event.target.value || 0),
                }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label>GST %</Label>
            <Input
              type="number"
              min={0}
              value={pricing.gstPercent}
              onChange={(event) =>
                setPricing((prev) => ({
                  ...prev,
                  gstPercent: Number(event.target.value || 0),
                }))
              }
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label>PDF Notes</Label>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional notes, one point per line"
            className="h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </CardHeader>

      <CardContent className="h-[52vh] p-0">
        <ScrollArea className="h-full px-3 py-3">
          {previewError && (
            <div className="mb-3 rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-600">
              {previewError}
            </div>
          )}

          {!preview && loadingPreview && (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparing preview...
            </div>
          )}

          {preview && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-sm font-semibold">{preview.tripName}</p>
                <p className="text-xs text-muted-foreground">
                  {preview.tripPeriod.startDateLabel} to {preview.tripPeriod.endDateLabel}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary">{preview.summary.totalDays} days</Badge>
                  <Badge variant="secondary">{preview.summary.totalEvents} stops</Badge>
                  <Badge variant="secondary">{preview.summary.totalDistanceLabel}</Badge>
                  <Badge variant="secondary">{preview.pricing.summary.totalFormatted}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                {preview.daySections.map((day) => (
                  <article key={day.dayIndex} className="rounded-lg border border-border bg-background p-3">
                    <p className="text-sm font-semibold">{day.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {day.summary.eventCount} events | {day.summary.dayDistanceKm.toFixed(1)} km | {day.summary.dayTravelLabel}
                    </p>
                    <div className="mt-2 space-y-1">
                      {day.events.slice(0, 3).map((event) => (
                        <p key={`${day.dayIndex}-${event.order}`} className="text-xs">
                          {event.startTime} - {event.endTime} | {event.placeName}
                        </p>
                      ))}
                      {day.events.length > 3 && (
                        <p className="text-xs text-muted-foreground">+{day.events.length - 3} more</p>
                      )}
                    </div>
                  </article>
                ))}
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
                <p className="font-semibold">PDF Versions</p>
                {loadingDocuments ? (
                  <p className="mt-2 text-xs text-muted-foreground">Loading history...</p>
                ) : documents.length === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">No PDF generated yet.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {documents.map((document) => (
                      <div key={document._id} className="flex items-center justify-between rounded border border-border bg-background px-2 py-2 text-xs">
                        <div>
                          <p className="font-medium">
                            v{document.version} | {document.status}
                          </p>
                          <p className="text-muted-foreground">
                            {new Date(document.generatedAt).toLocaleString('en-IN')}
                          </p>
                        </div>
                        {document.status === 'SUCCESS' && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => downloadDocument(document._id, document.version)}
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
