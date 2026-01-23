import express from 'express';
import Log from '../models/Log.js';
import User from '../models/User.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

// GET /api/logs - Get all logs with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      userId,
      startDate,
      endDate,
      search,
    } = req.query;

    // Build filter query
    const filter = {};

    // Filter by action type
    if (action) {
      filter.action = action;
    }

    // Filter by user
    if (userId) {
      filter.userId = userId;
    }

    // Filter by date range
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.timestamp.$lte = new Date(endDate);
      }
    }

    // Search in details (basic text search)
    if (search) {
      filter.$or = [
        { userName: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } },
        { 'details.uniqueId': { $regex: search, $options: 'i' } },
        { 'details.name': { $regex: search, $options: 'i' } },
        { 'details.email': { $regex: search, $options: 'i' } },
        { 'details.sourceName': { $regex: search, $options: 'i' } },
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Get logs with pagination
    const [logs, total] = await Promise.all([
      Log.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Log.countDocuments(filter),
    ]);

    // Format logs with readable details
    const formattedLogs = logs.map((log) => {
      const formattedDetails = getFormattedDetails(log.action, log.details);
      return {
        ...log,
        formattedDetails,
      };
    });

    res.json({
      logs: formattedLogs,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// GET /api/logs/users - Get list of users for filtering
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('_id name email').lean();
    res.json(users);
  } catch (error) {
    console.error('Get log users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/logs/actions - Get list of action types
router.get('/actions', async (req, res) => {
  try {
    const actions = [
      { value: 'add_identity', label: 'Added Identity' },
      { value: 'delete_identity', label: 'Deleted Identity' },
      { value: 'restore_identity', label: 'Restored Identity' },
      { value: 'delete_from_trash', label: 'Deleted from Trash' },
      { value: 'empty_trash', label: 'Emptied Trash' },
      { value: 'edit_identity', label: 'Edited Identity' },
      { value: 'add_source', label: 'Added Source' },
      { value: 'delete_source', label: 'Deleted Source' },
      { value: 'create_user', label: 'Created User' },
      { value: 'activate_user', label: 'Activated User' },
      { value: 'deactivate_user', label: 'Deactivated User' },
      { value: 'change_user_password', label: 'Changed Password' },
      { value: 'delete_user', label: 'Deleted User' },
    ];
    res.json(actions);
  } catch (error) {
    console.error('Get actions error:', error);
    res.status(500).json({ error: 'Failed to fetch actions' });
  }
});

// GET /api/logs/stats - Get log statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await Log.aggregate([
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    const totalLogs = await Log.countDocuments();

    res.json({
      totalLogs,
      byAction: stats,
    });
  } catch (error) {
    console.error('Get log stats error:', error);
    res.status(500).json({ error: 'Failed to fetch log statistics' });
  }
});

// Helper function to format log details
function getFormattedDetails(action, details) {
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
}

export default router;

