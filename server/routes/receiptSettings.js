import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { listReceiptSettings, upsertReceiptSetting } from '../controllers/receiptSettingsController.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', requirePermission('finance_receipts', 'view'), listReceiptSettings);
router.put('/:key', requirePermission('finance_receipts', 'edit'), upsertReceiptSetting);

export default router;
