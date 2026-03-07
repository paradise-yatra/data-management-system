import crypto from 'crypto';

const JOB_TTL_MS = 10 * 60 * 1000;
const jobs = new Map();

function pruneExpiredJobs() {
  const now = Date.now();
  for (const [jobId, job] of jobs.entries()) {
    if (now - job.updatedAt > JOB_TTL_MS) {
      jobs.delete(jobId);
    }
  }
}

function sanitizeMessage(message, fallback) {
  return typeof message === 'string' && message.trim() ? message.trim() : fallback;
}

export function createReceiptRenderJob({ receiptId, format, requestedBy }) {
  pruneExpiredJobs();

  const jobId = crypto.randomUUID();
  const job = {
    jobId,
    receiptId: String(receiptId),
    format,
    requestedBy: requestedBy ? String(requestedBy) : null,
    status: 'queued',
    progress: 0,
    message: 'Queued for export',
    documentId: null,
    downloadUrl: null,
    checksum: null,
    version: null,
    error: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  jobs.set(jobId, job);
  return { ...job };
}

export function updateReceiptRenderJob(jobId, patch = {}) {
  const existing = jobs.get(jobId);
  if (!existing) return null;

  const next = {
    ...existing,
    ...patch,
    progress:
      typeof patch.progress === 'number'
        ? Math.max(0, Math.min(100, Math.round(patch.progress)))
        : existing.progress,
    message: patch.message !== undefined ? sanitizeMessage(patch.message, existing.message) : existing.message,
    updatedAt: Date.now(),
  };

  jobs.set(jobId, next);
  return { ...next };
}

export function getReceiptRenderJob(jobId) {
  pruneExpiredJobs();
  const job = jobs.get(jobId);
  return job ? { ...job } : null;
}

export function completeReceiptRenderJob(jobId, patch = {}) {
  return updateReceiptRenderJob(jobId, {
    ...patch,
    status: 'completed',
    progress: 100,
    message: patch.message || 'Export ready',
    error: null,
  });
}

export function failReceiptRenderJob(jobId, errorMessage, patch = {}) {
  return updateReceiptRenderJob(jobId, {
    ...patch,
    status: 'failed',
    message: patch.message || 'Export failed',
    error: sanitizeMessage(errorMessage, 'Export failed'),
  });
}
