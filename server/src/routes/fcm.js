import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { DeviceTokenModel } from '../models/DeviceToken.js';
import { isFcmConfigured } from '../services/fcmService.js';

const router = express.Router();

/**
 * GET /api/fcm/status
 * Check if Firebase Admin is configured on server
 */
router.get('/status', (req, res) => {
  res.json({
    fcmConfigured: isFcmConfigured(),
  });
});

// All token registration routes require user authentication
router.use(requireAuth);

/**
 * POST /api/fcm/token
 * Register or refresh an Android (or iOS) FCM device token for the authenticated user
 */
router.post('/token', async (req, res) => {
  try {
    const { token, platform = 'android', deviceModel = '' } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Valid FCM device token is required' });
    }

    const cleanToken = token.trim();
    if (cleanToken.length < 10) {
      return res.status(400).json({ error: 'Invalid device token format' });
    }

    // Upsert token to associate device with current user
    const doc = await DeviceTokenModel.findOneAndUpdate(
      { token: cleanToken },
      {
        userId: req.userId,
        platform: platform === 'ios' ? 'ios' : 'android',
        deviceModel: String(deviceModel || '').slice(0, 100),
        lastUsedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({
      success: true,
      message: 'FCM device token registered successfully',
      tokenId: doc._id,
    });
  } catch (err) {
    console.error('[FCM Route] Failed to register token:', err.message);
    res.status(500).json({ error: 'Failed to register device token' });
  }
});

/**
 * POST /api/fcm/unregister
 * Remove device token upon user sign-out
 */
router.post('/unregister', async (req, res) => {
  try {
    const { token } = req.body;
    if (token) {
      await DeviceTokenModel.deleteOne({ token: token.trim(), userId: req.userId });
    }
    res.json({ success: true, message: 'Device token removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unregister device token' });
  }
});

export default router;
