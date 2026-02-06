import express from 'express';
import {
  listCostItems,
  getCostItem,
  createCostItem,
  updateCostItem,
  deleteCostItem,
} from '../controllers/costItemController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/', listCostItems);
router.get('/:id', getCostItem);
router.post('/', createCostItem);
router.put('/:id', updateCostItem);
router.delete('/:id', deleteCostItem);

export default router;



