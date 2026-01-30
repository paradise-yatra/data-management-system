import express from 'express';
import {
    listDestinations,
    createDestination,
    getDestination,
    updateDestination,
    deleteDestination
} from '../controllers/destinationController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = express.Router();

// Public routes (if any needed, e.g. for website)
router.get('/public', listDestinations);

// All management routes require authentication
router.use(authenticateToken);

router.get('/', requirePermission('voya_trail_destinations', 'view'), listDestinations);
router.post('/', requirePermission('voya_trail_destinations', 'edit'), createDestination);
router.get('/:id', requirePermission('voya_trail_destinations', 'view'), getDestination);
router.put('/:id', requirePermission('voya_trail_destinations', 'edit'), updateDestination);
router.delete('/:id', requirePermission('voya_trail_destinations', 'full'), deleteDestination);

export default router;
