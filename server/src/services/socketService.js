import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JWT_SECRET } from '../middleware/auth.js';
import { FriendshipModel, getPairKey } from '../models/Friendship.js';
import { UserModel } from '../models/User.js';
import { sendPushToUser } from './pushService.js';
import { sendFcmIncomingCall, sendFcmMissedCall, sendFcmCallDismiss } from './fcmService.js';

let ioInstance = null;

const isProduction = process.env.NODE_ENV === 'production';

// Development origins allowed only when NODE_ENV !== 'production'
const devOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
];

// Standard hybrid mobile app webview origins (Capacitor / Cordova for Android and iOS builds)
const approvedMobileOrigins = new Set([
  'https://localhost',     // Android WebView (Capacitor)
  'capacitor://localhost', // iOS Capacitor WebView
  'ionic://localhost',
  'http://localhost',      // Legacy / local Android WebView
]);

// Track active audio calls: callId -> { callId, callerId, recipientId, status, startedAt }
// Statuses: 'ringing' | 'connected' | 'ended'
const activeCalls = new Map();

/**
 * Checks whether two users are verified, accepted friends.
 * Strict rule: If friendship is pending, declined, blocked, or removed, communication is forbidden.
 *
 * @param {string} userA
 * @param {string} userB
 * @returns {Promise<boolean>}
 */
export async function areFriendsAccepted(userA, userB) {
  if (!userA || !userB || userA === userB) return false;
  const pairKey = getPairKey(userA, userB);
  const friendship = await FriendshipModel.findOne({ pairKey, status: 'accepted' });
  return Boolean(friendship);
}

/**
 * Finds if a user is currently participating in an active call (ringing or connected).
 * Automatically cleans up expired ringing calls (> 60s).
 *
 * @param {string} userId
 * @returns {object|null}
 */
function findActiveCallForUser(userId) {
  if (!userId) return null;
  const now = Date.now();
  for (const [callId, call] of activeCalls.entries()) {
    if (call.status === 'ringing' && now - call.startedAt > 60000) {
      activeCalls.delete(callId);
      continue;
    }
    if ((call.callerId === userId || call.recipientId === userId) && call.status !== 'ended') {
      return call;
    }
  }
  return null;
}

/**
 * Initialize Socket.io attached to the Node HTTP server.
 * Restricts CORS strictly to configured production origins and approved local/mobile origins.
 *
 * @param {import('http').Server} httpServer
 * @param {string[]} allowedOrigins
 * @returns {Server}
 */
export function initSocketServer(httpServer, allowedOrigins = []) {
  const allowedOriginsSet = new Set(
    allowedOrigins.map((origin) => (origin || '').trim().replace(/\/+$/, '')).filter(Boolean)
  );

  ioInstance = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // 1. Allow requests with no Origin header (native mobile apps, backend scripts, curl)
        if (!origin) {
          return callback(null, true);
        }

        const cleanOrigin = origin.replace(/\/+$/, '');

        // 2. In local development, permit localhost / 127.0.0.1
        if (!isProduction) {
          if (
            devOrigins.includes(cleanOrigin) ||
            cleanOrigin.startsWith('http://localhost:') ||
            cleanOrigin.startsWith('http://127.0.0.1:') ||
            approvedMobileOrigins.has(cleanOrigin) ||
            allowedOriginsSet.has(cleanOrigin)
          ) {
            return callback(null, true);
          }
        }

        // 3. In production, strictly match explicitly configured web origins and approved mobile app origins
        if (
          allowedOriginsSet.has(cleanOrigin) ||
          approvedMobileOrigins.has(cleanOrigin)
        ) {
          return callback(null, true);
        }

        // Reject any unauthorized origin - no permissive fallback
        console.warn(`[Socket CORS Blocked] Handshake rejected from unauthorized origin: ${origin}`);
        return callback(new Error(`CORS policy does not allow Socket.IO access from origin: ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 30000,
    pingInterval: 15000,
  });

  // Socket Authentication Middleware
  ioInstance.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/, '') ||
        socket.handshake.query?.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      const userId = decoded.userId || decoded.id;

      if (!userId) {
        return next(new Error('Invalid token payload'));
      }

      const user = await UserModel.findById(userId).select('_id name avatarSeed role');
      if (!user) {
        return next(new Error('User account not found'));
      }

      socket.userId = user._id.toString();
      socket.userName = user.name;
      socket.userAvatar = user.avatarSeed || user.name;
      next();
    } catch (err) {
      next(new Error(`Socket authentication failed: ${err.message}`));
    }
  });

  ioInstance.on('connection', (socket) => {
    const userId = socket.userId; // Authenticated user ID (Source of Truth)

    // Join personal room for 1-to-1 routing
    socket.join(`user:${userId}`);

    // ==================== CALL SIGNALING (WebRTC) ====================

    /**
     * Initiate outgoing call
     * Payload: { callId, recipientId }
     */
    socket.on('call:initiate', async ({ callId, recipientId }) => {
      try {
        if (!callId || typeof callId !== 'string' || !recipientId || typeof recipientId !== 'string') {
          return socket.emit('call:error', { callId, error: 'Invalid call initiation parameters.' });
        }

        if (userId === recipientId) {
          return socket.emit('call:error', { callId, error: 'Cannot call yourself.' });
        }

        // 1. Strict Authorization: Communication ONLY allowed between accepted friends
        const isAccepted = await areFriendsAccepted(userId, recipientId);
        if (!isAccepted) {
          return socket.emit('call:error', {
            callId,
            error: 'You can only place calls to accepted friends.',
          });
        }

        // 2. Verify callId is unique and not already active
        if (activeCalls.has(callId)) {
          return socket.emit('call:error', {
            callId,
            error: 'Call ID already in use.',
          });
        }

        // 3. Verify neither user is already in an ongoing call
        const callerExistingCall = findActiveCallForUser(userId);
        if (callerExistingCall) {
          return socket.emit('call:error', {
            callId,
            error: 'You already have an active call in progress.',
          });
        }

        const recipientExistingCall = findActiveCallForUser(recipientId);
        if (recipientExistingCall) {
          return socket.emit('call:declined', {
            callId,
            reason: 'busy',
            message: 'Friend is currently busy on another call.',
          });
        }

        // 4. Check if recipient has an active socket connection
        const recipientRoom = ioInstance.sockets.adapter.rooms.get(`user:${recipientId}`);
        const isOnline = Boolean(recipientRoom && recipientRoom.size > 0);

        if (!isOnline) {
          // Send Web Push notification to browser tabs
          sendPushToUser(recipientId, {
            title: 'Missed Audio Call',
            body: `${socket.userName || 'A friend'} tried calling you on DayLedger`,
            tag: `call-${callId}`,
            data: {
              type: 'call_missed',
              callId,
              callerId: userId,
              callerName: socket.userName,
              url: '/?tab=friends',
            },
          }).catch(() => {});

          // Send native FCM missed call notification to Android devices
          sendFcmMissedCall(recipientId, {
            callId,
            callerId: userId,
            callerName: socket.userName,
          }).catch(() => {});

          return socket.emit('call:unavailable', {
            callId,
            reason: 'offline',
            message: 'Friend is currently offline. A notification was sent to alert them.',
          });
        }

        const declineToken = crypto.randomBytes(16).toString('hex');

        // 5. Register active call on server (server active-call record is source of truth)
        activeCalls.set(callId, {
          callId,
          callerId: userId,
          recipientId,
          status: 'ringing',
          startedAt: Date.now(),
          declineToken,
        });

        // 6. Forward incoming call notification to recipient with authenticated caller identity
        ioInstance.to(`user:${recipientId}`).emit('call:incoming', {
          callId,
          callerId: userId,
          callerName: socket.userName,
          callerAvatar: socket.userAvatar,
        });

        // 7. Send background Web Push notification to browser subscriptions
        sendPushToUser(recipientId, {
          title: 'Incoming Audio Call',
          body: `${socket.userName || 'A friend'} is calling you on DayLedger`,
          tag: `call-${callId}`,
          data: {
            type: 'call',
            callId,
            callerId: userId,
            callerName: socket.userName,
            url: '/?tab=friends',
          },
        }).catch((err) => console.error('[Calls] Failed to send background push notification:', err.message));

        // 8. Send high-priority native FCM notification to Android devices so device rings when locked/backgrounded
        sendFcmIncomingCall(recipientId, {
          callId,
          callerId: userId,
          callerName: socket.userName,
          callerAvatar: socket.userAvatar,
          declineToken,
        }).catch((err) => console.error('[Calls] Failed to dispatch Android FCM incoming call:', err.message));
      } catch (err) {
        socket.emit('call:error', { callId, error: err.message });
      }
    });

    /**
     * Relay WebRTC signaling message (SDP Offer/Answer or ICE Candidate)
     * Payload: { callId, signal }
     * Uses server active-call record as source of truth for routing.
     */
    socket.on('call:signal', async ({ callId, signal }) => {
      try {
        if (!callId || !signal) return;

        // 1. Verify call exists in server record
        const call = activeCalls.get(callId);
        if (!call) {
          return socket.emit('call:error', { callId, error: 'Call not found or already ended.' });
        }

        // 2. Verify call is in active state
        if (call.status !== 'ringing' && call.status !== 'connected') {
          return socket.emit('call:error', { callId, error: 'Call is not in an active signaling state.' });
        }

        // 3. Verify sender is one of the two participants
        const isCaller = call.callerId === userId;
        const isRecipient = call.recipientId === userId;
        if (!isCaller && !isRecipient) {
          console.warn(`[Call Security] Unauthorized signal attempt on call ${callId} by user ${userId}`);
          return socket.emit('call:error', { callId, error: 'You are not a participant in this call.' });
        }

        // 4. Target is strictly the other participant from server record
        const targetUserId = isCaller ? call.recipientId : call.callerId;

        // 5. Verify friendship is still accepted
        const isAccepted = await areFriendsAccepted(userId, targetUserId);
        if (!isAccepted) {
          activeCalls.delete(callId);
          return socket.emit('call:error', { callId, error: 'Communication permitted only between accepted friends.' });
        }

        // 6. Relay signal to verified target with server-authenticated senderId
        ioInstance.to(`user:${targetUserId}`).emit('call:signal', {
          callId,
          senderId: userId, // Server authenticated socket userId (never caller-supplied)
          signal,
        });
      } catch (err) {
        console.error('Call signal error:', err.message);
      }
    });

    /**
     * Recipient accepts call
     * Payload: { callId }
     * Validates that ONLY the intended recipient can accept.
     */
    socket.on('call:accept', async ({ callId }) => {
      try {
        if (!callId) return;

        // 1. Verify call exists in server record
        const call = activeCalls.get(callId);
        if (!call) {
          return socket.emit('call:error', { callId, error: 'Call not found or already ended.' });
        }

        // 2. Verify call is in ringing state
        if (call.status !== 'ringing') {
          return socket.emit('call:error', { callId, error: 'Call is not awaiting acceptance.' });
        }

        // 3. Verify that ONLY the intended recipient can accept the call
        if (call.recipientId !== userId) {
          console.warn(`[Call Security] Unauthorized accept attempt on call ${callId} by user ${userId}`);
          return socket.emit('call:error', { callId, error: 'You are not the designated recipient of this call.' });
        }

        // 4. Verify friendship is still accepted
        const isAccepted = await areFriendsAccepted(call.callerId, call.recipientId);
        if (!isAccepted) {
          activeCalls.delete(callId);
          return socket.emit('call:error', { callId, error: 'Communication permitted only between accepted friends.' });
        }

        // 5. Update call state to 'connected'
        call.status = 'connected';
        call.connectedAt = Date.now();

        // 6. Notify caller that call was accepted
        ioInstance.to(`user:${call.callerId}`).emit('call:accepted', {
          callId,
          responderId: userId,
        });
      } catch (err) {
        console.error('Call accept error:', err.message);
      }
    });

    /**
     * Recipient declines call (or caller cancels while ringing)
     * Payload: { callId, reason }
     */
    socket.on('call:decline', async ({ callId, reason }) => {
      try {
        if (!callId) return;

        // 1. Verify call exists in server record
        const call = activeCalls.get(callId);
        if (!call) return; // Already ended or cleaned up

        // 2. Verify call is in ringing state
        if (call.status !== 'ringing') return;

        // 3. Verify sender is one of the two participants
        const isRecipient = call.recipientId === userId;
        const isCaller = call.callerId === userId;
        if (!isRecipient && !isCaller) {
          console.warn(`[Call Security] Unauthorized decline attempt on call ${callId} by user ${userId}`);
          return;
        }

        // 4. Target is strictly the other participant
        const targetUserId = isRecipient ? call.callerId : call.recipientId;

        // 5. Clean up server active call record
        activeCalls.delete(callId);

        // 6. Notify the other participant
        ioInstance.to(`user:${targetUserId}`).emit('call:declined', {
          callId,
          reason: reason || 'declined',
        });

        // 7. If caller cancelled while ringing, dismiss FCM alert on recipient device
        if (isCaller) {
          sendFcmCallDismiss(call.recipientId, { callId }).catch(() => {});
        }
      } catch (err) {
        console.error('Call decline error:', err.message);
      }
    });

    /**
     * Either participant ends the call
     * Payload: { callId }
     */
    socket.on('call:end', async ({ callId }) => {
      try {
        if (!callId) return;

        // 1. Verify call exists in server record
        const call = activeCalls.get(callId);
        if (!call) return;

        // 2. Verify sender is one of the two participants
        const isCaller = call.callerId === userId;
        const isRecipient = call.recipientId === userId;
        if (!isCaller && !isRecipient) {
          console.warn(`[Call Security] Unauthorized end attempt on call ${callId} by user ${userId}`);
          return;
        }

        // 3. Target is strictly the other participant
        const targetUserId = isCaller ? call.recipientId : call.callerId;

        // 4. Dismiss FCM ringing if caller cancelled while ringing
        if (isCaller && call.status === 'ringing') {
          sendFcmCallDismiss(call.recipientId, { callId }).catch(() => {});
        }

        // 5. Clean up server record
        activeCalls.delete(callId);

        // 6. Notify the other participant that call ended
        ioInstance.to(`user:${targetUserId}`).emit('call:ended', { callId });
      } catch (err) {
        console.error('Call end error:', err.message);
      }
    });

    // ==================== DISCONNECT CLEANUP ====================
    socket.on('disconnect', () => {
      // Clean up any call where this user was a participant
      for (const [callId, call] of activeCalls.entries()) {
        if (call.callerId === userId) {
          if (call.status === 'ringing') {
            sendFcmCallDismiss(call.recipientId, { callId }).catch(() => {});
          }
          ioInstance.to(`user:${call.recipientId}`).emit('call:ended', { callId, reason: 'disconnected' });
          activeCalls.delete(callId);
        } else if (call.recipientId === userId) {
          ioInstance.to(`user:${call.callerId}`).emit('call:ended', { callId, reason: 'disconnected' });
          activeCalls.delete(callId);
        }
      }
    });
  });

  // Background sweep: expire ringing calls that timed out (> 60s without answer)
  setInterval(() => {
    const now = Date.now();
    for (const [callId, call] of activeCalls.entries()) {
      if (call.status === 'ringing' && now - call.startedAt > 60000) {
        if (ioInstance) {
          ioInstance.to(`user:${call.callerId}`).emit('call:unavailable', {
            callId,
            reason: 'timeout',
            message: 'No answer from friend.',
          });
          ioInstance.to(`user:${call.recipientId}`).emit('call:ended', { callId, reason: 'timeout' });
        }
        sendFcmCallDismiss(call.recipientId, { callId }).catch(() => {});
        activeCalls.delete(callId);
      }
    }
  }, 15000);

  return ioInstance;
}

/**
 * Decline an active call programmatically via HTTP endpoint.
 * Validates either the authenticated userId or an ephemeral declineToken.
 */
export function declineActiveCall(callId, { userId = null, declineToken = null, reason = 'declined' } = {}) {
  if (!callId) return { success: false, reason: 'missing_call_id' };
  const call = activeCalls.get(callId);
  if (!call) return { success: false, reason: 'call_not_found' };

  if (declineToken) {
    if (call.declineToken !== declineToken) {
      return { success: false, reason: 'invalid_decline_token' };
    }
  } else if (userId) {
    if (call.recipientId !== userId && call.callerId !== userId) {
      return { success: false, reason: 'unauthorized' };
    }
  } else {
    return { success: false, reason: 'auth_required' };
  }

  activeCalls.delete(callId);

  // Notify caller via socket
  if (ioInstance) {
    ioInstance.to(`user:${call.callerId}`).emit('call:declined', {
      callId,
      reason: reason || 'declined',
    });
  }

  // Dismiss native ringing on recipient devices
  sendFcmCallDismiss(call.recipientId, { callId }).catch(() => {});

  return { success: true };
}

/**
 * Emit a new message event to the recipient in real time.
 *
 * @param {string} recipientId
 * @param {object} message
 */
export function emitLiveMessage(recipientId, message) {
  if (!ioInstance) return;
  ioInstance.to(`user:${recipientId}`).emit('message:new', message);
}

/**
 * Emit a message read event in real time.
 *
 * @param {string} senderId
 * @param {object} payload - { pairKey, readAt }
 */
export function emitLiveMessageRead(senderId, payload) {
  if (!ioInstance) return;
  ioInstance.to(`user:${senderId}`).emit('message:read', payload);
}

/**
 * Check if a user is currently connected via Socket.
 *
 * @param {string} userId
 * @returns {boolean}
 */
export function isUserOnline(userId) {
  if (!ioInstance) return false;
  const room = ioInstance.sockets.adapter.rooms.get(`user:${userId}`);
  return Boolean(room && room.size > 0);
}
