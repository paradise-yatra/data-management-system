import express from 'express';
import TelecallerTrash from '../models/TelecallerTrash.js';
import TelecallerLead from '../models/TelecallerLead.js';
import { authenticateToken } from '../middleware/auth.js';
import { createLog } from '../utils/logger.js';
import { logTelecallerAction } from '../utils/telecallerLogger.js';

const router = express.Router();

router.use(authenticateToken);

// GET /api/telecaller-trash - List all trash items
router.get('/', async (req, res) => {
    try {
        const trashItems = await TelecallerTrash.find().sort({ deletedAt: -1 });
        res.json(trashItems);
    } catch (error) {
        console.error('Error fetching trash items:', error);
        res.status(500).json({ error: 'Failed to fetch trash items' });
    }
});

// POST /api/telecaller-trash/restore/:id - Restore a lead
router.post('/restore/:id', async (req, res) => {
    try {
        const trashItem = await TelecallerTrash.findById(req.params.id);
        if (!trashItem) {
            return res.status(404).json({ error: 'Trash item not found' });
        }

        // Check if lead with same uniqueId already exists (collision check)
        // Ideally we should rely on _id but we are creating a NEW doc on restore? 
        // Or should we restore with same _id? Restoring with same _id is better to keep links.
        // Mongoose insertMany or create can accept _id.

        // Let's try to restore with original ID if possible, or fallback to new ID if conflict (unlikely unless manual insert)
        const leadData = trashItem.leadData;

        // Remove _id from leadData if we want to allow new ID generation? 
        // A restored item should probably keep its identity.
        // However, if the user created a NEW lead with same uniqueId while this was in trash?
        // Let's check unique ID collision.
        // Assuming uniqueId is unique.

        const existing = await TelecallerLead.findOne({ uniqueId: leadData.uniqueId });
        if (existing) {
            // Conflict: A lead with this Unique ID already exists. 
            // We could append restored_ to uniqueId or just error.
            return res.status(400).json({ error: `Cannot restore: A lead with Unique ID ${leadData.uniqueId} already exists.` });
        }

        await TelecallerLead.create(leadData);
        await TelecallerTrash.findByIdAndDelete(req.params.id);

        await createLog('restore_telecaller_lead', req, {
            uniqueId: leadData.uniqueId,
            leadName: leadData.leadName,
        });

        // We can't easily log to telecaller logs nicely since the lead object is newly created/different instance?
        // But we have leadData.
        // Let's log 'RESTORE' action on the newly created lead?
        // logTelecallerAction needs a Mongoose document.
        const newLead = await TelecallerLead.findOne({ uniqueId: leadData.uniqueId });
        if (newLead) {
            await logTelecallerAction('RESTORE', newLead, req);
        }

        res.json({ message: 'Lead restored successfully' });
    } catch (error) {
        console.error('Error restoring lead:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/telecaller-trash/:id - Permanently delete
router.delete('/:id', async (req, res) => {
    try {
        const trashItem = await TelecallerTrash.findByIdAndDelete(req.params.id);
        if (!trashItem) {
            return res.status(404).json({ error: 'Trash item not found' });
        }

        const leadData = trashItem.leadData;
        await createLog('permanent_delete_telecaller_lead', req, {
            uniqueId: leadData?.uniqueId || 'unknown',
            leadName: leadData?.leadName || 'unknown',
        });

        res.json({ message: 'Lead permanently deleted' });
    } catch (error) {
        console.error('Error deleting trash item:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
