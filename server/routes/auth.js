import express from 'express';
import User from '../models/User.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';
import { resolveUserPermissions } from '../middleware/rbac.js';
import { createAuthLog } from '../utils/logger.js';

const router = express.Router();

// POST /api/auth/login - Authenticate user and return JWT token
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated. Contact administrator.' });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = generateToken(user._id);

    // Resolve permissions for frontend (roleId or legacy role)
    const userObj = user.toObject ? user.toObject() : user;
    const permissions = await resolveUserPermissions(userObj);

    // Set cookie (httpOnly for security)
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    // Log login event (attach user to req for logging)
    req.user = user.toObject ? user.toObject() : user;
    await createAuthLog('user_login', req);

    // Return user data, permissions, and token
    res.json({
      message: 'Login successful',
      token,
      user: user.toJSON(),
      permissions,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// POST /api/auth/logout - Clear session
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Log logout event before clearing session
    await createAuthLog('user_logout', req);
    
    res.clearCookie('token');
    res.json({ message: 'Logout successful' });
  } catch (error) {
    // Even if logging fails, still clear the cookie
    console.error('Logout logging error:', error);
    res.clearCookie('token');
    res.json({ message: 'Logout successful' });
  }
});

// GET /api/auth/me - Get current authenticated user (includes permissions from authenticateToken)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { permissions, ...user } = req.user;
    res.json({ user, permissions: permissions || {} });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user information' });
  }
});

// POST /api/auth/change-password - Change user's password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Find user with password field
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// PUT /api/auth/theme - Update user's theme preference
router.put('/theme', authenticateToken, async (req, res) => {
  try {
    const { themePreference } = req.body;

    // Validate input
    if (!themePreference || !['light', 'dark', 'system'].includes(themePreference)) {
      return res.status(400).json({ error: 'Valid theme preference (light, dark, or system) is required' });
    }

    // Find user
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update theme preference
    user.themePreference = themePreference;
    await user.save();

    res.json({ 
      message: 'Theme preference updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Update theme preference error:', error);
    res.status(500).json({ error: 'Failed to update theme preference' });
  }
});

export default router;

