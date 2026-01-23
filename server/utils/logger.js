import Log from '../models/Log.js';

/**
 * Create a log entry for user actions
 * @param {string} action - The action type (from Log schema enum)
 * @param {Object} req - Express request object (must have req.user attached)
 * @param {Object} details - Action-specific details to log
 * @returns {Promise<Object|null>} - The created log entry or null if failed
 */
export const createLog = async (action, req, details = {}) => {
  try {
    // Ensure user is attached to request
    if (!req.user) {
      console.warn('createLog: No user attached to request, skipping log');
      return null;
    }

    const log = new Log({
      action,
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      details,
    });

    await log.save();
    return log;
  } catch (error) {
    // Log errors but don't break the main flow
    console.error('Failed to create log entry:', error.message);
    return null;
  }
};

/**
 * Get action label for display
 * @param {string} action - The action type
 * @returns {string} - Human-readable action label
 */
export const getActionLabel = (action) => {
  const labels = {
    add_identity: 'Added Identity',
    delete_identity: 'Deleted Identity',
    restore_identity: 'Restored Identity',
    delete_from_trash: 'Deleted from Trash',
    empty_trash: 'Emptied Trash',
    edit_identity: 'Edited Identity',
    add_source: 'Added Source',
    delete_source: 'Deleted Source',
    create_user: 'Created User',
    activate_user: 'Activated User',
    deactivate_user: 'Deactivated User',
    change_user_password: 'Changed Password',
    delete_user: 'Deleted User',
  };
  return labels[action] || action;
};

/**
 * Get action category for color coding
 * @param {string} action - The action type
 * @returns {string} - Category: 'add', 'delete', 'edit', 'user'
 */
export const getActionCategory = (action) => {
  if (['add_identity', 'add_source', 'restore_identity'].includes(action)) {
    return 'add';
  }
  if (['delete_identity', 'delete_from_trash', 'empty_trash', 'delete_source', 'delete_user'].includes(action)) {
    return 'delete';
  }
  if (['edit_identity'].includes(action)) {
    return 'edit';
  }
  if (['create_user', 'activate_user', 'deactivate_user', 'change_user_password'].includes(action)) {
    return 'user';
  }
  return 'other';
};

export default { createLog, getActionLabel, getActionCategory };

