import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Get JWT secret from environment or use default (in production, always use env variable)
const JWT_SECRET = process.env.JWT_SECRET || 'paradise-yatra-identity-management-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Generate JWT token
export const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Middleware to authenticate JWT token
export const authenticateToken = async (req, res, next) => {
  try {
    // Get token from header, cookie, or query parameter
    let token = null;

    // Check Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Check cookie
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // If no token found
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Find user
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid token. User not found.' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated. Contact administrator.' });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    return res.status(500).json({ error: 'Authentication failed.' });
  }
};

// Middleware to authorize specific roles
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}` 
      });
    }

    next();
  };
};

// Export JWT_SECRET for use in other modules if needed
export { JWT_SECRET, JWT_EXPIRES_IN };

