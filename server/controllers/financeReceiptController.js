import fs from 'fs/promises';
import mongoose from 'mongoose';
import { z } from 'zod';
import Receipt from '../models/Receipt.js';
import ReceiptDocument from '../models/ReceiptDocument.js';
import {
  assignReceiptNumber,
} from '../services/finance/receiptNumberService.js';
import {
  buildReceiptViewModel,
  normalizeReceiptPayload,
} from '../services/finance/receiptViewModelService.js';
import {
  buildReceiptPreviewHtml,
  renderReceiptDocumentBuffer,
} from '../services/finance/receiptRenderService.js';
import {
  computeReceiptChecksum,
  createFailedReceiptDocumentRecord,
  createSuccessReceiptDocumentRecord,
  getReceiptStorageAbsolutePath,
  listReceiptDocuments,
  writeReceiptBufferToStorage,
} from '../services/finance/receiptDocumentService.js';
import {
  completeReceiptRenderJob,
  createReceiptRenderJob,
  failReceiptRenderJob,
  getReceiptRenderJob,
  updateReceiptRenderJob,
} from '../services/finance/receiptRenderJobService.js';

const receiptPayloadSchema = z.object({
  type: z.enum(['ADVANCE', 'PARTIAL', 'FULL']).optional(),
  linkedLeadId: z.string().nullable().optional(),
  linkedTripId: z.string().nullable().optional(),
  customer: z
    .object({
      leadName: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
    })
    .optional(),
  tripDetails: z
    .object({
      tripName: z.string().optional(),
      destination: z.string().optional(),
      travelStartDate: z.string().nullable().optional(),
      travelEndDate: z.string().nullable().optional(),
    })
    .optional(),
  payment: z
    .object({
      paymentDate: z.string().optional(),
      paymentMode: z.enum(['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other']).optional(),
      transactionReference: z.string().optional(),
      receivedAmount: z.number().min(0).optional(),
    })
    .optional(),
  totals: z
    .object({
      packageAmount: z.number().min(0).optional(),
      previousPayments: z.number().min(0).optional(),
    })
    .optional(),
  notes: z
    .object({
      publicNote: z.string().optional(),
      internalNote: z.string().optional(),
    })
    .optional(),
  brandingSnapshot: z
    .object({
      companyName: z.string().optional(),
      companyAddress: z.string().optional(),
      companyPhone: z.string().optional(),
      companyEmail: z.string().optional(),
      companyWebsite: z.string().optional(),
      companyGstin: z.string().optional(),
      logoUrl: z.string().optional(),
      footerNote: z.string().optional(),
      primaryColor: z.string().optional(),
      accentColor: z.string().optional(),
      currencyCode: z.string().optional(),
      locale: z.string().optional(),
      timezone: z.string().optional(),
    })
    .optional(),
});

const renderDocumentSchema = z.object({
  format: z.enum(['PDF', 'PNG', 'JPG']),
});

const voidSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

function buildActivityEntry(req, action, details = {}) {
  return {
    action,
    actorId: req.user?._id || null,
    actorName: req.user?.name || 'System',
    timestamp: new Date(),
    details,
  };
}

async function appendActivity(receiptId, entry) {
  await Receipt.findByIdAndUpdate(receiptId, {
    $push: {
      activityTrail: {
        $each: [entry],
        $slice: -250,
      },
    },
  });
}

function mapReceiptForResponse(receipt) {
  return {
    _id: String(receipt._id),
    receiptNumber: receipt.receiptNumber || null,
    status: receipt.status,
    type: receipt.type,
    linkedLeadId: receipt.linkedLeadId ? String(receipt.linkedLeadId) : null,
    linkedTripId: receipt.linkedTripId ? String(receipt.linkedTripId) : null,
    customer: receipt.customer,
    tripDetails: receipt.tripDetails,
    payment: receipt.payment,
    totals: receipt.totals,
    notes: receipt.notes,
    brandingSnapshot: receipt.brandingSnapshot,
    issuedAt: receipt.issuedAt,
    voidedAt: receipt.voidedAt,
    createdByName: receipt.createdByName || '',
    createdAt: receipt.createdAt,
    updatedAt: receipt.updatedAt,
    activityTrail: (receipt.activityTrail || []).map((entry) => ({
      _id: String(entry._id),
      action: entry.action,
      actorId: entry.actorId ? String(entry.actorId) : null,
      actorName: entry.actorName || '',
      timestamp: entry.timestamp,
      details: entry.details || null,
    })),
  };
}

function buildDownloadUrl(receiptId, documentId) {
  return `/api/finance/receipts/${receiptId}/documents/${documentId}/download`;
}

function mapDocumentForResponse(document) {
  return {
    _id: String(document._id),
    receiptId: String(document.receiptId),
    version: document.version,
    format: document.format,
    templateVersion: document.templateVersion,
    renderMode: document.renderMode,
    status: document.status,
    checksum: document.checksum,
    fileSizeBytes: document.fileSizeBytes || 0,
    widthPx: document.widthPx || null,
    heightPx: document.heightPx || null,
    pageCount: document.pageCount || 1,
    generatedAt: document.generatedAt || document.createdAt,
    failureReason: document.failureReason || null,
    downloadUrl:
      document.status === 'SUCCESS' ? buildDownloadUrl(document.receiptId, document._id) : null,
  };
}

function validateIssuableReceipt(receipt) {
  const errors = [];
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

function parsePayload(req) {
  const source = req.body && typeof req.body === 'object' ? req.body : {};
  const parsed = receiptPayloadSchema.safeParse(source);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten() };
  }
  return { ok: true, data: parsed.data };
}

async function executeReceiptDocumentRender({
  receiptId,
  format,
  user,
  jobId = null,
}) {
  let receipt = null;

  const pushProgress = (progress, message) => {
    if (jobId) {
      updateReceiptRenderJob(jobId, {
        status: progress >= 100 ? 'completed' : 'running',
        progress,
        message,
      });
    }
  };

  try {
    pushProgress(10, 'Loading receipt');
    receipt = await Receipt.findById(receiptId).lean();
    if (!receipt) {
      const error = new Error('Receipt not found');
      error.code = 'RECEIPT_NOT_FOUND';
      throw error;
    }
    if (receipt.status !== 'ISSUED') {
      const error = new Error('Only issued receipts can be exported');
      error.code = 'RECEIPT_NOT_EXPORTABLE';
      throw error;
    }

    pushProgress(25, 'Preparing receipt view');
    const viewModel = await buildReceiptViewModel({
      receiptId: receipt._id,
      generatedBy: user?._id || null,
    });

    pushProgress(55, `Rendering ${format} document`);
    const renderResult = await renderReceiptDocumentBuffer(viewModel, format);

    pushProgress(72, 'Creating document record');
    const checksum = computeReceiptChecksum(renderResult.buffer);
    const document = await createSuccessReceiptDocumentRecord({
      receiptId: receipt._id,
      receiptNumber: receipt.receiptNumber,
      format,
      checksum,
      fileSizeBytes: renderResult.buffer.length,
      generatedBy: user?._id || null,
      renderValidationReport: renderResult.renderValidationReport,
      requestSnapshot: { format },
      widthPx: renderResult.widthPx,
      heightPx: renderResult.heightPx,
      pageCount: renderResult.pageCount,
      templateVersion: viewModel.metadata.templateVersion,
      renderMode: viewModel.metadata.renderMode,
      extension: renderResult.extension,
    });

    pushProgress(88, 'Writing file to storage');
    await writeReceiptBufferToStorage(document.storagePath, renderResult.buffer);

    pushProgress(96, 'Finalizing export');
    await appendActivity(
      receipt._id,
      buildActivityEntry({ user }, 'EXPORT_DOCUMENT', {
        documentId: String(document._id),
        format,
        version: document.version,
      })
    );

    const result = {
      documentId: String(document._id),
      version: document.version,
      format: document.format,
      checksum,
      downloadUrl: buildDownloadUrl(receipt._id, document._id),
      renderValidationReport: renderResult.renderValidationReport,
    };

    if (jobId) {
      completeReceiptRenderJob(jobId, {
        message: `${format} export ready`,
        documentId: result.documentId,
        downloadUrl: result.downloadUrl,
        checksum: result.checksum,
        version: result.version,
      });
    }

    return result;
  } catch (error) {
    if (receipt?._id) {
      try {
        await createFailedReceiptDocumentRecord({
          receiptId: receipt._id,
          format,
          generatedBy: user?._id || null,
          failureReason: error.message || 'UNKNOWN_ERROR',
          renderValidationReport: error.details || null,
          requestSnapshot: { format },
        });
      } catch (nestedError) {
        // Failure logging must not replace the original error.
      }
    }

    if (jobId) {
      failReceiptRenderJob(jobId, error.message, {
        message: error.code === 'RECEIPT_LAYOUT_VALIDATION_FAILED' ? 'Layout validation failed' : 'Export failed',
      });
    }

    throw error;
  }
}

export async function listFinanceReceipts(req, res) {
  try {
    const { search = '', status, paymentMode } = req.query;
    const query = {
      status: { $ne: 'DRAFT' },
    };

    if (status && ['DRAFT', 'ISSUED', 'VOID'].includes(String(status))) {
      query.status = status;
    }

    if (
      paymentMode &&
      ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other'].includes(String(paymentMode))
    ) {
      query['payment.paymentMode'] = paymentMode;
    }

    if (String(search).trim()) {
      const regex = new RegExp(String(search).trim(), 'i');
      query.$or = [
        { receiptNumber: regex },
        { 'customer.leadName': regex },
        { 'customer.phone': regex },
        { 'tripDetails.tripName': regex },
        { 'tripDetails.destination': regex },
      ];
    }

    const receipts = await Receipt.find(query).sort({ updatedAt: -1 }).lean();
    return res.json({
      success: true,
      data: receipts.map(mapReceiptForResponse),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load receipts',
      error: error.message,
    });
  }
}

export async function getFinanceReceipt(req, res) {
  try {
    const receipt = await Receipt.findById(req.params.id).lean();
    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }
    return res.json({ success: true, data: mapReceiptForResponse(receipt) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load receipt', error: error.message });
  }
}

export async function createFinanceReceipt(req, res) {
  const parsed = parsePayload(req);
  if (!parsed.ok) {
    return res.status(400).json({ success: false, message: 'Invalid payload', errors: parsed.error });
  }

  try {
    const normalized = await normalizeReceiptPayload(parsed.data, null);
    const validationErrors = validateIssuableReceipt(normalized);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Receipt is missing required information',
        errors: validationErrors,
      });
    }

    let receipt = await Receipt.create({
      ...normalized,
      status: 'ISSUED',
      issuedAt: new Date(),
      issuedBy: req.user?._id || null,
      createdBy: req.user?._id || null,
      updatedBy: req.user?._id || null,
      createdByName: req.user?.name || '',
      activityTrail: [],
    });

    receipt = await assignReceiptNumber(receipt);
    await appendActivity(
      receipt._id,
      buildActivityEntry(req, 'CREATE_RECEIPT', {
        receiptNumber: receipt.receiptNumber,
        status: 'ISSUED',
        receivedAmount: normalized.payment.receivedAmount,
        paymentMode: normalized.payment.paymentMode,
      })
    );

    const created = await Receipt.findById(receipt._id).lean();

    return res.status(201).json({
      success: true,
      data: mapReceiptForResponse(created),
      message: 'Receipt created successfully',
    });
  } catch (error) {
    const statusCode = error.code === 'POOL_LEAD_NOT_FOUND' ? 404 : 500;
    return res.status(statusCode).json({
      success: false,
      message: statusCode === 404 ? 'Linked pool lead not found' : 'Failed to create receipt',
      error: error.message,
    });
  }
}

export async function updateFinanceReceipt(req, res) {
  const parsed = parsePayload(req);
  if (!parsed.ok) {
    return res.status(400).json({ success: false, message: 'Invalid payload', errors: parsed.error });
  }

  try {
    let existing = await Receipt.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    if (existing.status === 'VOID') {
      return res.status(409).json({
        success: false,
        message: 'Void receipts cannot be edited',
      });
    }

    const normalized = await normalizeReceiptPayload(parsed.data, existing.toObject());
    const validationErrors = validateIssuableReceipt(normalized);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Receipt is missing required information',
        errors: validationErrors,
      });
    }

    existing.set({
      ...normalized,
      status: 'ISSUED',
      issuedAt: existing.issuedAt || new Date(),
      issuedBy: existing.issuedBy || req.user?._id || null,
      updatedBy: req.user?._id || null,
    });
    await existing.save();

    if (!existing.receiptNumber) {
      existing = await assignReceiptNumber(existing);
    }

    await appendActivity(
      existing._id,
      buildActivityEntry(req, 'UPDATE_RECEIPT', {
        receiptNumber: existing.receiptNumber,
        receivedAmount: normalized.payment.receivedAmount,
        paymentMode: normalized.payment.paymentMode,
      })
    );

    const updated = await Receipt.findById(existing._id).lean();

    return res.json({
      success: true,
      data: mapReceiptForResponse(updated),
      message: 'Receipt updated successfully',
    });
  } catch (error) {
    const statusCode = error.code === 'POOL_LEAD_NOT_FOUND' ? 404 : 500;
    return res.status(statusCode).json({
      success: false,
      message: statusCode === 404 ? 'Linked pool lead not found' : 'Failed to update receipt',
      error: error.message,
    });
  }
}

export async function previewFinanceReceipt(req, res) {
  const parsed = parsePayload(req);
  if (!parsed.ok) {
    return res.status(400).json({ success: false, message: 'Invalid payload', errors: parsed.error });
  }

  try {
    const viewModel = await buildReceiptViewModel({
      inputReceipt: parsed.data,
      generatedBy: req.user?._id || null,
    });
    const preview = await buildReceiptPreviewHtml(viewModel);

    return res.json({
      success: true,
      data: {
        viewModel,
        html: preview.html,
        layoutPlan: preview.layoutPlan,
      },
    });
  } catch (error) {
    const statusCode = error.code === 'POOL_LEAD_NOT_FOUND' ? 404 : 500;
    return res.status(statusCode).json({
      success: false,
      message: statusCode === 404 ? 'Linked pool lead not found' : 'Failed to build receipt preview',
      error: error.message,
    });
  }
}

export async function issueFinanceReceipt(req, res) {
  try {
    let receipt = await Receipt.findById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    if (receipt.status !== 'DRAFT') {
      return res.status(409).json({
        success: false,
        message: 'Only draft receipts can be issued',
      });
    }

    const normalized = await normalizeReceiptPayload(receipt.toObject(), receipt.toObject());
    const validationErrors = validateIssuableReceipt(normalized);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Receipt is not ready to issue',
        errors: validationErrors,
      });
    }

    receipt.set({
      ...normalized,
      status: 'ISSUED',
      issuedAt: new Date(),
      issuedBy: req.user?._id || null,
      updatedBy: req.user?._id || null,
    });
    await receipt.save();

    receipt = await assignReceiptNumber(receipt);
    await appendActivity(
      receipt._id,
      buildActivityEntry(req, 'ISSUE_RECEIPT', {
        receiptNumber: receipt.receiptNumber,
      })
    );

    const updated = await Receipt.findById(receipt._id).lean();
    return res.json({
      success: true,
      data: mapReceiptForResponse(updated),
      message: 'Receipt issued successfully',
    });
  } catch (error) {
    const statusCode = error.code === 'POOL_LEAD_NOT_FOUND' ? 404 : 500;
    return res.status(statusCode).json({
      success: false,
      message: statusCode === 404 ? 'Linked pool lead not found' : 'Failed to issue receipt',
      error: error.message,
    });
  }
}

export async function voidFinanceReceipt(req, res) {
  const parsed = voidSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Void reason is required',
      errors: parsed.error.flatten(),
    });
  }

  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }
    if (receipt.status !== 'ISSUED') {
      return res.status(409).json({
        success: false,
        message: 'Only issued receipts can be voided',
      });
    }

    receipt.status = 'VOID';
    receipt.voidedAt = new Date();
    receipt.voidedBy = req.user?._id || null;
    receipt.updatedBy = req.user?._id || null;
    receipt.notes = {
      ...receipt.notes,
      voidReason: parsed.data.reason,
    };
    receipt.activityTrail.push(
      buildActivityEntry(req, 'VOID_RECEIPT', {
        reason: parsed.data.reason,
      })
    );
    await receipt.save();

    return res.json({
      success: true,
      data: mapReceiptForResponse(receipt.toObject()),
      message: 'Receipt voided successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to void receipt',
      error: error.message,
    });
  }
}

export async function renderFinanceReceiptDocument(req, res) {
  const parsed = renderDocumentSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid render payload',
      errors: parsed.error.flatten(),
    });
  }

  try {
    const result = await executeReceiptDocumentRender({
      receiptId: req.params.id,
      format: parsed.data.format,
      user: req.user,
    });
    return res.json({
      success: true,
      data: result,
      message: `${parsed.data.format} document generated successfully`,
    });
  } catch (error) {
    const statusCode =
      error.code === 'RECEIPT_LAYOUT_VALIDATION_FAILED'
        ? 422
        : error.code === 'RECEIPT_NOT_FOUND'
          ? 404
          : error.code === 'RECEIPT_NOT_EXPORTABLE'
            ? 409
        : error.code === 'CHROMIUM_NOT_FOUND'
          ? 500
          : 500;
    return res.status(statusCode).json({
      success: false,
      code: error.code || null,
      message:
        error.code === 'RECEIPT_LAYOUT_VALIDATION_FAILED'
          ? 'Receipt layout validation failed'
          : error.code === 'CHROMIUM_NOT_FOUND'
            ? 'Chromium executable not found for rendering'
            : 'Failed to generate receipt document',
      error: error.message,
      details: error.details || null,
    });
  }
}

export async function startFinanceReceiptRenderJob(req, res) {
  const parsed = renderDocumentSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid render payload',
      errors: parsed.error.flatten(),
    });
  }

  const job = createReceiptRenderJob({
    receiptId: req.params.id,
    format: parsed.data.format,
    requestedBy: req.user?._id || null,
  });

  updateReceiptRenderJob(job.jobId, {
    status: 'running',
    progress: 5,
    message: 'Starting export',
  });

  queueMicrotask(async () => {
    try {
      await executeReceiptDocumentRender({
        receiptId: req.params.id,
        format: parsed.data.format,
        user: req.user,
        jobId: job.jobId,
      });
    } catch (error) {
      // Job state is updated inside executeReceiptDocumentRender.
    }
  });

  return res.status(202).json({
    success: true,
    data: {
      jobId: job.jobId,
      status: 'running',
      progress: 5,
      message: 'Starting export',
      format: parsed.data.format,
    },
  });
}

export async function getFinanceReceiptRenderJob(req, res) {
  const job = getReceiptRenderJob(req.params.jobId);
  if (!job || job.receiptId !== String(req.params.id)) {
    return res.status(404).json({
      success: false,
      message: 'Render job not found',
    });
  }

  return res.json({
    success: true,
    data: job,
  });
}

export async function listFinanceReceiptDocuments(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid receipt id' });
    }
    const documents = await listReceiptDocuments(req.params.id);
    return res.json({
      success: true,
      data: documents.map(mapDocumentForResponse),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load receipt documents',
      error: error.message,
    });
  }
}

export async function downloadFinanceReceiptDocument(req, res) {
  try {
    const { id: receiptId, documentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(receiptId) || !mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).json({ success: false, message: 'Invalid receipt or document id' });
    }

    const document = await ReceiptDocument.findOne({
      _id: documentId,
      receiptId,
      status: 'SUCCESS',
    }).lean();
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const absolutePath = getReceiptStorageAbsolutePath(document.storagePath);
    await fs.access(absolutePath);

    await appendActivity(
      receiptId,
      buildActivityEntry(req, 'DOWNLOAD_DOCUMENT', {
        documentId,
        format: document.format,
        version: document.version,
      })
    );

    const extension = document.format === 'PDF' ? 'pdf' : document.format === 'PNG' ? 'png' : 'jpg';
    const contentType =
      document.format === 'PDF'
        ? 'application/pdf'
        : document.format === 'PNG'
          ? 'image/png'
          : 'image/jpeg';

    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="receipt-v${String(document.version).padStart(3, '0')}.${extension}"`
    );
    return res.sendFile(absolutePath);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to download receipt document',
      error: error.message,
    });
  }
}
