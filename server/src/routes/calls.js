import express from 'express';
import crypto from 'crypto';
import { requireAuth, authMiddleware } from '../middleware/auth.js';
import { isR2Configured } from '../services/r2Service.js';
import { declineActiveCall } from '../services/socketService.js';

const router = express.Router();

/**
 * POST /api/calls/:callId/decline
 * Allows recipient to decline an incoming call (e.g. from native Android notification or background receiver).
 * Authenticates either via valid declineToken (from FCM data payload) or via Bearer JWT.
 */
router.post('/:callId/decline', authMiddleware, (req, res) => {
  const { callId } = req.params;
  const { declineToken, reason } = req.body || {};

  const result = declineActiveCall(callId, {
    userId: req.userId || null,
    declineToken: declineToken || null,
    reason: reason || 'declined',
  });

  if (!result.success) {
    return res.status(result.reason === 'unauthorized' || result.reason === 'invalid_decline_token' ? 403 : 404).json({
      error: result.reason,
      message: 'Unable to decline call or call already ended.',
    });
  }

  res.json({ success: true, message: 'Call declined successfully.' });
});

router.use(requireAuth);

/**
 * GET /api/calls/ice-servers
 * Returns secure STUN and ephemeral short-lived TURN server configuration for WebRTC audio calls.
 * Never leaks permanent shared credentials to clients.
 */
router.get('/ice-servers', (req, res) => {
  const defaultStunServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  const iceServers = [...defaultStunServers];

  const turnUrl = process.env.TURN_URL || process.env.COTURN_URL;
  const turnSecret = process.env.TURN_SECRET || process.env.COTURN_SECRET;

  let turnConfigured = false;

  // Support short-lived per-session ephemeral TURN credentials via Coturn / RFC 5766 REST API
  if (turnUrl && turnSecret) {
    try {
      const ttlSeconds = 3600; // 1-hour session validity
      const expiryTimestamp = Math.floor(Date.now() / 1000) + ttlSeconds;
      const username = `${expiryTimestamp}:${req.userId}`;
      const credential = crypto
        .createHmac('sha1', turnSecret)
        .update(username)
        .digest('base64');

      const urls = turnUrl.split(',').map((u) => u.trim()).filter(Boolean);
      iceServers.push({
        urls,
        username,
        credential,
      });
      turnConfigured = true;
    } catch (err) {
      console.error('[Calls] Failed to generate ephemeral TURN credentials:', err.message);
    }
  } else if (process.env.TURN_USERNAME || process.env.TURN_CREDENTIAL) {
    // Static shared TURN credentials must NOT be returned to clients
    console.warn(
      '[Calls Security] Static shared TURN credentials detected in environment but will not be sent to clients. Configure TURN_SECRET to enable secure ephemeral per-session credentials.'
    );
  }

  res.json({
    iceServers,
    turnConfigured,
    audioConstraints: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
});

/**
 * GET /api/calls/capabilities
 * Reports which cloud features (R2 file storage, TURN server) are configured on backend
 */
router.get('/capabilities', (req, res) => {
  const turnSecret = process.env.TURN_SECRET || process.env.COTURN_SECRET;
  const turnUrl = process.env.TURN_URL || process.env.COTURN_URL;

  res.json({
    r2Configured: isR2Configured(),
    turnConfigured: Boolean(turnUrl && turnSecret),
    maxFileSizeMb: 15,
  });
});

export default router;
