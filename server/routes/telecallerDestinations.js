import express from 'express';
import TelecallerDestination from '../models/TelecallerDestination.js';
import TelecallerLead from '../models/TelecallerLead.js';
import { authenticateToken } from '../middleware/auth.js';
import { createLog } from '../utils/logger.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
    try {
        const destinations = await TelecallerDestination.find().sort({ name: 1 });
        res.json(destinations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const destination = new TelecallerDestination({ name });
        await destination.save();

        await createLog('add_telecaller_destination', req, { name });
        res.status(201).json(destination);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const destination = await TelecallerDestination.findById(req.params.id);
        if (!destination) return res.status(404).json({ error: 'Destination not found' });

        const oldName = destination.name;
        const newName = name.trim();

        if (oldName === newName) {
            return res.json(destination);
        }

        // Check if new name already exists
        const existing = await TelecallerDestination.findOne({ name: newName });
        if (existing) return res.status(400).json({ error: 'Destination with this name already exists' });

        // Update the destination
        destination.name = newName;
        await destination.save();

        // Update all leads using this destination
        await TelecallerLead.updateMany(
            { destination: oldName },
            { $set: { destination: newName } }
        );

        await createLog('update_telecaller_destination', req, { oldName, newName });

        res.json(destination);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const destination = await TelecallerDestination.findById(req.params.id);
        if (!destination) return res.status(404).json({ error: 'Destination not found' });

        // Check if destination is used in any lead
        const leadWithDestination = await TelecallerLead.findOne({ destination: destination.name });
        if (leadWithDestination) {
            return res.status(400).json({
                error: `Cannot delete destination "${destination.name}" as it is currently being used by one or more leads.`
            });
        }

        await TelecallerDestination.findByIdAndDelete(req.params.id);

        await createLog('delete_telecaller_destination', req, { name: destination.name });
        res.json({ message: 'Destination deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
