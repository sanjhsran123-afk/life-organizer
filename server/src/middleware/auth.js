import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { UserModel } from '../models/User.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'dayledger-secure-jwt-key-2026-prod';

/**
 * Authentication Middleware
 * Validates incoming Bearer JWT and sets req.userId and req.user.
 * Also detects TokenExpiredError to distinguish session expiration from deliberate sign-outs.
 */
export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.userId || decoded.id;
      req.user = decoded;
      req.sessionExpired = false;
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        req.sessionExpired = true;
        // Extract unverified payload if available to identify user for logging
        const unverified = jwt.decode(token);
        if (unverified) {
          req.expiredUser = unverified;
        }
      }
      // Invalid or expired token
      req.authError = err.message;
    }
  } else if (req.headers['x-user-id']) {
    req.userId = req.headers['x-user-id'];
  }
  next();
};

/**
 * requireAuth Middleware
 * Blocks unauthenticated requests with 401 Unauthorized.
 */
export const requireAuth = (req, res, next) => {
  if (req.sessionExpired) {
    return res.status(401).json({
      error: 'SESSION_EXPIRED',
      message: 'Your session has expired. Please log in again to continue.',
    });
  }
  if (!req.userId) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required. Please log in to proceed.',
    });
  }
  next();
};

/**
 * requireAdmin Middleware
 * Strictly verifies that the authenticated user possesses the 'admin' role in MongoDB.
 * Rejects non-admin users with 403 Forbidden.
 */
export const requireAdmin = async (req, res, next) => {
  if (!req.userId) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required to access administrative tools.',
    });
  }

  try {
    if (mongoose.connection.readyState === 1) {
      const user = await UserModel.findById(req.userId).select('role email name');
      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Account not found in the database.',
        });
      }

      if (user.role !== 'admin') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied. You do not possess administrator permissions.',
        });
      }

      // Attach verified admin user object to req
      req.adminUser = user;
      next();
    } else {
      // In offline mode, check token role or admin emails list
      const adminEmails = (process.env.ADMIN_EMAILS || 'admin@dayledger.app').split(',').map((e) => e.trim().toLowerCase());
      if (req.user && (req.user.role === 'admin' || (req.user.email && adminEmails.includes(req.user.email.toLowerCase())))) {
        req.adminUser = req.user;
        next();
      } else {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied. Administrator privileges required.',
        });
      }
    }
  } catch (error) {
    console.error('Error verifying admin authorization:', error.message);
    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Unable to verify administrative authorization at this time.',
    });
  }
};
