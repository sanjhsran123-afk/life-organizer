import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { UserModel } from '../models/User.js';
import { AuthActivityModel } from '../models/AuthActivity.js';
import { JWT_SECRET } from '../middleware/auth.js';

const router = express.Router();

// Helper to check if an email matches configured ADMIN_EMAILS in .env
export const isConfiguredAdminEmail = (email) => {
  if (!email) return false;
  const configured = (process.env.ADMIN_EMAILS || 'admin@dayledger.app,iksanjh@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return configured.includes(email.toLowerCase().trim());
};

// Preset test account credentials
const TEST_ACCOUNT = {
  name: 'Test Account',
  email: 'test@dayledger.app',
  phone: '+919876543210',
  age: 24,
  dateOfBirth: '2002-05-15',
  password: 'password123',
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
        },
      });
    } else {
      // Offline fallback
      const dummyId = `user_${Date.now()}`;
      const token = jwt.sign(
        { userId: dummyId, email: normalizedEmail, name: name.trim(), role: initialRole },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      await recordAuthLog(req, 'SIGNUP', normalizedEmail, name.trim(), 'Account created in offline session', dummyId);
      return res.status(201).json({
        message: 'Account created (Offline Mode - local session active)',
        token,
        isOfflineSession: true,
        user: {
          id: dummyId,
          name: name.trim(),
          email: normalizedEmail,
          phone: normalizedPhone,
          age: parsedAge,
          dateOfBirth: dateOfBirth.split('T')[0],
          role: initialRole,
          currency: '₹',
          currencyCode: 'INR',
        },
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

    // Check test credentials
    const isTestCredentials =
      (normalizedEmail === TEST_ACCOUNT.email || normalizedPhone === TEST_ACCOUNT.phone) &&
      password === TEST_ACCOUNT.password;

    if (mongoose.connection.readyState === 1) {
      // Find user by either email OR phone
      let user = await UserModel.findOne({
        $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
      });

      // Auto-create test account in DB on first login
      if (!user && isTestCredentials) {
        const hashedPassword = await bcrypt.hash(TEST_ACCOUNT.password, 10);
        user = await UserModel.create({
          name: TEST_ACCOUNT.name,
          email: TEST_ACCOUNT.email,
          phone: TEST_ACCOUNT.phone,
          age: TEST_ACCOUNT.age,
          dateOfBirth: TEST_ACCOUNT.dateOfBirth,
          password: hashedPassword,
          role: isConfiguredAdminEmail(TEST_ACCOUNT.email) ? 'admin' : 'user',
          currency: '₹',
          currencyCode: 'INR',
          avatarSeed: 'Test',
        });
      }

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
        },
      });
    } else {
      // Offline fallback
      if (isTestCredentials || password.length >= 6) {
        const dummyId = `user_${normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const userName = isTestCredentials ? TEST_ACCOUNT.name : normalizedEmail.split('@')[0];
        const assignedRole = isConfiguredAdminEmail(normalizedEmail) ? 'admin' : 'user';

        const token = jwt.sign(
          { userId: dummyId, email: normalizedEmail, name: userName, role: assignedRole },
          JWT_SECRET,
          { expiresIn: '30d' }
        );

        await recordAuthLog(req, 'LOGIN', normalizedEmail, userName, 'User signed in in offline mode', dummyId);
        return res.json({
          message: 'Login successful (Offline Mode)',
          token,
          isOfflineSession: true,
          user: {
            id: dummyId,
            name: userName,
            email: normalizedEmail,
            phone: TEST_ACCOUNT.phone,
            age: 24,
            dateOfBirth: '2002-05-15',
            role: assignedRole,
            currency: '₹',
            currencyCode: 'INR',
          },
        });
      }

      return res.status(401).json({ error: 'Invalid credentials. Use test@dayledger.app / password123' });
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
        },
      });
    } else {
      const role = isConfiguredAdminEmail(decoded.email) ? 'admin' : (decoded.role || 'user');
      return res.json({
        user: {
          id: decoded.userId,
          name: decoded.name || 'Test User',
          email: decoded.email || 'test@dayledger.app',
          phone: '+919876543210',
          age: 24,
          dateOfBirth: '2002-05-15',
          role,
          currency: '₹',
          currencyCode: 'INR',
        },
      });
    }
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired session token' });
  }
});

export default router;
