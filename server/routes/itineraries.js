import express from 'express';
import {
  listItineraries,
  getItinerary,
  createItinerary,
  updateItinerary,
  recalculateItinerary,
  lockItinerary,
  deleteItinerary,
} from '../controllers/itineraryController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/', listItineraries);
router.get('/:id', getItinerary);
router.post('/', createItinerary);
router.put('/:id', updateItinerary);
router.post('/:id/recalculate', recalculateItinerary);
router.post('/:id/lock', lockItinerary);
router.delete('/:id', deleteItinerary);

export default router;


