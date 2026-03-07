import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  createFinanceReceipt,
  downloadFinanceReceiptDocument,
  getFinanceReceipt,
  getFinanceReceiptRenderJob,
  issueFinanceReceipt,
  listFinanceReceiptDocuments,
  listFinanceReceipts,
  previewFinanceReceipt,
  renderFinanceReceiptDocument,
  startFinanceReceiptRenderJob,
  updateFinanceReceipt,
  voidFinanceReceipt,
} from '../controllers/financeReceiptController.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', requirePermission('finance_receipts', 'view'), listFinanceReceipts);
router.post('/', requirePermission('finance_receipts', 'edit'), createFinanceReceipt);
router.post('/preview', requirePermission('finance_receipts', 'view'), previewFinanceReceipt);
router.get('/:id', requirePermission('finance_receipts', 'view'), getFinanceReceipt);
router.put('/:id', requirePermission('finance_receipts', 'edit'), updateFinanceReceipt);
router.post('/:id/issue', requirePermission('finance_receipts', 'edit'), issueFinanceReceipt);
router.post('/:id/void', requirePermission('finance_receipts', 'edit'), voidFinanceReceipt);
router.post('/:id/documents/render-jobs', requirePermission('finance_receipts', 'edit'), startFinanceReceiptRenderJob);
router.get('/:id/documents/render-jobs/:jobId', requirePermission('finance_receipts', 'view'), getFinanceReceiptRenderJob);
router.post('/:id/documents/render', requirePermission('finance_receipts', 'edit'), renderFinanceReceiptDocument);
router.get('/:id/documents', requirePermission('finance_receipts', 'view'), listFinanceReceiptDocuments);
router.get('/:id/documents/:documentId/download', requirePermission('finance_receipts', 'view'), downloadFinanceReceiptDocument);

export default router;
