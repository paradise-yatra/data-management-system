import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  listTrips,
  getTrip,
  createTrip,
  updateTrip,
  upsertTripDay,
  autoScheduleTripDay,
  recalculateAllTripDays,
  deleteTrip,
} from '../controllers/tripController.js';
import {
  previewTripPdfData,
  renderTripPdf,
  listTripPdfDocuments,
  downloadTripPdfDocument,
} from '../controllers/tripPdfController.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', listTrips);
router.get('/:id', getTrip);
router.post('/', createTrip);
router.put('/:id', updateTrip);
router.delete('/:id', deleteTrip);

router.put('/:id/days/:dayIndex', upsertTripDay);
router.post('/:id/auto-schedule-day/:dayIndex', autoScheduleTripDay);
router.post('/:id/recalculate-all', recalculateAllTripDays);

router.post('/:id/pdf/preview-data', previewTripPdfData);
router.post('/:id/pdf/render', renderTripPdf);
router.get('/:id/pdf/documents', listTripPdfDocuments);
router.get('/:id/pdf/documents/:documentId/download', downloadTripPdfDocument);

export default router;
