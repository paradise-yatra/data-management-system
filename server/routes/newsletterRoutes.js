import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { subscribe, getAllSubmissions, getStats, deleteSubmission } from '../controllers/newsletterController.js';

const router = express.Router();

router.post('/public', subscribe);
router.get('/', authenticateToken, getAllSubmissions);
router.get('/stats', authenticateToken, getStats);
router.delete('/:id', authenticateToken, deleteSubmission);

export default router;
