import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { apiRegisterFcmToken, apiUnregisterFcmToken, getAuthToken } from '../api';
import { isCallingSetupCompleted } from './callingPermissions';

const FCM_TOKEN_STORAGE_KEY = 'dayledger_fcm_token';

let isFcmListenersRegistered = false;

/**
 * Check if running natively on Android
 */
export function isAndroidNative(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

/**
 * Get locally stored active FCM token
 */
export function getStoredFcmToken(): string | null {
  try {
    return localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Non-interruptive check of Android push notification permission.
 * NEVER prompts the user.
 */
export async function checkAndroidPushPermission(): Promise<boolean> {
  if (!isAndroidNative()) return false;
  try {
    const status = await PushNotifications.checkPermissions();
    return status.receive === 'granted';
  } catch {
    return false;
  }
}

/**
 * Explicitly request Android push notification permission.
 * MUST only be called after the user explicitly taps "Enable calling" on the setup screen.
 */
export async function requestAndroidPushPermission(): Promise<boolean> {
  if (!isAndroidNative()) return false;
  try {
    let status = await PushNotifications.checkPermissions();
    if (status.receive !== 'granted') {
      status = await PushNotifications.requestPermissions();
    }
    return status.receive === 'granted';
  } catch (err) {
    console.warn('[FCM] Error requesting push permission:', err);
    return false;
  }
}

/**
 * Register Android FCM token with Firebase and sync with DayLedger backend.
 * ONLY called after calling notifications have been enabled by the user.
 */
export async function registerAndroidFcmToken(authToken?: string | null): Promise<void> {
  if (!isAndroidNative()) return;
  const token = authToken || getAuthToken();
  if (!token) return;

  // Strict guard: do NOT register FCM if the user hasn't enabled calling notifications
  if (!isCallingSetupCompleted()) {
    console.log('[FCM] Calling setup not completed by user. Skipping FCM registration.');
    return;
  }

  try {
    // 1. Create dedicated high-priority notification channel for incoming calls
    try {
      await PushNotifications.createChannel({
        id: 'incoming_calls',
        name: 'Incoming Audio Calls',
        description: 'Rings and alerts for incoming DayLedger audio calls',
        importance: 5, // High priority
        visibility: 1, // Public on lockscreen
        sound: 'default',
        vibration: true,
        lights: true,
        lightColor: '#4f46e5',
      });
    } catch (chanErr) {
      console.warn('[FCM] Channel creation note:', chanErr);
    }

    // 2. Check permission without prompting
    const hasPermission = await checkAndroidPushPermission();
    if (!hasPermission) {
      console.log('[FCM] Push permission not granted. Skipping FCM token registration.');
      return;
    }

    // 3. Set up listeners once
    if (!isFcmListenersRegistered) {
      await PushNotifications.removeAllListeners();

      // Token registration and refresh event
      await PushNotifications.addListener('registration', async (fcmToken: Token) => {
        console.log('📱 [FCM] Device registered with token:', fcmToken.value.substring(0, 15) + '...');
        try {
          localStorage.setItem(FCM_TOKEN_STORAGE_KEY, fcmToken.value);
          await apiRegisterFcmToken(fcmToken.value, 'android');
        } catch (err) {
          console.error('[FCM] Failed to sync FCM token to backend:', err);
        }
      });

      // Registration error
      await PushNotifications.addListener('registrationError', (error: any) => {
        console.warn('⚠️ [FCM] Registration error (check google-services.json):', error?.error || error);
      });

      // Foreground push received
      await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('🔔 [FCM] Push received in foreground:', notification.title);
        const data = notification.data || {};
        if (data.type === 'call_incoming') {
          window.dispatchEvent(new CustomEvent('fcm-call-incoming', { detail: data }));
        }
      });

      // User tapped notification
      await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        const data = action.notification.data || {};
        console.log('👆 [FCM] Notification tapped by user:', data);
        if (data.type === 'call_incoming' || data.type === 'call_missed') {
          window.dispatchEvent(new CustomEvent('navigate-to-friends', { detail: data }));
        }
      });

      isFcmListenersRegistered = true;
    }

    // 4. Register with Google FCM to receive device token
    await PushNotifications.register();
  } catch (err: any) {
    console.error('❌ [FCM] registerAndroidFcmToken failed:', err?.message || err);
  }
}

/**
 * Synchronize Android FCM on session start or login, but ONLY if calling setup was ALREADY completed.
 * NEVER prompts the user for permissions at login or startup.
 */
export async function syncAndroidFcmIfEnabled(authToken?: string | null): Promise<void> {
  if (!isAndroidNative()) return;

  // If user has not enabled calling setup, do not prompt or register
  if (!isCallingSetupCompleted()) return;

  // Check if notification permission is already granted; if not, do not prompt
  const isGranted = await checkAndroidPushPermission();
  if (!isGranted) return;

  // Quietly register/refresh device token with backend
  await registerAndroidFcmToken(authToken);
}

/**
 * Unregister device token on logout
 */
export async function unregisterAndroidFcm(): Promise<void> {
  if (!isAndroidNative()) return;

  const token = getStoredFcmToken();
  if (token) {
    try {
      await apiUnregisterFcmToken(token);
    } catch {
      // Ignore network errors on logout
    }
    try {
      localStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
    } catch {}
  }
}
