import mongoose from 'mongoose';

// Get current date and time in Indian Standard Time (IST)
const getISTDate = () => {
  const now = new Date();
  // IST is UTC+5:30
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() + istOffset);
};

const logSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'add_identity',
      'delete_identity',
      'restore_identity',
      'delete_from_trash',
      'empty_trash',
      'edit_identity',
      'add_source',
      'delete_source',
      'create_user',
      'activate_user',
      'deactivate_user',
      'change_user_password',
      'delete_user',
      'user_login',
      'user_logout',
      'add_telecaller_destination',
      'update_telecaller_destination',
      'delete_telecaller_destination',
    ],
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  deviceType: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet', 'unknown'],
    default: null,
  },
  ipAddress: {
    type: String,
    default: null,
  },
  userAgent: {
    type: String,
    default: null,
  },
  timestamp: {
    type: Date,
    default: getISTDate,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for performance
logSchema.index({ timestamp: -1 });
logSchema.index({ userId: 1 });
logSchema.index({ action: 1 });
logSchema.index({ deviceType: 1 });

// Method to format the log entry for display
logSchema.methods.getFormattedDetails = function () {
  const { action, details } = this;

  switch (action) {
    case 'add_identity':
      return `Added identity ${details.uniqueId || 'Unknown'}${details.name ? ` (${details.name})` : ''}`;
    case 'edit_identity':
      return `Edited identity ${details.uniqueId || 'Unknown'}${details.changedFields ? ` (Changed: ${details.changedFields.join(', ')})` : ''}`;
    case 'delete_identity':
      return `Deleted identity ${details.uniqueId || 'Unknown'}${details.name ? ` (${details.name})` : ''}`;
    case 'restore_identity':
      return `Restored identity ${details.uniqueId || 'Unknown'} from trash`;
    case 'delete_from_trash':
      return `Permanently deleted ${details.uniqueId || 'Unknown'} from trash`;
    case 'empty_trash':
      return `Emptied trash (${details.count || 0} records deleted)`;
    case 'add_source':
      return `Added source: ${details.sourceName || 'Unknown'}`;
    case 'delete_source':
      return `Deleted source: ${details.sourceName || 'Unknown'}`;
    case 'create_user':
      return `Created user: ${details.email || 'Unknown'}${details.name ? ` (${details.name})` : ''}`;
    case 'activate_user':
      return `Activated user: ${details.email || 'Unknown'}`;
    case 'deactivate_user':
      return `Deactivated user: ${details.email || 'Unknown'}`;
    case 'change_user_password':
      return `Changed password for: ${details.email || 'Unknown'}`;
    case 'delete_user':
      return `Deleted user: ${details.email || 'Unknown'}${details.name ? ` (${details.name})` : ''}`;
    case 'user_login':
      return `Logged in from ${details.deviceType || 'unknown device'}`;
    case 'user_logout':
      return `Logged out from ${details.deviceType || 'unknown device'}`;
    case 'add_telecaller_destination':
      return `Added telecaller destination: ${details.name || 'Unknown'}`;
    case 'update_telecaller_destination':
      return `Updated telecaller destination from "${details.oldName}" to "${details.newName}"`;
    case 'delete_telecaller_destination':
      return `Deleted telecaller destination: ${details.name || 'Unknown'}`;
    default:
      return JSON.stringify(details);
  }
};

const Log = mongoose.model('Log', logSchema, 'logs');

export default Log;

