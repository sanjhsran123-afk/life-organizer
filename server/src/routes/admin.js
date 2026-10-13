import express from 'express';
import mongoose from 'mongoose';
import { UserModel } from '../models/User.js';
import { AuthActivityModel } from '../models/AuthActivity.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Enforce both authentication and administrator authorization across all /api/admin routes
router.use(requireAuth);
router.use(requireAdmin);

// Helper to escape regex special characters to prevent regex injection attacks
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * GET /api/admin/overview
 * Returns high-level metrics, system status, and recent events
 */
router.get('/overview', async (req, res) => {
  try {
    const isDbConnected = mongoose.connection.readyState === 1;

    if (!isDbConnected) {
      return res.json({
        databaseStatus: 'Disconnected',
        totalUsers: 1,
        adminUsers: 1,
        standardUsers: 0,
        signupsLast7Days: 1,
        loginsLast7Days: 1,
        recentSignups: [],
        recentActivities: [],
        lastUpdated: new Date().toISOString(),
      });
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Run parallel aggregation queries for optimal performance
    const [
      totalUsers,
      adminUsers,
      standardUsers,
      signupsLast7Days,
      loginsLast7Days,
      recentSignups,
      recentActivities,
    ] = await Promise.all([
      UserModel.countDocuments(),
      UserModel.countDocuments({ role: 'admin' }),
      UserModel.countDocuments({ role: 'user' }),
      UserModel.countDocuments({ createdAt: { $gte: sevenDaysAgo.toISOString() } }),
      AuthActivityModel.countDocuments({
        eventType: 'LOGIN',
        timestamp: { $gte: sevenDaysAgo },
      }),
      UserModel.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('-password'),
      AuthActivityModel.find()
        .sort({ timestamp: -1 })
        .limit(10),
    ]);

    return res.json({
      databaseStatus: 'Connected',
      totalUsers,
      adminUsers,
      standardUsers,
      signupsLast7Days,
      loginsLast7Days,
      recentSignups,
      recentActivities,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error fetching admin overview:', err);
    res.status(500).json({ error: 'Failed to retrieve administrative overview metrics.' });
  }
});

/**
 * GET /api/admin/users
 * Returns paginated, searchable, filterable list of users (excluding passwords)
 */
router.get('/users', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const { search, role, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const query = {};

    // Filter by role
    if (role && role !== 'all' && ['user', 'admin'].includes(role)) {
      query.role = role;
    }

    // Search query on name, email, or phone
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const sanitized = escapeRegex(search.trim());
      query.$or = [
        { name: { $regex: sanitized, $options: 'i' } },
        { email: { $regex: sanitized, $options: 'i' } },
        { phone: { $regex: sanitized, $options: 'i' } },
      ];
    }

    // Determine sorting
    const validSortFields = ['createdAt', 'name', 'email', 'age', 'role'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortDirection };

    if (mongoose.connection.readyState !== 1) {
      return res.json({
        users: [],
        total: 0,
        page: 1,
        totalPages: 1,
        limit,
      });
    }

    const [users, total] = await Promise.all([
      UserModel.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-password'),
      UserModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return res.json({
      users,
      total,
      page,
      totalPages,
      limit,
    });
  } catch (err) {
    console.error('Error fetching admin users:', err);
    res.status(500).json({ error: 'Failed to load user accounts.' });
  }
});

/**
 * GET /api/admin/users/:id
 * Returns complete user profile and user-specific activity history
 */
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id) && !id.startsWith('user_')) {
      return res.status(400).json({ error: 'Invalid user ID format.' });
    }

    const user = await UserModel.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    // Fetch user-specific recent activity
    const userActivity = await AuthActivityModel.find({
      $or: [{ userId: user._id }, { userEmail: user.email }],
    })
      .sort({ timestamp: -1 })
      .limit(25);

    return res.json({
      user,
      recentActivity: userActivity,
    });
  } catch (err) {
    console.error('Error fetching user detail:', err);
    res.status(500).json({ error: 'Failed to load user account details.' });
  }
});

/**
 * PATCH /api/admin/users/:id/role
 * Allows promoting or demoting account roles (with self-demotion safeguard)
 */
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be either "user" or "admin".' });
    }

    // Safeguard: An administrator cannot revoke their own admin status to prevent lockout
    if (req.userId && (req.userId.toString() === id.toString()) && role !== 'admin') {
      return res.status(400).json({
        error: 'SelfDemotionPrevented',
        message: 'Security policy: You cannot demote your own administrator account. Another administrator must perform this action.',
      });
    }

    const user = await UserModel.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const previousRole = user.role;
    user.role = role;
    await user.save();

    // Log the role modification in MongoDB AuthActivity
    await AuthActivityModel.create({
      userId: user._id,
      userEmail: user.email,
      userName: user.name,
      eventType: 'ROLE_CHANGED',
      status: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'DayLedger Admin Panel',
      details: `Role updated from "${previousRole}" to "${role}" by administrator (${req.adminUser?.email || req.userId})`,
      timestamp: new Date(),
    });

    const updatedUser = await UserModel.findById(id).select('-password');
    return res.json({
      message: `User role successfully updated to ${role}.`,
      user: updatedUser,
    });
  } catch (err) {
    console.error('Error updating user role:', err);
    res.status(500).json({ error: 'Failed to update user role.' });
  }
});

/**
 * GET /api/admin/activity
 * Chronological, filterable audit log of authentication and security events
 */
router.get('/activity', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const { eventType, search } = req.query;
    const query = {};

    if (eventType && eventType !== 'all') {
      query.eventType = eventType;
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const sanitized = escapeRegex(search.trim());
      query.$or = [
        { userEmail: { $regex: sanitized, $options: 'i' } },
        { userName: { $regex: sanitized, $options: 'i' } },
        { details: { $regex: sanitized, $options: 'i' } },
      ];
    }

    if (mongoose.connection.readyState !== 1) {
      return res.json({
        activities: [],
        total: 0,
        page: 1,
        totalPages: 1,
        limit,
      });
    }

    const [activities, total] = await Promise.all([
      AuthActivityModel.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      AuthActivityModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return res.json({
      activities,
      total,
      page,
      totalPages,
      limit,
    });
  } catch (err) {
    console.error('Error fetching admin activities:', err);
    res.status(500).json({ error: 'Failed to load account activity history.' });
  }
});

/**
 * GET /api/admin/export/users
 * Exports user records in CSV or JSON format.
 * STRICT SECURITY GUARANTEE: Never includes passwords, hashes, salts, or session tokens.
 */
router.get('/export/users', async (req, res) => {
  try {
    const format = req.query.format === 'json' ? 'json' : 'csv';

    const users = await UserModel.find()
      .sort({ createdAt: -1 })
      .select('-password');

    const sanitizedUsers = users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      phone: u.phone,
      age: u.age,
      dateOfBirth: u.dateOfBirth,
      currentAge: u.currentAge,
      role: u.role,
      currency: u.currency,
      currencyCode: u.currencyCode,
      createdAt: u.createdAt,
    }));

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="dayledger-users-${Date.now()}.json"`);
      return res.json(sanitizedUsers);
    }

    // CSV format
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Registration Age', 'Date of Birth', 'Current Age', 'Role', 'Currency', 'Created At'];
    const rows = sanitizedUsers.map((u) => [
      `"${u.id}"`,
      `"${(u.name || '').replace(/"/g, '""')}"`,
      `"${(u.email || '').replace(/"/g, '""')}"`,
      `"${(u.phone || '').replace(/"/g, '""')}"`,
      u.age,
      `"${u.dateOfBirth || ''}"`,
      u.currentAge,
      `"${u.role || 'user'}"`,
      `"${u.currency || ''}"`,
      `"${u.createdAt || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="dayledger-users-${Date.now()}.csv"`);
    return res.send(csvContent);
  } catch (err) {
    console.error('Error exporting users:', err);
    res.status(500).json({ error: 'Failed to export user accounts.' });
  }
});

export default router;
