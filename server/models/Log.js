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
    default:
      return JSON.stringify(details);
  }
};

const Log = mongoose.model('Log', logSchema, 'logs');

export default Log;

