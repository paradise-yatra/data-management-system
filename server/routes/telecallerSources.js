import express from 'express';
import TelecallerSource from '../models/TelecallerSource.js';
import { authenticateToken } from '../middleware/auth.js';
import { createLog } from '../utils/logger.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
    try {
        const sources = await TelecallerSource.find().sort({ name: 1 });
        res.json(sources);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const source = new TelecallerSource({ name });
        await source.save();

        await createLog('add_telecaller_source', req, { name });
        res.status(201).json(source);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const source = await TelecallerSource.findByIdAndDelete(req.params.id);
        if (!source) return res.status(404).json({ error: 'Source not found' });

        await createLog('delete_telecaller_source', req, { name: source.name });
        res.json({ message: 'Source deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
