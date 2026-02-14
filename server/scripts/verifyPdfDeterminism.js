import dotenv from 'dotenv';
import crypto from 'crypto';
import Trip from '../models/Trip.js';
import { buildItineraryPdfViewModel } from '../services/pdf/pdfViewModelService.js';
import { renderItineraryPdfBuffer } from '../services/pdf/pdfRenderService.js';
import { computePdfChecksum } from '../services/pdf/itineraryDocumentService.js';

dotenv.config();

function computeCanonicalChecksum(buffer) {
  const normalized = buffer
    .toString('latin1')
    .replace(/\/CreationDate\s*\(D:[^)]+\)/g, '/CreationDate(D:19700101000000Z)')
    .replace(/\/ModDate\s*\(D:[^)]+\)/g, '/ModDate(D:19700101000000Z)')
    .replace(/\/ID\s*\[<[^>]+>\s*<[^>]+>\]/g, '/ID[<00><00>]')
    .replace(/\/Producer\s*\([^)]+\)/g, '/Producer(LogicTravelPro)')
    .replace(/\/Creator\s*\([^)]+\)/g, '/Creator(LogicTravelPro)');

  return crypto.createHash('sha256').update(normalized, 'latin1').digest('hex');
}

async function renderOnce(tripId) {
  const viewModel = await buildItineraryPdfViewModel({ tripId, generatedBy: null });
  const result = await renderItineraryPdfBuffer(viewModel);
  const checksum = computePdfChecksum(result.pdfBuffer);
  const canonicalChecksum = computeCanonicalChecksum(result.pdfBuffer);
  return {
    checksum,
    canonicalChecksum,
    pageCount: result.pageCount,
    passUsed: result.passUsed,
  };
}

async function run() {
  const trip = await Trip.findOne({}).sort({ updatedAt: -1 }).lean();
  if (!trip) {
    throw new Error('No trip found. Seed data first using npm run seed:logictravel');
  }

  const first = await renderOnce(trip._id);
  const second = await renderOnce(trip._id);

  const matches =
    first.canonicalChecksum === second.canonicalChecksum && first.pageCount === second.pageCount;
  if (!matches) {
    console.error('Determinism check failed');
    console.error('Run 1:', first);
    console.error('Run 2:', second);
    process.exit(1);
  }

  console.log('Determinism check passed');
  console.log(`Raw Checksum (run 1): ${first.checksum}`);
  console.log(`Canonical Checksum: ${first.canonicalChecksum}`);
  console.log(`Page Count: ${first.pageCount}`);
  console.log(`Pass Used: ${first.passUsed}`);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Determinism verification failed');
    console.error(error);
    process.exit(1);
  });
