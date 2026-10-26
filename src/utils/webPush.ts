import { Capacitor } from '@capacitor/core';
import { getPushPublicKey, apiSubscribePush, apiUnsubscribePush } from '../api';

/**
 * Check if Web Push is supported in the current environment
 */
export function isWebPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  // Use Capacitor Local Notifications instead on native mobile apps
  if (Capacitor.isNativePlatform()) return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Convert VAPID public key string from base64 URL format to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Retrieve existing active Web Push subscription if already granted
 */
export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isWebPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch (err) {
    console.error('Failed to get push subscription:', err);
    return null;
  }
}

export interface SubscribePushResult {
  success: boolean;
  reason?: 'unsupported' | 'permission_denied' | 'vapid_not_configured' | 'error';
  message?: string;
  subscription?: PushSubscription;
}

/**
 * Request permission and subscribe browser to Web Push notifications
 */
export async function subscribeToPushNotifications(): Promise<SubscribePushResult> {
  if (!isWebPushSupported()) {
    return { success: false, reason: 'unsupported', message: 'Web Push is not supported on this browser.' };
  }

  try {
    // 1. Request notification permission clearly
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        reason: 'permission_denied',
        message: 'Notification permission was denied. Please allow notifications in your browser settings.',
      };
    }

    // 2. Retrieve VAPID public key from backend
    const publicKey = await getPushPublicKey();
    if (!publicKey) {
      return {
        success: false,
        reason: 'vapid_not_configured',
        message: 'VAPID public key is not configured on the server yet.',
      };
    }

    // 3. Ensure service worker is ready and subscribe
    const reg = await navigator.serviceWorker.ready;
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      });
    }

    // 4. Send subscription to DayLedger backend
    const synced = await apiSubscribePush(subscription.toJSON());
    if (!synced) {
      console.warn('Subscription registered in browser but failed to sync to backend.');
    }

    return { success: true, subscription };
  } catch (error) {
    console.error('Failed to subscribe to Web Push:', error);
    return {
      success: false,
      reason: 'error',
      message: error instanceof Error ? error.message : 'Unknown push subscription error',
    };
  }
}

/**
 * Unsubscribe from Web Push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!isWebPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await apiUnsubscribePush(endpoint);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to unsubscribe from Web Push:', err);
    return false;
  }
}
