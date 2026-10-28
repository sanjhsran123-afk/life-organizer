import admin from 'firebase-admin';
import { DeviceTokenModel } from '../models/DeviceToken.js';

let isFirebaseInitialized = false;

/**
 * Initialize Firebase Admin SDK using secure environment variables.
 * Never commit service account credentials to repository.
 */
export function configureFcm() {
  if (isFirebaseInitialized) return true;

  try {
    let credential = null;

    // Option 1: Full JSON string in Render secret variable
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (serviceAccountJson) {
      try {
        const parsed = JSON.parse(serviceAccountJson);
        credential = admin.credential.cert(parsed);
      } catch (parseErr) {
        console.error('❌ [FCM] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', parseErr.message);
      }
    }

    // Option 2: Individual Render secret variables
    if (!credential) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (projectId && clientEmail && privateKey) {
        // Convert escaped newlines into real line breaks
        if (privateKey.includes('\\n')) {
          privateKey = privateKey.replace(/\\n/g, '\n');
        }
        credential = admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        });
      }
    }

    if (credential) {
      admin.initializeApp({ credential });
      isFirebaseInitialized = true;
      console.log('🔥 [FCM] Firebase Admin SDK initialized successfully for Android push.');
      return true;
    } else {
      isFirebaseInitialized = false;
      console.warn(
        '⚠️ [FCM] Firebase service account credentials not configured in environment variables. Android background FCM calls will remain inactive until FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY are set in Render.'
      );
      return false;
    }
  } catch (err) {
    isFirebaseInitialized = false;
    console.error('❌ [FCM] Error initializing Firebase Admin SDK:', err.message);
    return false;
  }
}

export function isFcmConfigured() {
  return isFirebaseInitialized;
}

/**
 * Send high-priority incoming call FCM message to all active Android device tokens of recipient
 */
export async function sendFcmIncomingCall(userId, { callId, callerId, callerName, callerAvatar = '' }) {
  if (!isFirebaseInitialized || !userId) {
    return { success: false, sent: 0, reason: 'unconfigured_or_no_user' };
  }

  try {
    const devices = await DeviceTokenModel.find({ userId });
    if (!devices.length) {
      return { success: true, sent: 0, message: 'No registered Android devices' };
    }

    const tokens = devices.map((d) => d.token);
    let sentCount = 0;
    const tokensToRemove = [];

    await Promise.allSettled(
      tokens.map(async (token) => {
        try {
          await admin.messaging().send({
            token,
            data: {
              type: 'call_incoming',
              callId: String(callId),
              callerId: String(callerId),
              callerName: String(callerName || 'A friend'),
              callerAvatar: String(callerAvatar || ''),
              timestamp: String(Date.now()),
            },
            notification: {
              title: 'Incoming Audio Call',
              body: `${callerName || 'A friend'} is calling you on DayLedger`,
            },
            android: {
              priority: 'high',
              ttl: 30 * 1000, // 30 seconds ring timeout
              notification: {
                channelId: 'incoming_calls',
                title: 'Incoming Audio Call',
                body: `${callerName || 'A friend'} is calling you on DayLedger`,
                sound: 'default',
                tag: `call-${callId}`,
                priority: 'max',
                visibility: 'public',
              },
            },
          });
          sentCount++;
        } catch (error) {
          const code = error?.code || '';
          if (
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/registration-token-not-registered'
          ) {
            tokensToRemove.push(token);
          } else {
            console.error('[FCM] Error sending call push to device token:', error.message);
          }
        }
      })
    );

    // Clean up expired tokens
    if (tokensToRemove.length > 0) {
      await DeviceTokenModel.deleteMany({ token: { $in: tokensToRemove } });
      console.log(`[FCM] Cleaned up ${tokensToRemove.length} expired device token(s).`);
    }

    return { success: true, sent: sentCount };
  } catch (err) {
    console.error('[FCM] sendFcmIncomingCall failed:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send missed call alert to Android devices
 */
export async function sendFcmMissedCall(userId, { callId, callerId, callerName }) {
  if (!isFirebaseInitialized || !userId) return { success: false };

  try {
    const devices = await DeviceTokenModel.find({ userId });
    if (!devices.length) return { success: true, sent: 0 };

    const tokens = devices.map((d) => d.token);

    await Promise.allSettled(
      tokens.map(async (token) => {
        try {
          await admin.messaging().send({
            token,
            data: {
              type: 'call_missed',
              callId: String(callId),
              callerId: String(callerId),
              callerName: String(callerName || 'A friend'),
            },
            notification: {
              title: 'Missed Audio Call',
              body: `${callerName || 'A friend'} tried calling you on DayLedger`,
            },
            android: {
              priority: 'normal',
              notification: {
                channelId: 'task-reminders',
                sound: 'default',
                tag: `call-${callId}`,
              },
            },
          });
        } catch (e) {
          // Handled
        }
      })
    );

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
