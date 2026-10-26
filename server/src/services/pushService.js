import webpush from 'web-push';
import { PushSubscriptionModel } from '../models/PushSubscription.js';

let isVapidConfigured = false;

export function configureWebPush() {
  const subject = process.env.VAPID_SUBJECT || 'mailto:support@dayledger.app';
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (publicKey && privateKey) {
    try {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      isVapidConfigured = true;
      console.log('🔔 Web Push VAPID configuration initialized successfully.');
    } catch (err) {
      console.error('❌ Failed to initialize Web Push VAPID:', err.message);
      isVapidConfigured = false;
    }
  } else {
    isVapidConfigured = false;
    console.warn(
      '⚠️ Web Push VAPID keys not detected in environment variables. Web Push reminders will remain inactive until VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are set in Render.'
    );
  }
}

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export function isPushConfigured() {
  return isVapidConfigured;
}

/**
 * Send Web Push notification to all active subscriptions of a user
 */
export async function sendPushToUser(userId, payload) {
  if (!isVapidConfigured || !userId) return { success: false, sent: 0 };

  try {
    const subscriptions = await PushSubscriptionModel.find({ userId });
    if (!subscriptions.length) {
      return { success: true, sent: 0 };
    }

    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    let sentCount = 0;

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, payloadString);
          sentCount++;
        } catch (error) {
          // If subscription has expired or is invalid (HTTP 404 or 410 Gone)
          if (error.statusCode === 404 || error.statusCode === 410) {
            console.log(`[WebPush] Removing expired subscription: ${sub._id}`);
            await PushSubscriptionModel.deleteOne({ _id: sub._id });
          } else {
            console.error(`[WebPush] Error delivering push notification:`, error.message);
          }
        }
      })
    );

    return { success: true, sent: sentCount };
  } catch (error) {
    console.error('[WebPush] sendPushToUser failed:', error.message);
    return { success: false, error: error.message };
  }
}
