/**
 * Admin authentication middleware
 */

const crypto = require('crypto');

// Session store for admin tokens
const adminSessions = new Map();
const SESSION_EXPIRY = 60 * 60 * 1000; // 1 hour

// Admin credentials from environment variables
const getAdminCredentials = () => ({
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'admin123'
});

/**
 * Generate a secure session token
 */
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Validate admin credentials
 */
const validateCredentials = (username, password) => {
  const credentials = getAdminCredentials();
  return username === credentials.username && password === credentials.password;
};

/**
 * Create a new admin session
 */
const createSession = (username) => {
  const token = generateToken();
  const session = {
    username,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_EXPIRY
  };
  adminSessions.set(token, session);
  return token;
};

/**
 * Validate session token
 */
const validateSession = (token) => {
  const session = adminSessions.get(token);
  if (!session) return false;

  if (Date.now() > session.expiresAt) {
    adminSessions.delete(token);
    return false;
  }

  return true;
};

/**
 * Destroy session
 */
const destroySession = (token) => {
  adminSessions.delete(token);
};

/**
 * Middleware to check if user is authenticated
 */
const requireAuth = (req, res, next) => {
  const token = req.cookies?.adminToken || req.headers['x-admin-token'];

  if (!token || !validateSession(token)) {
    return res.status(401).json({ error: 'Unauthorized', redirect: '/admin/login' });
  }

  next();
};

/**
 * Clean up expired sessions periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of adminSessions.entries()) {
    if (now > session.expiresAt) {
      adminSessions.delete(token);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

module.exports = {
  validateCredentials,
  createSession,
  validateSession,
  destroySession,
  requireAuth
};
