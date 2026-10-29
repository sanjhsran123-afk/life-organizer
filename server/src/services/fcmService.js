import fs from 'fs';
import { initializeApp, cert, applicationDefault, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { DeviceTokenModel } from '../models/DeviceToken.js';

let isFirebaseInitialized = false;
let fcmApp = null;

/**
 * Initialize Firebase Admin SDK using secure credentials.
 * Prioritizes Render Secret File with GOOGLE_APPLICATION_CREDENTIALS.
 * Never logs, prints, commits, or exposes service account credentials.
 */
export function configureFcm() {
  if (isFirebaseInitialized && fcmApp) return true;

  try {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      fcmApp = existingApps[0];
      isFirebaseInitialized = true;
      return true;
    }

    let credential = null;
    let authSource = null;

    // 1. Primary: Render Secret File via GOOGLE_APPLICATION_CREDENTIALS or standard secret paths
    const candidatePaths = [
      process.env.GOOGLE_APPLICATION_CREDENTIALS,
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
      '/etc/secrets/firebase-service-account.json',
      '/etc/secrets/service-account.json',
      '/etc/secrets/google-services.json',
    ].filter(Boolean);

    for (const filePath of candidatePaths) {
      try {
        if (fs.existsSync(filePath)) {
          // Read and verify it is a valid JSON service account file
          const content = fs.readFileSync(filePath, 'utf8').trim();
          if (content.startsWith('{') && content.endsWith('}')) {
            const parsed = JSON.parse(content);
            if (parsed.project_id && (parsed.private_key || parsed.type === 'service_account')) {
              process.env.GOOGLE_APPLICATION_CREDENTIALS = filePath;
              try {
                credential = applicationDefault();
                authSource = `secret file (${filePath})`;
                break;
              } catch {
                credential = cert(parsed);
                authSource = `cert from secret file (${filePath})`;
                break;
              }
            } else if (parsed.client && parsed.project_info) {
              console.warn(
                `⚠️ [FCM] The file at "${filePath}" is an Android client config (google-services.json), not a Firebase Admin service account key.`
              );
            }
          }
        }
      } catch (fileErr) {
        // Safe error logging: do not expose file content
        console.warn(`[FCM] Could not load candidate secret file "${filePath}":`, fileErr.message);
      }
    }

    // 2. Safe Fallback: FIREBASE_SERVICE_ACCOUNT_JSON environment variable string (parsed via cert)
    if (!credential && process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        if (parsed.project_id && (parsed.private_key || parsed.type === 'service_account')) {
          credential = cert(parsed);
          authSource = 'FIREBASE_SERVICE_ACCOUNT_JSON environment variable';
        }
      } catch (parseErr) {
        console.error('❌ [FCM] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', parseErr.message);
      }
    }

    // 3. Safe Fallback: Individual environment variables
    if (!credential) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (projectId && clientEmail && privateKey) {
        if (privateKey.includes('\\n')) {
          privateKey = privateKey.replace(/\\n/g, '\n');
        }
        try {
          credential = cert({
            projectId,
            clientEmail,
            privateKey,
          });
          authSource = 'individual FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY variables';
        } catch (certErr) {
          console.error('❌ [FCM] Failed to create cert from individual credentials:', certErr.message);
        }
      }
    }

    if (credential) {
      fcmApp = initializeApp({ credential });
      isFirebaseInitialized = true;
      console.log(`🔥 [FCM] Firebase Admin SDK initialized successfully (${authSource}).`);
      return true;
    } else {
      isFirebaseInitialized = false;
      fcmApp = null;
      console.warn(
        '⚠️ [FCM] Firebase service account not configured. Android background FCM calls will remain inactive until a Render Secret File (e.g. /etc/secrets/firebase-service-account.json with GOOGLE_APPLICATION_CREDENTIALS) is set in Render.'
      );
      return false;
    }
  } catch (err) {
    isFirebaseInitialized = false;
    fcmApp = null;
    console.error('❌ [FCM] Error initializing Firebase Admin SDK:', err.message);
    return false;
  }
}

export function isFcmConfigured() {
  if (!isFirebaseInitialized) {
    configureFcm();
  }
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

    const messaging = getMessaging(fcmApp || undefined);
    const tokens = devices.map((d) => d.token);
    let sentCount = 0;
    const tokensToRemove = [];

    await Promise.allSettled(
      tokens.map(async (token) => {
        try {
          await messaging.send({
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

    const messaging = getMessaging(fcmApp || undefined);
    const tokens = devices.map((d) => d.token);

    await Promise.allSettled(
      tokens.map(async (token) => {
        try {
          await messaging.send({
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
