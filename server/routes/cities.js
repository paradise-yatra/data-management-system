import express from 'express';
import {
  listCities,
  getCity,
  createCity,
  updateCity,
  deleteCity,
} from '../controllers/cityController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/', listCities);
router.get('/:id', getCity);
router.post('/', createCity);
router.put('/:id', updateCity);
router.delete('/:id', deleteCity);

export default router;



