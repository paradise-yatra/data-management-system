import express from 'express';
import TelecallerLead from '../models/TelecallerLead.js';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { createLog } from '../utils/logger.js';
import { logTelecallerAction } from '../utils/telecallerLogger.js';
import TelecallerTrash from '../models/TelecallerTrash.js';
import User from '../models/User.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get current date and time in Indian Standard Time (IST)
const getISTDateTime = () => {
    const now = new Date();
    const istString = now.toLocaleString('en-US', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });

    const [datePart, timePart] = istString.split(', ');
    const [month, day, year] = datePart.split('/');
    const [hours, minutes, seconds] = timePart.split(':');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+05:30`;
};

// Get all telecaller leads
router.get('/', async (req, res) => {
    try {
        const leads = await TelecallerLead.find().sort({ dateAdded: -1, createdAt: -1 });
        res.json(leads);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get a single lead by ID
router.get('/:id', async (req, res) => {
    try {
        const lead = await TelecallerLead.findById(req.params.id);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        res.json(lead);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a new telecaller lead
router.post('/', async (req, res) => {
    try {
        const {
            leadName, phone, email, destination, duration,
            travelDate, budget, paxCount, status, nextFollowUp,
            remarks, dateAdded
        } = req.body;

        // Simple validation
        if (!phone || !status) {
            return res.status(400).json({ error: 'Phone and Status are required' });
        }

        const lead = new TelecallerLead({
            leadName,
            phone,
            email: email || '',
            destination,
            duration,
            travelDate,
            budget,
            paxCount,
            status: status || 'New',
            nextFollowUp,
            remarks: remarks || '',
            remarks: remarks || '',
            dateAdded: dateAdded || getISTDateTime(),
            addedBy: req.user ? req.user.name : 'Unknown',
            addedById: req.user ? req.user._id : null,
        });

        await lead.save();

        // Log the action (Legacy + New System)
        await createLog('add_telecaller_lead', req, {
            uniqueId: lead.uniqueId,
            leadName: lead.leadName,
            destination: lead.destination,
        });

        await logTelecallerAction('CREATE', lead, req, {
            initialStatus: lead.status,
            phone: lead.phone
        });

        res.status(201).json(lead);
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ error: messages.join(', ') });
        }
        res.status(500).json({ error: error.message });
    }
});

// Update a telecaller lead
router.put('/:id', async (req, res) => {
    try {
        const updateData = req.body;
        updateData.updatedAt = Date.now();

        const lead = await TelecallerLead.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        // Calculate Changes (Simple approximation)
        // ideally we would compare oldLead vs newLead, but to save a DB call we'll just log the updateData 
        // For critical fields, valid approach is fetching first, but for now this is efficient.

        // Log the action (Legacy + New System)
        await createLog('edit_telecaller_lead', req, {
            uniqueId: lead.uniqueId,
            leadName: lead.leadName,
        });

        await logTelecallerAction('UPDATE', lead, req, {
            changes: updateData
        });

        res.json(lead);
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ error: messages.join(', ') });
        }
        res.status(500).json({ error: error.message });
    }
});

// Transfer a lead
router.post('/:id/transfer', requirePermission('telecaller_transfer', 'view'), async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'Target user ID is required' });

        const lead = await TelecallerLead.findById(req.params.id);
        if (!lead) return res.status(404).json({ error: 'Lead not found' });

        const targetUser = await User.findById(userId);
        if (!targetUser) return res.status(404).json({ error: 'Target user not found' });

        // Get previous owner name if assigned
        let previousOwnerName = 'Unassigned';
        if (lead.assignedTo) {
            const previousOwner = await User.findById(lead.assignedTo);
            if (previousOwner) {
                previousOwnerName = previousOwner.name;
            }
        }

        lead.assignedTo = userId;
        lead.assignedBy = req.user._id;
        await lead.save();

        // Log
        await logTelecallerAction('TRANSFER', lead, req, {
            from: previousOwnerName,
            to: targetUser.name
        });

        res.json({ message: 'Lead transferred successfully', lead });
    } catch (error) {
        console.error('Transfer error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete a telecaller lead
router.delete('/:id', async (req, res) => {
    try {
        const lead = await TelecallerLead.findById(req.params.id);

        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        // Move to trash
        await TelecallerTrash.create({
            originalId: lead._id,
            leadData: lead.toObject(),
            deletedBy: req.user ? req.user._id : null // Assuming authentication middleware attaches user
        });

        await TelecallerLead.findByIdAndDelete(req.params.id);

        // Log the action (Legacy + New System)
        await createLog('delete_telecaller_lead', req, {
            uniqueId: lead.uniqueId,
            leadName: lead.leadName,
        });

        await logTelecallerAction('DELETE', lead, req);

        res.json({ message: 'Lead moved to trash successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
