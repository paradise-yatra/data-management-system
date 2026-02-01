import express from 'express';
import {
  listSettings,
  getSetting,
  upsertSetting,
  updateDefaultMarkup,
} from '../controllers/settingController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/', listSettings);
router.get('/:key', getSetting);
router.post('/', upsertSetting);
router.put('/markup', updateDefaultMarkup);

export default router;


