import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
    getSubmissions,
    getSubmissionById,
    createSubmission,
    updateSubmission,
    deleteSubmission,
    getSubmissionStats,
} from '../controllers/headerFormSubmissionController.js';

const router = express.Router();

// Public route — website form submission (no auth required)
router.post('/public', createSubmission);

// Authenticated routes — CRM panel
router.get('/', authenticateToken, getSubmissions);
router.get('/stats', authenticateToken, getSubmissionStats);
router.get('/:id', authenticateToken, getSubmissionById);
router.put('/:id', authenticateToken, updateSubmission);
router.delete('/:id', authenticateToken, deleteSubmission);

export default router;
