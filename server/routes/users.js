import express from 'express';
import User from '../models/User.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { createLog } from '../utils/logger.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

// GET /api/users - List all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:id - Get a single user
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/users - Create a new user
router.post('/', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

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

    // Validate role
    const validRoles = ['admin', 'manager', 'user'];
    const userRole = role && validRoles.includes(role) ? role : 'user';

    // Create new user
    const user = new User({
      email: email.toLowerCase(),
      password,
      name: name.trim(),
      role: userRole,
    });

    await user.save();
    
    // Log the action
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

// PUT /api/users/:id - Update a user
router.put('/:id', async (req, res) => {
  try {
    const { email, name, role, isActive, password } = req.body;
    const userId = req.params.id;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Store original values for logging
    const originalIsActive = user.isActive;
    const originalEmail = user.email;

    // Prevent admin from deactivating themselves
    if (req.user._id.toString() === userId && isActive === false) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }

    // Check if email is being changed and if it's already in use
    if (email && email.toLowerCase() !== user.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }
      user.email = email.toLowerCase();
    }

    // Track if password is being changed
    const passwordChanged = password && password.length >= 6;

    // Update fields
    if (name) user.name = name.trim();
    if (role && ['admin', 'manager', 'user'].includes(role)) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    if (passwordChanged) user.password = password;

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

// DELETE /api/users/:id - Delete a user
router.delete('/:id', async (req, res) => {
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

// PUT /api/users/:id/role - Change user role
router.put('/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;

    // Validate role
    const validRoles = ['admin', 'manager', 'user'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, manager, or user' });
    }

    // Prevent admin from changing their own role
    if (req.user._id.toString() === userId) {
      return res.status(400).json({ error: 'You cannot change your own role' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Change role error:', error);
    res.status(500).json({ error: 'Failed to change user role' });
  }
});

export default router;

