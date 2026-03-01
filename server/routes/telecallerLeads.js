import express from 'express';
import TelecallerLead from '../models/TelecallerLead.js';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { createLog } from '../utils/logger.js';
import { logTelecallerAction } from '../utils/telecallerLogger.js';
import TelecallerTrash from '../models/TelecallerTrash.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { sendNotificationToUser } from '../socket/index.js';
import { enqueueLeadSyncEvent } from '../services/leadSyncService.js';

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

const enqueueTelecallerSync = async ({
    eventType,
    lead,
    payload = {},
    actor,
}) => {
    if (!lead?._id) return;
    try {
        await enqueueLeadSyncEvent({
            eventType,
            sourceSystem: 'telecaller',
            sourceLeadId: lead._id.toString(),
            sourceUniqueId: lead.uniqueId || null,
            payload: {
                ...payload,
                lead: payload.lead || lead.toObject(),
                updatedAt: lead.updatedAt || new Date(),
            },
            actor,
        });
    } catch (error) {
        console.error('Failed to enqueue telecaller sync event:', error);
    }
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
router.get('/:id([a-fA-F0-9]{24})', async (req, res) => {
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

        await enqueueTelecallerSync({
            eventType: 'lead.created',
            lead,
            actor: req.user,
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
router.put('/:id([a-fA-F0-9]{24})', async (req, res) => {
    try {
        const updateData = req.body;

        const lead = await TelecallerLead.findById(req.params.id);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        // Apply updates
        const originalLead = lead.toObject();
        const changes = {};

        Object.keys(updateData).forEach(key => {
            if (key !== '_id' && key !== 'uniqueId') {
                // Check if value actually changed
                const normalize = (val) => (val === undefined || val === null) ? '' : String(val).trim();
                const originalVal = normalize(originalLead[key]);
                const newVal = normalize(updateData[key]);

                if (originalVal !== newVal) {
                    // Record change if key is a tracked field
                    const trackedFields = ['leadName', 'phone', 'email', 'destination', 'duration', 'travelDate', 'budget', 'paxCount', 'status', 'priority', 'remarks', 'nextFollowUp'];
                    if (trackedFields.includes(key)) {
                        changes[key] = {
                            old: originalLead[key] || '',
                            new: updateData[key] || ''
                        };
                    }
                    lead[key] = updateData[key];
                }
            }
        });
        lead.updatedAt = Date.now(); // Manually set updatedAt

        await lead.save();

        // Log the action (Legacy + New System)
        await createLog('edit_telecaller_lead', req, {
            uniqueId: lead.uniqueId,
            leadName: lead.leadName,
        });

        await logTelecallerAction('UPDATE', lead, req, {
            changes: changes // Now contains detailed { old, new } structure
        });

        await enqueueTelecallerSync({
            eventType: 'lead.updated',
            lead,
            payload: { changes },
            actor: req.user,
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

        if (lead.assignedTo && lead.assignedTo.toString() === userId) {
            return res.status(400).json({ error: 'Lead is already assigned to this user' });
        }

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
        lead.assignedAt = new Date();
        await lead.save();

        // Log
        await logTelecallerAction('TRANSFER', lead, req, {
            from: previousOwnerName,
            to: targetUser.name
        });

        await enqueueTelecallerSync({
            eventType: 'lead.transferred',
            lead,
            payload: {
                from: previousOwnerName,
                to: targetUser.name,
                assignedTo: userId,
                assignedBy: req.user._id,
                assignedAt: lead.assignedAt || new Date(),
            },
            actor: req.user,
        });

        // Create notification for the target user
        const notification = await Notification.create({
            recipient: userId,
            type: 'lead_assignment',
            title: 'New Lead Assigned',
            message: `${req.user.name} assigned you a lead: ${lead.leadName || lead.phone}`,
            link: '/sales/telecaller/assigned',
            metadata: {
                leadId: lead._id,
                leadName: lead.leadName,
                phone: lead.phone,
                assignedBy: req.user.name,
                destination: lead.destination
            }
        });

        // Send real-time notification via Socket.io
        if (req.io) {
            sendNotificationToUser(req.io, userId.toString(), {
                ...notification.toObject(),
                timeAgo: 'Just now'
            });
        }

        res.json({ message: 'Lead transferred successfully', lead });
    } catch (error) {
        console.error('Transfer error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete a telecaller lead
router.delete('/:id([a-fA-F0-9]{24})', async (req, res) => {
    try {
        const lead = await TelecallerLead.findById(req.params.id);

        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        // Move to trash
        await TelecallerTrash.create({
            originalId: lead._id,
            leadData: lead.toObject(),
            deletedBy: req.user ? req.user._id : null
        });

        await TelecallerLead.findByIdAndDelete(req.params.id);

        // Log the action (Legacy + New System)
        await createLog('delete_telecaller_lead', req, {
            uniqueId: lead.uniqueId,
            leadName: lead.leadName,
        });

        await logTelecallerAction('DELETE', lead, req);

        await enqueueTelecallerSync({
            eventType: 'lead.deleted',
            lead,
            actor: req.user,
        });

        res.json({ message: 'Lead moved to trash successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// LEADS POOL ENDPOINTS
// =====================================================

// Bulk assign leads to a user
router.put('/bulk-assign', async (req, res) => {
    try {
        const { leadIds, userId } = req.body;
        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
            return res.status(400).json({ error: 'leadIds array is required' });
        }
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        const targetUser = await User.findById(userId);
        if (!targetUser) return res.status(404).json({ error: 'Target user not found' });

        // Update all leads
        const result = await TelecallerLead.updateMany(
            { _id: { $in: leadIds } },
            {
                $set: {
                    assignedTo: userId,
                    assignedBy: req.user._id,
                    assignedAt: new Date(),
                    updatedAt: new Date(),
                }
            }
        );

        // Log each assignment
        for (const leadId of leadIds) {
            const lead = await TelecallerLead.findById(leadId);
            if (lead) {
                await logTelecallerAction('TRANSFER', lead, req, {
                    from: 'Unassigned (Pool)',
                    to: targetUser.name,
                    bulkAssign: true,
                });

                await enqueueTelecallerSync({
                    eventType: 'lead.transferred',
                    lead,
                    payload: {
                        from: 'Unassigned (Pool)',
                        to: targetUser.name,
                        assignedTo: userId,
                        assignedBy: req.user._id,
                        assignedAt: lead.assignedAt || new Date(),
                        bulkAssign: true,
                    },
                    actor: req.user,
                });
            }
        }

        // Create a single notification for the target user
        const notification = await Notification.create({
            recipient: userId,
            type: 'lead_assignment',
            title: 'New Leads Assigned',
            message: `${req.user.name} assigned you ${leadIds.length} lead${leadIds.length !== 1 ? 's' : ''}`,
            link: '/sales/telecaller/assigned',
            metadata: {
                leadCount: leadIds.length,
                assignedBy: req.user.name,
            }
        });

        // Send real-time notification via Socket.io
        if (req.io) {
            sendNotificationToUser(req.io, userId.toString(), {
                ...notification.toObject(),
                timeAgo: 'Just now'
            });
        }

        res.json({
            message: `${result.modifiedCount} lead(s) assigned to ${targetUser.name}`,
            modifiedCount: result.modifiedCount,
        });
    } catch (error) {
        console.error('Bulk assign error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Bulk create leads (for Excel import)
router.post('/bulk-create', async (req, res) => {
    try {
        const { leads } = req.body;
        if (!leads || !Array.isArray(leads) || leads.length === 0) {
            return res.status(400).json({ error: 'leads array is required' });
        }

        const results = { success: 0, failed: 0, created: [], errors: [] };

        for (let i = 0; i < leads.length; i++) {
            try {
                const leadData = leads[i];
                if (!leadData.phone) {
                    results.errors.push({ index: i, error: 'Phone is required' });
                    results.failed++;
                    continue;
                }

                const lead = new TelecallerLead({
                    ...leadData,
                    status: leadData.status || 'Hot',
                    dateAdded: leadData.dateAdded || getISTDateTime(),
                    addedBy: req.user ? req.user.name : 'Excel Import',
                    addedById: req.user ? req.user._id : null,
                    source: leadData.source || 'Excel Import',
                });

                await lead.save();
                results.created.push(lead);
                results.success++;

                await enqueueTelecallerSync({
                    eventType: 'lead.created',
                    lead,
                    payload: { import: true },
                    actor: req.user,
                });
            } catch (err) {
                results.errors.push({ index: i, error: err.message });
                results.failed++;
            }
        }

        // Log the bulk import
        await createLog('bulk_import_telecaller_leads', req, {
            totalAttempted: leads.length,
            success: results.success,
            failed: results.failed,
        });

        res.status(201).json({
            message: `Imported ${results.success} of ${leads.length} leads`,
            success: results.success,
            failed: results.failed,
            results: {
                created: results.created,
                failed: results.errors,
            }
        });
    } catch (error) {
        console.error('Bulk create error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add a comment to a lead
router.post('/:id/comments', async (req, res) => {
    try {
        const { text, mentions } = req.body;
        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'Comment text is required' });
        }

        const lead = await TelecallerLead.findById(req.params.id);
        if (!lead) return res.status(404).json({ error: 'Lead not found' });

        const comment = {
            text: text.trim(),
            userId: req.user._id,
            userName: req.user.name,
            mentions: mentions || [],
            externalCommentId: `telecaller:${req.params.id}:${Date.now()}`,
            sourceSystem: 'telecaller',
        };

        lead.comments.push(comment);
        await lead.save();

        // Notify mentioned users
        if (mentions && mentions.length > 0) {
            for (const mentionedUserId of mentions) {
                if (mentionedUserId !== req.user._id.toString()) {
                    const notification = await Notification.create({
                        recipient: mentionedUserId,
                        type: 'mention',
                        title: 'You were mentioned',
                        message: `${req.user.name} mentioned you in a comment on lead: ${lead.leadName || lead.phone}`,
                        link: '/sales/leads-pool',
                        metadata: {
                            leadId: lead._id,
                            leadName: lead.leadName,
                            commentText: text.substring(0, 100),
                        }
                    });

                    if (req.io) {
                        sendNotificationToUser(req.io, mentionedUserId, {
                            ...notification.toObject(),
                            timeAgo: 'Just now'
                        });
                    }
                }
            }
        }

        // Also notify the assigned user if they're not the commenter
        if (lead.assignedTo && lead.assignedTo.toString() !== req.user._id.toString()) {
            const notification = await Notification.create({
                recipient: lead.assignedTo,
                type: 'lead_update',
                title: 'New Comment on Lead',
                message: `${req.user.name} commented on lead: ${lead.leadName || lead.phone}`,
                link: '/sales/leads-pool',
                metadata: {
                    leadId: lead._id,
                    leadName: lead.leadName,
                }
            });

            if (req.io) {
                sendNotificationToUser(req.io, lead.assignedTo.toString(), {
                    ...notification.toObject(),
                    timeAgo: 'Just now'
                });
            }
        }

        const savedComment = lead.comments[lead.comments.length - 1];

        await enqueueTelecallerSync({
            eventType: 'lead.commented',
            lead,
            payload: {
                comment: {
                    commentId: savedComment?._id?.toString?.() || null,
                    externalCommentId: savedComment?.externalCommentId,
                    text: savedComment?.text,
                    userId: savedComment?.userId,
                    userName: savedComment?.userName,
                    mentions: savedComment?.mentions || [],
                    createdAt: savedComment?.createdAt || new Date(),
                },
            },
            actor: req.user,
        });

        res.status(201).json(savedComment);
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get comments for a lead
router.get('/:id/comments', async (req, res) => {
    try {
        const lead = await TelecallerLead.findById(req.params.id, 'comments');
        if (!lead) return res.status(404).json({ error: 'Lead not found' });
        res.json(lead.comments || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get activity log for a lead (using telecaller logs)
router.get('/:id/activity', async (req, res) => {
    try {
        const TelecallerLog = (await import('../models/TelecallerLog.js')).default;
        const lead = await TelecallerLead.findById(req.params.id, 'uniqueId');
        const query = {
            $or: [
                { entityId: req.params.id },
                ...(lead?.uniqueId ? [{ entityId: lead.uniqueId }] : []),
            ],
        };
        const logs = await TelecallerLog.find(query)
            .sort({ timestamp: -1 })
            .limit(50);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

