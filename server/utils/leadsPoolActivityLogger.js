import PoolLeadActivity from '../models/PoolLeadActivity.js';

/**
 * Logs a leads-pool action to the leads-pool activity collection.
 * This logger is intentionally non-blocking for business operations.
 */
export const logLeadsPoolAction = async (action, lead, reqOrActor, details = {}) => {
    try {
        const actor = reqOrActor?.user
            ? reqOrActor.user
            : (reqOrActor || { _id: null, name: 'System', role: 'System' });

        const leadId = lead?._id?.toString?.() || lead?.id || details?.leadId || null;
        if (!leadId) return;

        await PoolLeadActivity.create({
            leadId,
            action,
            entityId: leadId,
            entityName: lead?.leadName || details?.leadName || 'Unknown Lead',
            performedBy: {
                userId: actor._id || actor.userId || null,
                name: actor.name || 'System',
                role: actor.role || 'System',
            },
            details,
        });
    } catch (error) {
        console.error('Failed to create leads-pool activity log:', error);
    }
};

