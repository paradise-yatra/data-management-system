import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  validateLogicEvent,
  calculateRoute,
  autoScheduleDayEndpoint,
  reorderAndRecalculate,
} from '../controllers/logicController.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/validate', validateLogicEvent);
router.post('/route', calculateRoute);
router.post('/auto-schedule-day', autoScheduleDayEndpoint);
router.post('/reorder-and-recalculate', reorderAndRecalculate);

export default router;

