import express from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import {
  listItineraryBuilderSettings,
  upsertItineraryBuilderSetting,
} from '../controllers/itineraryBuilderSettingsController.js';

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRoles('admin'));

router.get('/', listItineraryBuilderSettings);
router.put('/:key', upsertItineraryBuilderSetting);

export default router;
