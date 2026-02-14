import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import ItineraryDocument from '../../models/ItineraryDocument.js';
import { slugify } from './pdfFormatters.js';

const STORAGE_ROOT = path.join(process.cwd(), 'server', 'storage', 'itinerary-pdfs');

function isDuplicateKeyError(error) {
  return (
    error &&
    (error.code === 11000 || error.code === 11001 || String(error.message || '').includes('E11000'))
  );
}

function buildStorageRelativePath(tripId, tripName, version) {
  const safeTripSlug = slugify(tripName || 'trip', 'trip');
  const tripFolder = String(tripId);
  const fileName = `${safeTripSlug}-v${String(version).padStart(3, '0')}.pdf`;
  return path.join(tripFolder, fileName);
}

export function getItineraryStorageAbsolutePath(storagePath) {
  return path.join(STORAGE_ROOT, storagePath);
}

export async function writePdfToStorage(storagePath, buffer) {
  const absolutePath = getItineraryStorageAbsolutePath(storagePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);
  return absolutePath;
}

export function computePdfChecksum(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function getNextVersion(tripId) {
  const latest = await ItineraryDocument.findOne({ tripId })
    .sort({ version: -1 })
    .select('version')
    .lean();
  return Number(latest?.version || 0) + 1;
}

export async function createSuccessDocumentRecord({
  tripId,
  tripName,
  pageCount,
  checksum,
  fileSizeBytes,
  generatedBy,
  renderValidationReport,
  requestSnapshot,
  templateVersion = 'A4_BROCHURE_V1',
  renderMode = 'LOCKED_A4_PUPPETEER',
}) {
  let version = await getNextVersion(tripId);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidateVersion = version + attempt;
    const storagePath = buildStorageRelativePath(tripId, tripName, candidateVersion);

    try {
      const document = await ItineraryDocument.create({
        tripId,
        version: candidateVersion,
        templateVersion,
        renderMode,
        storagePath,
        checksum,
        pageCount,
        status: 'SUCCESS',
        fileSizeBytes,
        generatedBy: generatedBy || null,
        generatedAt: new Date(),
        failureReason: null,
        renderValidationReport,
        requestSnapshot,
      });

      return document;
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        continue;
      }
      throw error;
    }
  }

  throw new Error('FAILED_TO_ASSIGN_DOCUMENT_VERSION');
}

export async function createFailedDocumentRecord({
  tripId,
  tripName,
  generatedBy,
  failureReason,
  renderValidationReport,
  requestSnapshot,
  templateVersion = 'A4_BROCHURE_V1',
  renderMode = 'LOCKED_A4_PUPPETEER',
}) {
  let version = await getNextVersion(tripId);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidateVersion = version + attempt;
    const storagePath = buildStorageRelativePath(tripId, `${tripName || 'trip'}-failed`, candidateVersion);

    try {
      const document = await ItineraryDocument.create({
        tripId,
        version: candidateVersion,
        templateVersion,
        renderMode,
        storagePath,
        checksum: 'FAILED',
        pageCount: 1,
        status: 'FAILED',
        fileSizeBytes: 0,
        generatedBy: generatedBy || null,
        generatedAt: new Date(),
        failureReason: String(failureReason || 'UNKNOWN_ERROR').slice(0, 1000),
        renderValidationReport: renderValidationReport || null,
        requestSnapshot: requestSnapshot || null,
      });

      return document;
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        continue;
      }
      throw error;
    }
  }

  throw new Error('FAILED_TO_ASSIGN_DOCUMENT_VERSION');
}

export async function listTripDocuments(tripId) {
  return ItineraryDocument.find({ tripId }).sort({ version: -1 }).lean();
}
