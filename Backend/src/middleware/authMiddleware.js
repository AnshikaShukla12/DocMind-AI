import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { demoFindById } from '../demo/demoStore.js';

const IS_DEMO = () => process.env.DEMO_MODE === 'true';

// Protect routes
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'demo-local-secret-not-for-production');

    // ── DEMO MODE ────────────────────────────────────────────────────────────
    if (IS_DEMO()) {
      const user = demoFindById(decoded.id);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
      }
      req.user = user;
      return next();
    }
    // ── NORMAL MODE ──────────────────────────────────────────────────────────

    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
  }
};

// Grant access to specific roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };
};
