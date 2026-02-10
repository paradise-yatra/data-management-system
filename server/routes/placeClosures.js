import express from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import {
  listPlaceClosures,
  createPlaceClosure,
  updatePlaceClosure,
  deletePlaceClosure,
} from '../controllers/placeClosureController.js';

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRoles('admin'));

router.get('/', listPlaceClosures);
router.post('/', createPlaceClosure);
router.put('/:id', updatePlaceClosure);
router.delete('/:id', deletePlaceClosure);

export default router;
