import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import ReceiptDocument from '../../models/ReceiptDocument.js';
import { slugify } from './receiptFormatters.js';

const STORAGE_ROOT = path.join(process.cwd(), 'server', 'storage', 'receipt-documents');

function isDuplicateKeyError(error) {
  return (
    error &&
    (error.code === 11000 || error.code === 11001 || String(error.message || '').includes('E11000'))
  );
}

function buildStorageRelativePath(receiptId, receiptNumber, version, extension) {
  const safeName = slugify(receiptNumber || 'receipt', 'receipt');
  const folder = String(receiptId);
  const fileName = `${safeName}-v${String(version).padStart(3, '0')}.${extension}`;
  return path.join(folder, fileName);
}

export function getReceiptStorageAbsolutePath(storagePath) {
  return path.join(STORAGE_ROOT, storagePath);
}

export async function writeReceiptBufferToStorage(storagePath, buffer) {
  const absolutePath = getReceiptStorageAbsolutePath(storagePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);
  return absolutePath;
}

export function computeReceiptChecksum(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function getNextVersion(receiptId) {
  const latest = await ReceiptDocument.findOne({ receiptId })
    .sort({ version: -1 })
    .select('version')
    .lean();
  return Number(latest?.version || 0) + 1;
}

export async function createSuccessReceiptDocumentRecord({
  receiptId,
  receiptNumber,
  format,
  checksum,
  fileSizeBytes,
  generatedBy,
  renderValidationReport,
  requestSnapshot,
  widthPx = null,
  heightPx = null,
  pageCount = 1,
  templateVersion = 'FINANCE_RECEIPT_A4_V1',
  renderMode = 'LOCKED_A4_PUPPETEER',
  extension,
}) {
  const version = await getNextVersion(receiptId);
  const storagePath = buildStorageRelativePath(receiptId, receiptNumber, version, extension);

  return ReceiptDocument.create({
    receiptId,
    version,
    templateVersion,
    renderMode,
    format,
    storagePath,
    checksum,
    pageCount,
    widthPx,
    heightPx,
    fileSizeBytes,
    status: 'SUCCESS',
    generatedBy: generatedBy || null,
    generatedAt: new Date(),
    renderValidationReport,
    requestSnapshot,
    failureReason: null,
  });
}

export async function createFailedReceiptDocumentRecord({
  receiptId,
  format,
  generatedBy,
  failureReason,
  renderValidationReport,
  requestSnapshot,
  templateVersion = 'FINANCE_RECEIPT_A4_V1',
  renderMode = 'LOCKED_A4_PUPPETEER',
}) {
  const version = await getNextVersion(receiptId);

  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      return await ReceiptDocument.create({
        receiptId,
        version: version + attempt,
        templateVersion,
        renderMode,
        format,
        storagePath: buildStorageRelativePath(
          receiptId,
          `failed-${format.toLowerCase()}`,
          version + attempt,
          'log'
        ),
        checksum: 'FAILED',
        pageCount: 1,
        widthPx: null,
        heightPx: null,
        fileSizeBytes: 0,
        status: 'FAILED',
        generatedBy: generatedBy || null,
        generatedAt: new Date(),
        renderValidationReport: renderValidationReport || null,
        requestSnapshot: requestSnapshot || null,
        failureReason: String(failureReason || 'UNKNOWN_ERROR').slice(0, 1000),
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        continue;
      }
      throw error;
    }
  }

  throw new Error('FAILED_TO_ASSIGN_RECEIPT_DOCUMENT_VERSION');
}

export async function listReceiptDocuments(receiptId) {
  return ReceiptDocument.find({ receiptId }).sort({ version: -1 }).lean();
}
