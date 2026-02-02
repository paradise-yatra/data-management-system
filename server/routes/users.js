import express from 'express';
import User from '../models/User.js';
import Role from '../models/Role.js';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { createLog } from '../utils/logger.js';

const router = express.Router();

router.use(authenticateToken);

// GET /api/users - List all users (manage_users view)
router.get('/', requirePermission('manage_users', 'view'), async (req, res) => {
  try {
    const users = await User.find()
      .populate('departmentId', 'name')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:id - Get a single user (manage_users view)
router.get('/:id', requirePermission('manage_users', 'view'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('departmentId', 'name');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/users - Create a new user (manage_users full)
router.post('/', requirePermission('manage_users', 'full'), async (req, res) => {
  try {
    const { email, password, name, role, roleId, departmentId } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Resolve roleId and legacy role
    let resolvedRoleId = roleId || null;
    let legacyRole = role && ['admin', 'manager', 'user'].includes(role) ? role : 'user';
    if (roleId) {
      const roleDoc = await Role.findById(roleId);
      if (roleDoc) {
        const nameToLegacy = { Admin: 'admin', Manager: 'manager', User: 'user' };
        legacyRole = nameToLegacy[roleDoc.name] ?? legacyRole;
      }
    }

    const user = new User({
      email: email.toLowerCase(),
      password,
      name: name.trim(),
      role: legacyRole,
      roleId: resolvedRoleId,
      departmentId: departmentId || null,
    });

    await user.save();

    await createLog('create_user', req, {
      email: user.email,
      name: user.name,
      role: user.role,
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/users/:id - Update a user (manage_users full)
router.put('/:id', requirePermission('manage_users', 'full'), async (req, res) => {
  try {
    const { email, name, role, roleId, isActive, password, departmentId } = req.body;
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const originalIsActive = user.isActive;
    const originalEmail = user.email;

    if (req.user._id.toString() === userId && isActive === false) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }

    if (email && email.toLowerCase() !== user.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }
      user.email = email.toLowerCase();
    }

    const passwordChanged = password && password.length >= 6;

    if (name) user.name = name.trim();
    if (role && ['admin', 'manager', 'user'].includes(role)) user.role = role;
    if (typeof roleId !== 'undefined') {
      user.roleId = roleId || null;
      if (roleId) {
        const roleDoc = await Role.findById(roleId);
        if (roleDoc) {
          const nameToLegacy = { Admin: 'admin', Manager: 'manager', User: 'user' };
          user.role = nameToLegacy[roleDoc.name] ?? user.role;
        }
      }
    }
    if (typeof isActive === 'boolean') user.isActive = isActive;
    if (passwordChanged) user.password = password;
    if (typeof departmentId !== 'undefined') user.departmentId = departmentId || null;

    await user.save();

    // Log activation/deactivation
    if (typeof isActive === 'boolean' && isActive !== originalIsActive) {
      if (isActive) {
        await createLog('activate_user', req, {
          email: user.email,
          name: user.name,
        });
      } else {
        await createLog('deactivate_user', req, {
          email: user.email,
          name: user.name,
        });
      }
    }

    // Log password change
    if (passwordChanged) {
      await createLog('change_user_password', req, {
        email: user.email,
        name: user.name,
      });
    }

    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id - Delete a user (manage_users full)
router.delete('/:id', requirePermission('manage_users', 'full'), async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent admin from deleting themselves
    if (req.user._id.toString() === userId) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log the action
    await createLog('delete_user', req, {
      email: user.email,
      name: user.name,
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// PUT /api/users/:id/role - Change user role (manage_users full); accepts role or roleId
router.put('/:id/role', requirePermission('manage_users', 'full'), async (req, res) => {
  try {
    const { role, roleId } = req.body;
    const userId = req.params.id;

    if (req.user._id.toString() === userId) {
      return res.status(400).json({ error: 'You cannot change your own role' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (roleId) {
      const roleDoc = await Role.findById(roleId);
      if (!roleDoc) {
        return res.status(400).json({ error: 'Invalid role ID' });
      }
      user.roleId = roleId;
      const nameToLegacy = { Admin: 'admin', Manager: 'manager', User: 'user' };
      user.role = nameToLegacy[roleDoc.name] ?? user.role;
    } else if (role && ['admin', 'manager', 'user'].includes(role)) {
      user.role = role;
      const legacyToName = { admin: 'Admin', manager: 'Manager', user: 'User' };
      const roleDoc = await Role.findOne({ name: legacyToName[role] });
      user.roleId = roleDoc ? roleDoc._id : null;
    } else {
      return res.status(400).json({ error: 'Invalid role. Provide role (admin/manager/user) or roleId' });
    }

    await user.save();
    res.json(user);
  } catch (error) {
    console.error('Change role error:', error);
    res.status(500).json({ error: 'Failed to change user role' });
  }
});

export default router;

