import express from 'express';
import {
    listCategories,
    createCategory,
    getCategory,
    updateCategory,
    deleteCategory,
    getCategoryBySlug
} from '../controllers/tourCategoryController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = express.Router();

// Public routes
router.get('/public', listCategories);
router.get('/public/slug/:slug', getCategoryBySlug);

// All routes require authentication
router.use(authenticateToken);

router.get('/', requirePermission('voya_trail_category', 'view'), listCategories);
router.post('/', requirePermission('voya_trail_category', 'edit'), createCategory);
router.get('/:id', requirePermission('voya_trail_category', 'view'), getCategory);
router.put('/:id', requirePermission('voya_trail_category', 'edit'), updateCategory);
router.delete('/:id', requirePermission('voya_trail_category', 'full'), deleteCategory);

export default router;
