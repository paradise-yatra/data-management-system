import express from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import {
  listPlaces,
  getPlace,
  createPlace,
  updatePlace,
  deletePlace,
} from '../controllers/placeController.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', listPlaces);
router.get('/:id', getPlace);
router.post('/', authorizeRoles('admin'), createPlace);
router.put('/:id', authorizeRoles('admin'), updatePlace);
router.delete('/:id', authorizeRoles('admin'), deletePlace);

export default router;
