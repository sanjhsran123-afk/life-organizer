import express from 'express';
import mongoose from 'mongoose';
import { UserModel } from '../models/User.js';
import { FriendshipModel, getPairKey } from '../models/Friendship.js';
import { requireAuth } from '../middleware/auth.js';
import { sendPushToUser } from '../services/pushService.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Rate limiter for phone search (max 20 searches per 5 minutes per user/IP)
const phoneSearchLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 20,
  message: 'Too many search requests. Please wait 5 minutes before searching again.',
  keyGenerator: (req) => req.userId || req.ip || req.headers['x-forwarded-for'] || 'anonymous',
});

// Middleware to check database connection
const checkDB = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Database service is currently unavailable.' });
  }
  next();
};

// All friends endpoints require authentication
router.use(requireAuth);
router.use(checkDB);

// Normalize phone helper
const normalizePhone = (phone) => {
  if (!phone) return '';
  return phone.replace(/[\s\-\(\)\.]/g, '').trim();
};

// Helper to escape regex special characters
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * GET /api/friends/search?query=... (or ?phone=... or ?name=...)
 * Search ONLY existing DayLedger accounts by exact normalized phone number or exact full name.
 * Does NOT require phone or account verification.
 * Does NOT reveal phone numbers or emails.
 */
router.get('/search', phoneSearchLimiter, async (req, res) => {
  try {
    const rawQuery = req.query.query || req.query.q || req.query.phone || req.query.name;
    if (!rawQuery || typeof rawQuery !== 'string' || !rawQuery.trim()) {
      return res.status(400).json({ error: 'Please enter a valid phone number or full name to search.' });
    }

    const searchTerm = rawQuery.trim();
    const normalized = normalizePhone(searchTerm);
    const isPhoneCandidate = /^\+?[0-9]{7,15}$/.test(normalized);

    const phoneCandidates = [];
    if (isPhoneCandidate) {
      phoneCandidates.push(normalized);
      if (normalized.startsWith('+')) {
        phoneCandidates.push(normalized.substring(1));
      } else {
        phoneCandidates.push(`+${normalized}`);
      }
    }

    const orConditions = [];
    if (isPhoneCandidate) {
      orConditions.push({ phone: { $in: phoneCandidates } });
    }
    if (searchTerm.length > 0) {
      orConditions.push({ name: { $regex: new RegExp(`^${escapeRegex(searchTerm)}$`, 'i') } });
    }

    // 1. Search ONLY existing users matching exact normalized phone or exact full name
    // Exclude the current signed-in user
    const targets = await UserModel.find({
      $and: [
        { _id: { $ne: req.userId } },
        { $or: orConditions },
      ],
    }).select('_id name avatarSeed');

    // 2. If no matching account exists, return clean not found
    if (!targets || targets.length === 0) {
      return res.json({
        found: false,
        message: 'No DayLedger account found matching your search.',
        users: [],
      });
    }

    // 3. Inspect existing friendship / block status using canonical pairKey
    // Safety check: Filter out any users where either party has blocked the other
    const results = [];
    for (const target of targets) {
      const targetId = target._id.toString();
      const pairKey = getPairKey(req.userId, targetId);
      const existing = await FriendshipModel.findOne({ pairKey });

      // If blocked, do not reveal the user exists to protect safety
      if (existing && existing.status === 'blocked') {
        continue;
      }

      let friendshipStatus = 'none';
      if (existing) {
        if (existing.status === 'accepted') {
          friendshipStatus = 'friends';
        } else if (existing.status === 'pending') {
          friendshipStatus = existing.requesterId === req.userId ? 'pending_sent' : 'pending_received';
        } else if (existing.status === 'declined') {
          friendshipStatus = 'none';
        }
      }

      // Safe public profile ONLY (name and avatar). Never leak phone or email.
      results.push({
        id: targetId,
        name: target.name,
        avatarSeed: target.avatarSeed || target.name,
        friendshipStatus,
        friendshipId: existing?._id ? existing._id.toString() : null,
      });
    }

    if (results.length === 0) {
      return res.json({
        found: false,
        message: 'No DayLedger account found matching your search.',
        users: [],
      });
    }

    // Return all matching profiles so the requester can choose (e.g. if names match multiple accounts)
    res.json({
      found: true,
      users: results,
      user: results[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/friends/request
 * Send a friend request to an existing user.
 * Request remains stored in 'pending' state until recipient accepts.
 */
router.post('/request', async (req, res) => {
  try {
    const { recipientId } = req.body;
    if (!recipientId || typeof recipientId !== 'string') {
      return res.status(400).json({ error: 'Recipient user ID is required.' });
    }

    if (recipientId === req.userId) {
      return res.status(400).json({ error: 'You cannot send a friend request to yourself.' });
    }

    // 1. Verify recipient account exists
    const recipient = await UserModel.findById(recipientId);

    if (!recipient) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // 2. Inspect existing relationship by canonical pairKey (enforces single relationship per pair atomically)
    const pairKey = getPairKey(req.userId, recipientId);
    const existing = await FriendshipModel.findOne({ pairKey });

    if (existing) {
      if (existing.status === 'blocked') {
        return res.status(403).json({ error: 'Unable to send friend request.' });
      }

      if (existing.status === 'accepted') {
        return res.status(400).json({ error: 'You are already friends with this user.' });
      }

      if (existing.status === 'pending') {
        if (existing.requesterId === req.userId) {
          return res.status(400).json({ error: 'Friend request already sent and awaiting response.' });
        } else {
          // Reciprocal request: STRICTLY do NOT auto-accept.
          // Only the recipient's explicit Accept action may set the relationship to accepted.
          return res.status(400).json({
            error: 'This user has already sent you a friend request. Please check your incoming requests tab to accept or decline.',
          });
        }
      }

      // If previous request was declined, reset it back to pending
      if (existing.status === 'declined') {
        existing.requesterId = req.userId;
        existing.recipientId = recipientId;
        existing.status = 'pending';
        existing.blockedBy = undefined;
        await existing.save();

        const senderName = req.user?.name || 'A user';
        sendPushToUser(recipientId, {
          title: 'New Friend Request',
          body: `${senderName} sent you a friend request on DayLedger.`,
          tag: `friend-req-${req.userId}`,
          url: '/?tab=friends',
        }).catch(() => {});

        return res.json({
          success: true,
          status: 'pending',
          message: 'Friend request sent and awaiting acceptance.',
          friendship: existing,
        });
      }
    }

    // 3. Rate-limit friend requests (max 15 requests in 24 hours)
    const recentRequestsCount = await FriendshipModel.countDocuments({
      requesterId: req.userId,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (recentRequestsCount >= 15) {
      return res.status(429).json({
        error: 'Daily friend request limit reached (15 per day). Please try again tomorrow.',
      });
    }

    // 4. Create new friendship with canonical pairKey (enforces DB-level uniqueness atomically)
    let friendship;
    try {
      friendship = await FriendshipModel.create({
        pairKey,
        requesterId: req.userId,
        recipientId,
        status: 'pending',
      });
    } catch (saveErr) {
      if (saveErr.code === 11000) {
        return res.status(409).json({
          error: 'A relationship request between these users is already being processed.',
        });
      }
      throw saveErr;
    }

    // Optional background push notification if recipient has server push configured
    const senderName = req.user?.name || 'A user';
    sendPushToUser(recipientId, {
      title: 'New Friend Request',
      body: `${senderName} sent you a friend request on DayLedger.`,
      tag: `friend-req-${req.userId}`,
      url: '/?tab=friends',
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Friend request sent. It will remain pending until accepted.',
      friendship,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/friends
 * Get all accepted friends for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const friendships = await FriendshipModel.find({
      $or: [{ requesterId: req.userId }, { recipientId: req.userId }],
      status: 'accepted',
    }).sort({ updatedAt: -1 });

    const friendUserIds = friendships.map((f) =>
      f.requesterId === req.userId ? f.recipientId : f.requesterId
    );

    const users = await UserModel.find({
      _id: { $in: friendUserIds },
    }).select('_id name avatarSeed email');

    const userMap = new Map();
    users.forEach((u) => userMap.set(u._id.toString(), u));

    const friends = friendships
      .map((f) => {
        const friendId = f.requesterId === req.userId ? f.recipientId : f.requesterId;
        const u = userMap.get(friendId);
        if (!u) return null;
        return {
          id: u._id.toString(),
          friendshipId: f._id.toString(),
          name: u.name,
          avatarSeed: u.avatarSeed || u.name,
          since: f.updatedAt || f.createdAt,
        };
      })
      .filter(Boolean);

    res.json({ friends });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/friends/requests
 * Get incoming pending requests and outgoing pending requests
 */
router.get('/requests', async (req, res) => {
  try {
    const [incomingDocs, outgoingDocs] = await Promise.all([
      FriendshipModel.find({
        recipientId: req.userId,
        status: 'pending',
      }).sort({ createdAt: -1 }),
      FriendshipModel.find({
        requesterId: req.userId,
        status: 'pending',
      }).sort({ createdAt: -1 }),
    ]);

    const allUserIds = [
      ...incomingDocs.map((d) => d.requesterId),
      ...outgoingDocs.map((d) => d.recipientId),
    ];

    const users = await UserModel.find({
      _id: { $in: allUserIds },
    }).select('_id name avatarSeed');

    const userMap = new Map();
    users.forEach((u) => userMap.set(u._id.toString(), u));

    const incoming = incomingDocs
      .map((doc) => {
        const u = userMap.get(doc.requesterId);
        if (!u) return null;
        return {
          id: doc._id.toString(),
          requesterId: u._id.toString(),
          name: u.name,
          avatarSeed: u.avatarSeed || u.name,
          createdAt: doc.createdAt,
        };
      })
      .filter(Boolean);

    const outgoing = outgoingDocs
      .map((doc) => {
        const u = userMap.get(doc.recipientId);
        if (!u) return null;
        return {
          id: doc._id.toString(),
          recipientId: u._id.toString(),
          name: u.name,
          avatarSeed: u.avatarSeed || u.name,
          createdAt: doc.createdAt,
        };
      })
      .filter(Boolean);

    res.json({
      incoming,
      outgoing,
      totalPendingIncoming: incoming.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/friends/requests/:id/accept
 * Recipient explicitly accepts the pending request
 */
router.post('/requests/:id/accept', async (req, res) => {
  try {
    const friendship = await FriendshipModel.findOne({
      _id: req.params.id,
      recipientId: req.userId,
      status: 'pending',
    });

    if (!friendship) {
      return res.status(404).json({ error: 'Pending friend request not found.' });
    }

    friendship.status = 'accepted';
    await friendship.save();

    res.json({
      success: true,
      message: 'Friend request accepted! You are now friends.',
      friendship,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/friends/requests/:id/decline
 * Recipient declines the pending request
 */
router.post('/requests/:id/decline', async (req, res) => {
  try {
    const friendship = await FriendshipModel.findOne({
      _id: req.params.id,
      recipientId: req.userId,
      status: 'pending',
    });

    if (!friendship) {
      return res.status(404).json({ error: 'Pending friend request not found.' });
    }

    friendship.status = 'declined';
    await friendship.save();

    res.json({
      success: true,
      message: 'Friend request declined.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/friends/requests/:id/cancel
 * Sender cancels their own outgoing pending request
 */
router.post('/requests/:id/cancel', async (req, res) => {
  try {
    const friendship = await FriendshipModel.findOneAndDelete({
      _id: req.params.id,
      requesterId: req.userId,
      status: 'pending',
    });

    if (!friendship) {
      return res.status(404).json({ error: 'Pending request not found.' });
    }

    res.json({ success: true, message: 'Friend request cancelled.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/friends/:id
 * Remove / unfriend an existing friend
 */
router.delete('/:id', async (req, res) => {
  try {
    const friendship = await FriendshipModel.findOneAndDelete({
      _id: req.params.id,
      $or: [{ requesterId: req.userId }, { recipientId: req.userId }],
      status: 'accepted',
    });

    if (!friendship) {
      return res.status(404).json({ error: 'Friend record not found.' });
    }

    res.json({ success: true, message: 'Friend removed successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/friends/block
 * Block a user to prevent friend requests or communication
 */
router.post('/block', async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId || targetUserId === req.userId) {
      return res.status(400).json({ error: 'Invalid user to block.' });
    }

    const pairKey = getPairKey(req.userId, targetUserId);

    // Atomically upsert or update the existing pair relationship to blocked
    await FriendshipModel.findOneAndUpdate(
      { pairKey },
      {
        $set: {
          pairKey,
          requesterId: req.userId,
          recipientId: targetUserId,
          status: 'blocked',
          blockedBy: req.userId,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, message: 'User blocked.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/friends/unblock
 * Unblock a previously blocked user
 */
router.post('/unblock', async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required.' });
    }

    const pairKey = getPairKey(req.userId, targetUserId);

    await FriendshipModel.deleteOne({
      pairKey,
      status: 'blocked',
      blockedBy: req.userId,
    });

    res.json({ success: true, message: 'User unblocked.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/friends/blocked
 * Get list of users blocked by authenticated user
 */
router.get('/blocked', async (req, res) => {
  try {
    const blockedDocs = await FriendshipModel.find({
      requesterId: req.userId,
      status: 'blocked',
      blockedBy: req.userId,
    });

    const userIds = blockedDocs.map((d) => d.recipientId);
    const users = await UserModel.find({ _id: { $in: userIds } }).select('_id name avatarSeed');

    res.json({
      blockedUsers: users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        avatarSeed: u.avatarSeed || u.name,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
