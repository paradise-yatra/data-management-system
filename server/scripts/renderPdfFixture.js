import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import Trip from '../models/Trip.js';
import { buildItineraryPdfViewModel } from '../services/pdf/pdfViewModelService.js';
import { renderItineraryPdfBuffer } from '../services/pdf/pdfRenderService.js';
import { computePdfChecksum } from '../services/pdf/itineraryDocumentService.js';

dotenv.config();

async function run() {
  const trip = await Trip.findOne({}).sort({ updatedAt: -1 }).lean();
  if (!trip) {
    throw new Error('No trip found. Seed data first using npm run seed:logictravel');
  }

  const viewModel = await buildItineraryPdfViewModel({
    tripId: trip._id,
    generatedBy: null,
  });

  const result = await renderItineraryPdfBuffer(viewModel);
  const checksum = computePdfChecksum(result.pdfBuffer);
  const outputDir = path.join(process.cwd(), 'server', 'storage', 'fixtures');
  const outputPath = path.join(outputDir, 'logictravel-itinerary-fixture.pdf');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, result.pdfBuffer);

  console.log('Fixture PDF generated successfully');
  console.log(`Trip: ${trip.name}`);
  console.log(`Output: ${outputPath}`);
  console.log(`Checksum: ${checksum}`);
  console.log(`Page Count: ${result.pageCount}`);
  console.log(`Pass Used: ${result.passUsed}`);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to generate fixture PDF');
    console.error(error);
    process.exit(1);
  });
