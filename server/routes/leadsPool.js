import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import PoolLead from '../models/PoolLead.js';
import PoolLeadComment from '../models/PoolLeadComment.js';
import PoolAssignment from '../models/PoolAssignment.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { sendNotificationToUser } from '../socket/index.js';
import { logLeadsPoolAction } from '../utils/leadsPoolActivityLogger.js';
import { enqueueLeadSyncEvent, processLeadSyncOutbox } from '../services/leadSyncService.js';

const router = express.Router();

router.use(authenticateToken);

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

const trackedFields = [
    'leadName',
    'phone',
    'email',
    'destination',
    'duration',
    'travelDate',
    'budget',
    'paxCount',
    'adults',
    'children',
    'status',
    'remarks',
    'nextFollowUp',
    'assignedTo',
    'assignedBy',
    'assignedAt',
    'source',
];

const buildChanges = (originalLead, nextData = {}) => {
    const changes = {};
    const normalize = (value) => (value === undefined || value === null ? '' : String(value).trim());

    for (const key of Object.keys(nextData)) {
        if (!trackedFields.includes(key) || key === '_id' || key === 'uniqueId') continue;

        const oldValue = normalize(originalLead[key]);
        const newValue = normalize(nextData[key]);

        if (oldValue !== newValue) {
            changes[key] = {
                old: originalLead[key] ?? '',
                new: nextData[key] ?? '',
            };
        }
    }

    return changes;
};

const enqueuePoolSync = async ({
    eventType,
    lead,
    payload = {},
    actor,
}) => {
    if (!lead?._id) return;
    try {
        await enqueueLeadSyncEvent({
            eventType,
            sourceSystem: 'pool',
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
        console.error('Failed to enqueue pool sync event:', error);
    }
};

// Manual sync trigger (for admin/ops)
router.post('/sync/process', async (req, res) => {
    try {
        const limit = Math.max(1, Math.min(100, Number(req.body?.limit || 25)));
        const result = await processLeadSyncOutbox({ limit });
        res.json(result);
    } catch (error) {
        console.error('Outbox process error:', error);
        res.status(500).json({ error: error.message });
    }
});

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

        const leads = await PoolLead.find({ _id: { $in: leadIds }, isDeleted: false });

        const result = await PoolLead.updateMany(
            { _id: { $in: leadIds }, isDeleted: false },
            {
                $set: {
                    assignedTo: userId,
                    assignedBy: req.user._id,
                    assignedAt: new Date(),
                    updatedAt: new Date(),
                },
            }
        );

        for (const lead of leads) {
            const previousOwnerId = lead.assignedTo || null;
            await PoolAssignment.create({
                leadId: lead._id,
                fromUser: previousOwnerId,
                toUser: userId,
                assignedBy: req.user._id,
                sourceSystem: 'pool',
            });

            await logLeadsPoolAction('TRANSFER', lead, req, {
                from: previousOwnerId?.toString?.() || 'Unassigned',
                to: targetUser.name,
                bulkAssign: true,
            });

            lead.assignedTo = userId;
            lead.assignedBy = req.user._id;
            lead.assignedAt = new Date();
            await enqueuePoolSync({
                eventType: 'lead.transferred',
                lead,
                payload: {
                    from: previousOwnerId?.toString?.() || null,
                    to: targetUser.name,
                    assignedTo: userId,
                    assignedBy: req.user._id,
                    assignedAt: lead.assignedAt,
                },
                actor: req.user,
            });
        }

        const notification = await Notification.create({
            recipient: userId,
            type: 'lead_assignment',
            title: 'New Leads Assigned',
            message: `${req.user.name} assigned you ${leadIds.length} lead${leadIds.length !== 1 ? 's' : ''}`,
            link: '/sales/leads-pool',
            metadata: {
                leadCount: leadIds.length,
                assignedBy: req.user.name,
            },
        });

        if (req.io) {
            sendNotificationToUser(req.io, userId.toString(), {
                ...notification.toObject(),
                timeAgo: 'Just now',
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

                const lead = new PoolLead({
                    ...leadData,
                    status: leadData.status || 'Hot',
                    dateAdded: leadData.dateAdded || getISTDateTime(),
                    addedBy: req.user?.name || 'Excel Import',
                    addedById: req.user?._id || null,
                    source: leadData.source || 'Excel Import',
                });

                await lead.save();
                await logLeadsPoolAction('CREATE', lead, req, {
                    import: true,
                });

                await enqueuePoolSync({
                    eventType: 'lead.created',
                    lead,
                    payload: { import: true },
                    actor: req.user,
                });

                results.created.push(lead);
                results.success++;
            } catch (err) {
                results.errors.push({ index: i, error: err.message });
                results.failed++;
            }
        }

        res.status(201).json({
            message: `Imported ${results.success} of ${leads.length} leads`,
            success: results.success,
            failed: results.failed,
            results: {
                created: results.created,
                failed: results.errors,
            },
        });
    } catch (error) {
        console.error('Bulk create error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all leads
router.get('/', async (req, res) => {
    try {
        const leads = await PoolLead.find({ isDeleted: false }).sort({ dateAdded: -1, createdAt: -1 });
        res.json(leads);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a lead
router.post('/', async (req, res) => {
    try {
        const {
            leadName, phone, email, destination, duration, travelDate, budget,
            paxCount, adults, children, status, nextFollowUp, remarks, dateAdded, source,
        } = req.body;

        if (!phone || !status) {
            return res.status(400).json({ error: 'Phone and Status are required' });
        }

        const lead = new PoolLead({
            leadName,
            phone,
            email: email || '',
            destination,
            duration,
            travelDate,
            budget,
            paxCount,
            adults,
            children,
            status: status || 'Hot',
            nextFollowUp,
            remarks: remarks || '',
            dateAdded: dateAdded || getISTDateTime(),
            addedBy: req.user?.name || 'Unknown',
            addedById: req.user?._id || null,
            source: source || 'Manual',
        });

        await lead.save();
        await logLeadsPoolAction('CREATE', lead, req, {
            initialStatus: lead.status,
            phone: lead.phone,
        });

        await enqueuePoolSync({
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

// Get single lead
router.get('/:id', async (req, res) => {
    try {
        const lead = await PoolLead.findOne({ _id: req.params.id, isDeleted: false });
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        res.json(lead);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update lead
router.put('/:id', async (req, res) => {
    try {
        const updateData = req.body || {};
        const lead = await PoolLead.findOne({ _id: req.params.id, isDeleted: false });
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        const originalLead = lead.toObject();
        const changes = buildChanges(originalLead, updateData);

        Object.keys(updateData).forEach((key) => {
            if (key !== '_id' && key !== 'uniqueId') {
                lead[key] = updateData[key];
            }
        });
        lead.updatedAt = new Date();
        await lead.save();

        await logLeadsPoolAction('UPDATE', lead, req, { changes });
        await enqueuePoolSync({
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

// Transfer lead
router.post('/:id/transfer', requirePermission('telecaller_transfer', 'view'), async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'Target user ID is required' });

        const lead = await PoolLead.findOne({ _id: req.params.id, isDeleted: false });
        if (!lead) return res.status(404).json({ error: 'Lead not found' });

        const targetUser = await User.findById(userId);
        if (!targetUser) return res.status(404).json({ error: 'Target user not found' });

        if (lead.assignedTo && lead.assignedTo.toString() === userId) {
            return res.status(400).json({ error: 'Lead is already assigned to this user' });
        }

        let previousOwnerName = 'Unassigned';
        const previousOwnerId = lead.assignedTo || null;
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

        await PoolAssignment.create({
            leadId: lead._id,
            fromUser: previousOwnerId,
            toUser: userId,
            assignedBy: req.user._id,
            sourceSystem: 'pool',
        });

        await logLeadsPoolAction('TRANSFER', lead, req, {
            from: previousOwnerName,
            to: targetUser.name,
        });

        await enqueuePoolSync({
            eventType: 'lead.transferred',
            lead,
            payload: {
                from: previousOwnerName,
                to: targetUser.name,
                assignedTo: userId,
                assignedBy: req.user._id,
                assignedAt: lead.assignedAt,
            },
            actor: req.user,
        });

        const notification = await Notification.create({
            recipient: userId,
            type: 'lead_assignment',
            title: 'New Lead Assigned',
            message: `${req.user.name} assigned you a lead: ${lead.leadName || lead.phone}`,
            link: '/sales/leads-pool',
            metadata: {
                leadId: lead._id,
                leadName: lead.leadName,
                phone: lead.phone,
                assignedBy: req.user.name,
                destination: lead.destination,
            },
        });

        if (req.io) {
            sendNotificationToUser(req.io, userId.toString(), {
                ...notification.toObject(),
                timeAgo: 'Just now',
            });
        }

        res.json({ message: 'Lead transferred successfully', lead });
    } catch (error) {
        console.error('Transfer error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete lead (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const lead = await PoolLead.findOne({ _id: req.params.id, isDeleted: false });
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        lead.isDeleted = true;
        lead.deletedAt = new Date();
        lead.deletedBy = req.user?._id || null;
        await lead.save();

        await logLeadsPoolAction('DELETE', lead, req, {});
        await enqueuePoolSync({
            eventType: 'lead.deleted',
            lead,
            payload: {},
            actor: req.user,
        });

        res.json({ message: 'Lead moved to trash successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Restore lead
router.post('/:id/restore', async (req, res) => {
    try {
        const lead = await PoolLead.findById(req.params.id);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        lead.isDeleted = false;
        lead.deletedAt = null;
        lead.deletedBy = null;
        await lead.save();

        await logLeadsPoolAction('RESTORE', lead, req, {});
        await enqueuePoolSync({
            eventType: 'lead.restored',
            lead,
            actor: req.user,
        });

        res.json({ message: 'Lead restored successfully', lead });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add comment
router.post('/:id/comments', async (req, res) => {
    try {
        const { text, mentions } = req.body;
        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'Comment text is required' });
        }

        const lead = await PoolLead.findOne({ _id: req.params.id, isDeleted: false });
        if (!lead) return res.status(404).json({ error: 'Lead not found' });

        const comment = await PoolLeadComment.create({
            leadId: lead._id,
            text: text.trim(),
            userId: req.user._id,
            userName: req.user.name,
            mentions: Array.isArray(mentions) ? mentions : [],
            externalCommentId: `pool:${lead._id}:${Date.now()}`,
            sourceSystem: 'pool',
        });

        await logLeadsPoolAction('COMMENT', lead, req, {
            commentId: comment._id,
            preview: comment.text.substring(0, 100),
        });

        await enqueuePoolSync({
            eventType: 'lead.commented',
            lead,
            payload: {
                comment: {
                    commentId: comment._id.toString(),
                    externalCommentId: comment.externalCommentId,
                    text: comment.text,
                    userId: comment.userId,
                    userName: comment.userName,
                    mentions: comment.mentions || [],
                    createdAt: comment.createdAt,
                },
            },
            actor: req.user,
        });

        const mentionIds = Array.isArray(mentions) ? mentions : [];
        if (mentionIds.length > 0) {
            for (const mentionedUserId of mentionIds) {
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
                        },
                    });

                    if (req.io) {
                        sendNotificationToUser(req.io, mentionedUserId, {
                            ...notification.toObject(),
                            timeAgo: 'Just now',
                        });
                    }
                }
            }
        }

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
                },
            });

            if (req.io) {
                sendNotificationToUser(req.io, lead.assignedTo.toString(), {
                    ...notification.toObject(),
                    timeAgo: 'Just now',
                });
            }
        }

        res.status(201).json(comment);
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get comments
router.get('/:id/comments', async (req, res) => {
    try {
        const lead = await PoolLead.findOne({ _id: req.params.id, isDeleted: false }, '_id');
        if (!lead) return res.status(404).json({ error: 'Lead not found' });

        const comments = await PoolLeadComment.find({ leadId: lead._id }).sort({ createdAt: 1 });
        res.json(comments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get activity
router.get('/:id/activity', async (req, res) => {
    try {
        const PoolLeadActivity = (await import('../models/PoolLeadActivity.js')).default;
        const logs = await PoolLeadActivity.find({ leadId: req.params.id })
            .sort({ timestamp: -1 })
            .limit(100);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
