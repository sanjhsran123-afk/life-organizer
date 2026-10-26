import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { UserModel } from '../models/User.js';
import { AuthActivityModel } from '../models/AuthActivity.js';
import { JWT_SECRET } from '../middleware/auth.js';
import { isSmsConfigured, sendVerificationSms } from '../services/smsService.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Rate limiter for phone verification code requests (max 5 requests per 15 min per user/IP)
const phoneSendCodeLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: 'Too many verification code requests. Please wait 15 minutes before requesting again.',
  keyGenerator: (req) => req.userId || req.ip || req.headers['x-forwarded-for'] || 'anonymous',
});

// Rate limiter for phone verification code attempts (max 10 attempts per 15 min per user/IP)
const phoneVerifyCodeLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many verification code attempts. Please wait 15 minutes before trying again.',
  keyGenerator: (req) => req.userId || req.ip || req.headers['x-forwarded-for'] || 'anonymous',
});

// Helper to check if an email matches configured ADMIN_EMAILS in .env
export const isConfiguredAdminEmail = (email) => {
  if (!email) return false;
  const configured = (process.env.ADMIN_EMAILS || 'admin@dayledger.app,iksanjh@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return configured.includes(email.toLowerCase().trim());
};

// Server in-memory Auth Logs storage (fallback)
export const serverAuthLogs = [];

const recordAuthLog = async (req, type, email, name, details = '', userId = null) => {
  const ipAddress = req?.ip || req?.headers?.['x-forwarded-for'] || '127.0.0.1';
  const userAgent = req?.headers?.['user-agent'] || 'Web Client';

  // Always keep in-memory buffer
  const entry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type,
    email: email || 'unknown',
    name: name || 'User',
    timestamp: new Date().toISOString(),
    details,
  };
  serverAuthLogs.unshift(entry);
  if (serverAuthLogs.length > 200) serverAuthLogs.pop();

  // Persist to MongoDB source of truth if connected
  if (mongoose.connection.readyState === 1 && email) {
    try {
      await AuthActivityModel.create({
        userId,
        userEmail: email.toLowerCase().trim(),
        userName: name || 'User',
        eventType: type,
        status: 'SUCCESS',
        ipAddress: typeof ipAddress === 'string' ? ipAddress : '127.0.0.1',
        userAgent: typeof userAgent === 'string' ? userAgent.substring(0, 200) : 'Web Client',
        details,
        timestamp: new Date(),
      });
    } catch (err) {
      console.warn('Could not persist AuthActivity to MongoDB:', err.message);
    }
  }

  return entry;
};

// Helper to normalize phone number
const normalizePhone = (phone) => {
  if (!phone) return '';
  return phone.replace(/[\s\-\(\)\.]/g, '').trim();
};

// Helper to compute age from Date of Birth
const calculateAgeFromDOB = (dobString) => {
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// Helper to generate token with role included
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id ? user._id.toString() : user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'user',
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, age, dateOfBirth, password, confirmPassword } = req.body;

    // 1. Full name validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Full name is required (minimum 2 characters).' });
    }

    // 2. Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }
    const normalizedEmail = email.toLowerCase().trim();

    // 3. Phone number validation & normalization
    const normalizedPhone = normalizePhone(phone);
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!normalizedPhone || !phoneRegex.test(normalizedPhone)) {
      return res.status(400).json({ error: 'A valid phone number is required (10 to 15 digits, e.g. +919876543210).' });
    }

    // 4. Date of birth validation
    if (!dateOfBirth) {
      return res.status(400).json({ error: 'Date of birth is required (YYYY-MM-DD).' });
    }
    const birthDate = new Date(dateOfBirth);
    if (isNaN(birthDate.getTime())) {
      return res.status(400).json({ error: 'Invalid Date of Birth format. Please provide YYYY-MM-DD.' });
    }
    const today = new Date();
    if (birthDate > today) {
      return res.status(400).json({ error: 'Date of birth cannot be in the future.' });
    }

    // 5. Age validation & consistency check with DOB
    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 1 || parsedAge > 130) {
      return res.status(400).json({ error: 'Age must be a valid number between 1 and 130.' });
    }

    const expectedAge = calculateAgeFromDOB(dateOfBirth);
    if (expectedAge !== null && Math.abs(expectedAge - parsedAge) > 1) {
      return res.status(400).json({
        error: `Entered age (${parsedAge}) is inconsistent with Date of Birth (${dateOfBirth}). Expected age is ${expectedAge}.`,
      });
    }

    // 6. Password & Confirm Password validation
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match. Please re-enter identical passwords.' });
    }

    // 7. Determine initial role based on configured ADMIN_EMAILS in .env
    const initialRole = isConfiguredAdminEmail(normalizedEmail) ? 'admin' : 'user';

    // 8. Check for duplicate account by Email or Phone
    if (mongoose.connection.readyState === 1) {
      const existingUser = await UserModel.findOne({
        $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
      });

      if (existingUser) {
        if (existingUser.email === normalizedEmail) {
          return res.status(400).json({ error: 'An account with this email address already exists.' });
        }
        if (existingUser.phone === normalizedPhone) {
          return res.status(400).json({ error: 'An account with this phone number already exists.' });
        }
      }

      // Hash password securely with bcrypt
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new UserModel({
        name: name.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        age: parsedAge,
        dateOfBirth: dateOfBirth.split('T')[0],
        password: hashedPassword,
        role: initialRole,
        currency: '₹',
        currencyCode: 'INR',
        avatarSeed: name.trim(),
      });

      await newUser.save();

      const token = generateToken(newUser);
      await recordAuthLog(
        req,
        'SIGNUP',
        newUser.email,
        newUser.name,
        `New account registered via MongoDB (Phone: ${newUser.phone}, Age: ${newUser.age}, Role: ${newUser.role})`,
        newUser._id
      );

      return res.status(201).json({
        message: 'Account created successfully in MongoDB',
        token,
        user: {
          id: newUser._id.toString(),
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          age: newUser.age,
          dateOfBirth: newUser.dateOfBirth,
          currentAge: newUser.currentAge,
          role: newUser.role,
          currency: newUser.currency,
          currencyCode: newUser.currencyCode,
          isPhoneVerified: Boolean(newUser.isPhoneVerified),
          phoneDiscoverable: Boolean(newUser.phoneDiscoverable),
        },
      });
    } else {
      return res.status(503).json({
        error: 'Database service is currently unavailable. Please try again in a few moments.',
      });
    }
  } catch (err) {
    console.error('Registration error:', err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'credential';
      return res.status(400).json({ error: `An account with this ${field} already exists.` });
    }
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email (or phone) and password are required.' });
    }

    const inputIdentifier = email.trim();
    const normalizedEmail = inputIdentifier.toLowerCase();
    const normalizedPhone = normalizePhone(inputIdentifier);

    if (mongoose.connection.readyState === 1) {
      // Find user by either email OR phone
      const user = await UserModel.findOne({
        $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials. Please verify your email/phone and password.' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials. Please verify your email/phone and password.' });
      }

      // Automatically elevate role if configured in ADMIN_EMAILS in .env
      if (isConfiguredAdminEmail(user.email) && user.role !== 'admin') {
        user.role = 'admin';
        await user.save();
      }

      const token = generateToken(user);
      await recordAuthLog(
        req,
        'LOGIN',
        user.email,
        user.name,
        `Signed in via MongoDB as ${user.role}`,
        user._id
      );

      return res.json({
        message: 'Login successful',
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone,
          age: user.age,
          dateOfBirth: user.dateOfBirth,
          currentAge: user.currentAge,
          role: user.role || 'user',
          currency: user.currency,
          currencyCode: user.currencyCode,
          isPhoneVerified: Boolean(user.isPhoneVerified),
          phoneDiscoverable: Boolean(user.phoneDiscoverable),
        },
      });
    } else {
      return res.status(503).json({
        error: 'Database service is currently unavailable. Please try again in a few moments.',
      });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// POST /api/auth/logout - Records explicit user logout
router.post('/logout', async (req, res) => {
  const { email, name, userId } = req.body || {};
  const activeUserId = req.userId || userId;
  const userEmail = email || req.user?.email || 'authenticated_user';
  const userName = name || req.user?.name || 'User';

  const log = await recordAuthLog(
    req,
    'LOGOUT',
    userEmail,
    userName,
    'User explicitly signed out of DayLedger',
    activeUserId
  );

  return res.json({
    message: 'Logged out successfully',
    log,
  });
});

// POST /api/auth/session-expired - Distinctly records session expiration
router.post('/session-expired', async (req, res) => {
  const { email, name, userId } = req.body || {};
  const activeUserId = req.userId || req.expiredUser?.userId || userId;
  const userEmail = email || req.expiredUser?.email || 'expired_session';
  const userName = name || req.expiredUser?.name || 'User';

  const log = await recordAuthLog(
    req,
    'SESSION_EXPIRED',
    userEmail,
    userName,
    'Client session token expired or invalidated by server',
    activeUserId
  );

  return res.json({
    message: 'Session expiration event recorded',
    log,
  });
});

// GET /api/auth/logs
router.get('/logs', (req, res) => {
  return res.json({ logs: serverAuthLogs });
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (mongoose.connection.readyState === 1) {
      const user = await UserModel.findById(decoded.userId).select('-password');
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if user's role should be synced with ADMIN_EMAILS
      if (isConfiguredAdminEmail(user.email) && user.role !== 'admin') {
        user.role = 'admin';
        await user.save();
      }

      return res.json({
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone,
          age: user.age,
          dateOfBirth: user.dateOfBirth,
          currentAge: user.currentAge,
          role: user.role || 'user',
          currency: user.currency,
          currencyCode: user.currencyCode,
          isPhoneVerified: Boolean(user.isPhoneVerified),
          phoneDiscoverable: Boolean(user.phoneDiscoverable),
        },
      });
    } else {
      return res.status(503).json({
        error: 'Database service is currently unavailable. Please try again in a few moments.',
      });
    }
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired session token' });
  }
});

// ==================== PHONE VERIFICATION & DISCOVERABILITY ====================

// POST /api/auth/phone/send-code - Send 6-digit verification code via configured SMS provider
router.post('/phone/send-code', phoneSendCodeLimiter, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await UserModel.findById(decoded.userId || decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.phone) {
      return res.status(400).json({ error: 'No phone number registered on this account.' });
    }

    // 1. Check if SMS provider is configured. If not, verification is strictly unavailable.
    if (!isSmsConfigured()) {
      return res.status(503).json({
        error: 'SMS service is not configured on this server. Phone verification is currently unavailable.',
        code: 'SMS_NOT_CONFIGURED',
      });
    }

    const now = Date.now();

    // 2. Resend Cooldown limit (minimum 60 seconds between OTP dispatches)
    if (user.phoneVerificationLastSent) {
      const elapsed = (now - new Date(user.phoneVerificationLastSent).getTime()) / 1000;
      if (elapsed < 60) {
        const waitSeconds = Math.ceil(60 - elapsed);
        return res.status(429).json({
          error: `Please wait ${waitSeconds} seconds before requesting a new verification code.`,
          retryAfter: waitSeconds,
        });
      }
    }

    // 3. Hourly resend limit (max 5 requests per hour)
    if (!user.phoneVerificationHourlyReset || new Date(user.phoneVerificationHourlyReset).getTime() < now) {
      user.phoneVerificationHourlyCount = 0;
      user.phoneVerificationHourlyReset = new Date(now + 60 * 60 * 1000);
    }
    if ((user.phoneVerificationHourlyCount || 0) >= 5) {
      return res.status(429).json({
        error: 'Hourly verification request limit reached (max 5 requests per hour). Please try again later.',
      });
    }

    // 4. Generate cryptographically secure 6-digit code
    const code = crypto.randomInt(100000, 1000000).toString();

    // 5. Protect stored value: Salt and hash with SHA-256 before saving
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256').update(code + salt + (JWT_SECRET || '')).digest('hex');

    user.phoneVerificationHash = `${salt}:${hash}`;
    user.phoneVerificationExpires = new Date(now + 10 * 60 * 1000); // 10 minutes
    user.phoneVerificationAttempts = 0;
    user.phoneVerificationLastSent = new Date(now);
    user.phoneVerificationHourlyCount = (user.phoneVerificationHourlyCount || 0) + 1;
    await user.save();

    // 6. Deliver via SMS provider. Never log the plaintext OTP.
    try {
      await sendVerificationSms(user.phone, code);
    } catch (smsErr) {
      // Clear pending hash if delivery failed so user is not stuck with unreceived code
      user.phoneVerificationHash = undefined;
      user.phoneVerificationExpires = undefined;
      await user.save();
      return res.status(502).json({
        error: `Failed to deliver verification SMS: ${smsErr.message || 'SMS service error'}. Please try again later.`,
      });
    }

    // 7. Clean response: NO demo code returned, NO OTP logged
    res.json({
      success: true,
      message: 'Verification code sent to your registered phone number.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/phone/verify-code - Verify submitted code with attempt limits
router.post('/phone/verify-code', phoneVerifyCodeLimiter, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Verification code is required.' });
    }

    const user = await UserModel.findById(decoded.userId || decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // 1. Check if an active verification code exists
    if (!user.phoneVerificationHash || !user.phoneVerificationExpires) {
      return res.status(400).json({
        error: 'No active verification code found. Please request a new code.',
      });
    }

    // 2. Check expiration
    if (new Date(user.phoneVerificationExpires).getTime() < Date.now()) {
      user.phoneVerificationHash = undefined;
      user.phoneVerificationExpires = undefined;
      await user.save();
      return res.status(400).json({
        error: 'Verification code has expired. Please request a new code.',
      });
    }

    // 3. Check attempt limit (max 5 failed attempts per code)
    if ((user.phoneVerificationAttempts || 0) >= 5) {
      user.phoneVerificationHash = undefined;
      user.phoneVerificationExpires = undefined;
      await user.save();
      return res.status(429).json({
        error: 'Maximum verification attempts exceeded. Code has been invalidated. Please request a new code.',
      });
    }

    // 4. Verify submitted code using timing-safe hash comparison
    const [salt, storedHash] = user.phoneVerificationHash.split(':');
    const computedHash = crypto
      .createHash('sha256')
      .update(code.trim() + salt + (JWT_SECRET || ''))
      .digest('hex');

    const isMatch =
      storedHash &&
      storedHash.length === computedHash.length &&
      crypto.timingSafeEqual(Buffer.from(storedHash), Buffer.from(computedHash));

    if (!isMatch) {
      user.phoneVerificationAttempts = (user.phoneVerificationAttempts || 0) + 1;
      const remaining = 5 - user.phoneVerificationAttempts;

      if (remaining <= 0) {
        user.phoneVerificationHash = undefined;
        user.phoneVerificationExpires = undefined;
        await user.save();
        return res.status(429).json({
          error: 'Maximum verification attempts exceeded. Code has been invalidated. Please request a new code.',
        });
      }

      await user.save();
      return res.status(400).json({
        error: `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before code is invalidated.`,
      });
    }

    // 5. Code matched: Mark phone verified and clear verification secrets
    user.isPhoneVerified = true;
    user.phoneVerificationHash = undefined;
    user.phoneVerificationExpires = undefined;
    user.phoneVerificationAttempts = 0;
    await user.save();

    res.json({
      success: true,
      message: 'Phone number verified successfully.',
      isPhoneVerified: true,
      phoneDiscoverable: Boolean(user.phoneDiscoverable),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
