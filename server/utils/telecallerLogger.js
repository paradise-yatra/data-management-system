import TelecallerLog from '../models/TelecallerLog.js';

/**
 * Logs a telecaller action to the database.
 * @param {string} action - The action type (CREATE, UPDATE, DELETE).
 * @param {object} lead - The lead object involved in the action.
 * @param {object} req - The express request object (to extract user info).
 * @param {object} details - Additional details about the action (e.g., changed fields).
 */
export const logTelecallerAction = async (action, lead, req, details = {}) => {
    try {
        const user = req.user || { _id: null, name: 'System', role: 'System' };

        // Always store Mongo _id so /:id/activity can query reliably.
        const entityId = lead._id?.toString() || lead.uniqueId || 'UNKNOWN_ID';
        const entityName = lead.leadName || 'Unknown Lead';

        const logEntry = new TelecallerLog({
            action,
            entityId,
            entityName,
            performedBy: {
                userId: user._id,
                name: user.name,
                role: user.role
            },
            details: {
                ...details,
                entityUniqueId: lead.uniqueId || null,
            }
        });

        await logEntry.save();
    } catch (error) {
        console.error('Failed to create telecaller log:', error);
        // We don't throw here to avoid failing the main request just because logging failed
    }
};
