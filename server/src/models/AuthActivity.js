import mongoose from 'mongoose';

/**
 * AuthActivity Schema
 * 
 * Persists server-confirmed authentication and authorization events in MongoDB.
 * Event types:
 * - SIGNUP: User registered a new account
 * - LOGIN: Successful login via password authentication
 * - LOGOUT: Explicit user sign-out action
 * - SESSION_EXPIRED: Token expired or session invalidated
 * - ROLE_CHANGED: Admin promoted or demoted an account role
 * - PROFILE_UPDATED: User profile settings updated
 * 
 * Sensitive Data Policy:
 * NEVER store passwords, password hashes, plaintext tokens, or private secrets in this collection.
 */
const authActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.Mixed, // Supports ObjectId or fallback string ID
      ref: 'User',
      required: false,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    userName: {
      type: String,
      default: 'User',
      trim: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: ['SIGNUP', 'LOGIN', 'LOGOUT', 'SESSION_EXPIRED', 'ROLE_CHANGED', 'PROFILE_UPDATED'],
      index: true,
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED'],
      default: 'SUCCESS',
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
    userAgent: {
      type: String,
      default: 'DayLedger Client',
    },
    details: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimal querying and timeline rendering
authActivitySchema.index({ timestamp: -1 });
authActivitySchema.index({ eventType: 1, timestamp: -1 });
authActivitySchema.index({ userEmail: 1, timestamp: -1 });
authActivitySchema.index({ userId: 1, timestamp: -1 });

export const AuthActivityModel = mongoose.model('AuthActivity', authActivitySchema);
