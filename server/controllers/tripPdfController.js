import fs from 'fs/promises';
import mongoose from 'mongoose';
import { z } from 'zod';
import Trip from '../models/Trip.js';
import ItineraryDocument from '../models/ItineraryDocument.js';
import { buildItineraryPdfViewModel } from '../services/pdf/pdfViewModelService.js';
import { renderItineraryPdfBuffer } from '../services/pdf/pdfRenderService.js';
import {
  computePdfChecksum,
  createFailedDocumentRecord,
  createSuccessDocumentRecord,
  getItineraryStorageAbsolutePath,
  listTripDocuments,
  writePdfToStorage,
} from '../services/pdf/itineraryDocumentService.js';

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

const draftEventSchema = z.object({
  placeId: z.string(),
  order: z.number().int().min(0).optional(),
  startTime: z.string().regex(timePattern).nullable().optional(),
  endTime: z.string().regex(timePattern).nullable().optional(),
  travelTimeMin: z.number().min(0).optional(),
  distanceKm: z.number().min(0).optional(),
  validationStatus: z.enum(['VALID', 'INVALID']).optional(),
  validationReason: z.string().nullable().optional(),
  routeProvider: z.enum(['OSRM', 'HAVERSINE', 'STATIC']).optional(),
});

const draftDaySchema = z.object({
  dayIndex: z.number().int().min(0),
  date: z.string().min(1),
  events: z.array(draftEventSchema),
});

const renderPayloadSchema = z.object({
  draftDays: z.array(draftDaySchema).optional(),
  traveler: z
    .object({
      leadName: z.string().optional(),
      adults: z.number().int().min(0).max(40).optional(),
      children: z.number().int().min(0).max(40).optional(),
      infants: z.number().int().min(0).max(20).optional(),
      nationality: z.enum(['DOMESTIC', 'FOREIGNER']).optional(),
      contactPhone: z.string().optional(),
      contactEmail: z.string().optional(),
    })
    .optional(),
  pricing: z
    .object({
      markupPercent: z.number().min(0).max(300).optional(),
      gstPercent: z.number().min(0).max(50).optional(),
      discountAmount: z.number().min(0).optional(),
    })
    .optional(),
  notes: z.array(z.string().max(200)).max(20).optional(),
});

function getRequestUserId(req) {
  return req.user?._id || req.user?.id || null;
}

function buildDownloadUrl(tripId, documentId) {
  return `/api/trips/${tripId}/pdf/documents/${documentId}/download`;
}

function mapDocumentForResponse(document) {
  return {
    _id: String(document._id),
    tripId: String(document.tripId),
    version: document.version,
    templateVersion: document.templateVersion,
    renderMode: document.renderMode,
    status: document.status,
    checksum: document.checksum,
    pageCount: document.pageCount,
    fileSizeBytes: document.fileSizeBytes || 0,
    generatedAt: document.generatedAt || document.createdAt,
    generatedBy: document.generatedBy || null,
    failureReason: document.failureReason || null,
    downloadUrl:
      document.status === 'SUCCESS' ? buildDownloadUrl(document.tripId, document._id) : null,
  };
}

function parseRenderPayload(req) {
  const sourceBody = req.body && typeof req.body === 'object' ? req.body : {};
  const parsed = renderPayloadSchema.safeParse(sourceBody);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.flatten(),
    };
  }
  return {
    ok: true,
    data: parsed.data,
  };
}

export async function previewTripPdfData(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid trip id',
    });
  }

  const parsedPayload = parseRenderPayload(req);
  if (!parsedPayload.ok) {
    return res.status(400).json({
      success: false,
      message: 'Invalid payload',
      errors: parsedPayload.error,
    });
  }

  try {
    const viewModel = await buildItineraryPdfViewModel({
      tripId: req.params.id,
      draftDays: parsedPayload.data.draftDays,
      renderRequest: parsedPayload.data,
      generatedBy: getRequestUserId(req),
    });

    return res.json({
      success: true,
      data: viewModel,
    });
  } catch (error) {
    if (error.code === 'TRIP_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Trip not found',
      });
    }

    if (error.code === 'PDF_RENDERING_DISABLED') {
      return res.status(403).json({
        success: false,
        message: 'PDF rendering is disabled by configuration',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to prepare preview data',
      error: error.message,
    });
  }
}

export async function renderTripPdf(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid trip id',
    });
  }

  const parsedPayload = parseRenderPayload(req);
  if (!parsedPayload.ok) {
    return res.status(400).json({
      success: false,
      message: 'Invalid payload',
      errors: parsedPayload.error,
    });
  }

  const userId = getRequestUserId(req);
  let viewModel = null;

  try {
    viewModel = await buildItineraryPdfViewModel({
      tripId: req.params.id,
      draftDays: parsedPayload.data.draftDays,
      renderRequest: parsedPayload.data,
      generatedBy: userId,
    });

    const renderResult = await renderItineraryPdfBuffer(viewModel);
    const checksum = computePdfChecksum(renderResult.pdfBuffer);
    const document = await createSuccessDocumentRecord({
      tripId: viewModel.tripId,
      tripName: viewModel.tripName,
      pageCount: renderResult.pageCount,
      checksum,
      fileSizeBytes: renderResult.pdfBuffer.length,
      generatedBy: userId,
      renderValidationReport: renderResult.renderValidationReport,
      requestSnapshot: parsedPayload.data,
      templateVersion: viewModel.metadata?.templateVersion,
      renderMode: viewModel.metadata?.renderMode,
    });

    try {
      await writePdfToStorage(document.storagePath, renderResult.pdfBuffer);
    } catch (storageError) {
      await ItineraryDocument.findByIdAndUpdate(document._id, {
        $set: {
          status: 'FAILED',
          failureReason: String(storageError.message || 'FAILED_TO_WRITE_PDF').slice(0, 1000),
          checksum: 'FAILED',
          fileSizeBytes: 0,
        },
      });
      throw storageError;
    }

    return res.json({
      success: true,
      data: {
        documentId: String(document._id),
        version: document.version,
        pageCount: renderResult.pageCount,
        checksum,
        downloadUrl: buildDownloadUrl(viewModel.tripId, document._id),
        renderValidationReport: renderResult.renderValidationReport,
      },
      message: 'PDF generated successfully',
    });
  } catch (error) {
    const trip = viewModel
      ? { _id: viewModel.tripId, name: viewModel.tripName }
      : await Trip.findById(req.params.id).select('_id name').lean();

    if (trip?._id) {
      try {
        await createFailedDocumentRecord({
          tripId: trip._id,
          tripName: trip.name,
          generatedBy: userId,
          failureReason: error.message || 'UNKNOWN_ERROR',
          renderValidationReport: error.details || null,
          requestSnapshot: parsedPayload.ok ? parsedPayload.data : req.body,
        });
      } catch (nestedError) {
        // Failure logging should not replace the original error.
      }
    }

    if (error.code === 'TRIP_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Trip not found',
      });
    }

    if (error.code === 'PDF_RENDERING_DISABLED') {
      return res.status(403).json({
        success: false,
        message: 'PDF rendering is disabled by configuration',
      });
    }

    if (error.code === 'PDF_LAYOUT_VALIDATION_FAILED') {
      return res.status(422).json({
        success: false,
        code: error.code,
        message: 'PDF layout validation failed',
        details: error.details || null,
      });
    }

    if (error.code === 'CHROMIUM_NOT_FOUND') {
      return res.status(500).json({
        success: false,
        code: error.code,
        message:
          'Chromium executable not found. Set PDF_CHROMIUM_EXECUTABLE_PATH in environment to enable PDF rendering.',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to render trip PDF',
      error: error.message,
    });
  }
}

export async function listTripPdfDocuments(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid trip id',
      });
    }

    const documents = await listTripDocuments(req.params.id);
    const mapped = documents.map(mapDocumentForResponse);

    return res.json({
      success: true,
      data: mapped,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to list PDF documents',
      error: error.message,
    });
  }
}

export async function downloadTripPdfDocument(req, res) {
  try {
    const { id: tripId, documentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(tripId) || !mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid trip or document id',
      });
    }

    const document = await ItineraryDocument.findOne({
      _id: documentId,
      tripId,
      status: 'SUCCESS',
    }).lean();

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'PDF document not found',
      });
    }

    const absolutePath = getItineraryStorageAbsolutePath(document.storagePath);
    await fs.access(absolutePath);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="itinerary-v${String(document.version).padStart(3, '0')}.pdf"`
    );
    return res.sendFile(absolutePath);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to download PDF document',
      error: error.message,
    });
  }
}
