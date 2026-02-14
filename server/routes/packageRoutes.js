import express from 'express';
import multer from 'multer';
import * as packageController from '../controllers/packageController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = express.Router();

// Multer setup for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 200 * 1024 } // 200KB limit
});

// Public routes (if any needed, currently all protected by authenticateToken in index.js or here)
// We'll protect all these routes
// Public routes
router.get('/public', packageController.getPublicPackages);
router.get('/search', packageController.searchAll);
router.get('/quality-check', packageController.getQualityCheck); // New route
router.get('/public/:slug', packageController.getPackageBySlug);

// Protected routes
router.use(authenticateToken);

router.post('/', requirePermission('voya_trail_packages', 'edit'), packageController.createPackage);
router.get('/', requirePermission('voya_trail_packages', 'view'), packageController.getAllPackages);
router.get('/:id', requirePermission('voya_trail_packages', 'view'), packageController.getPackageById);
router.put('/:id', requirePermission('voya_trail_packages', 'edit'), packageController.updatePackage);
router.delete('/:id', requirePermission('voya_trail_packages', 'full'), packageController.deletePackage);

// Image upload route
router.post('/upload', requirePermission('voya_trail_package_form', 'edit'), upload.single('image'), packageController.uploadImage);

export default router;
