import { Capacitor, registerPlugin } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { apiGetIceServers } from '../api';
import { IceServerConfig } from '../types';
import { registerAndroidFcmToken } from './fcmPush';
import { NativeCall, FullScreenIntentStatus } from './nativeCall';

export interface PermissionResult {
  granted: boolean;
  state: 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale';
  isPermanentlyDenied: boolean;
}

export interface MicrophonePermissionPlugin {
  checkMicPermission(): Promise<PermissionResult>;
  requestMicPermission(): Promise<PermissionResult>;
  checkNotificationPermission(): Promise<PermissionResult>;
  requestNotificationPermission(): Promise<PermissionResult>;
  openAppSettings(): Promise<void>;
}

export const MicrophonePermission = registerPlugin<MicrophonePermissionPlugin>('MicrophonePermission', {
  web: () => ({
    async checkMicPermission(): Promise<PermissionResult> {
      if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
        try {
          const res = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          return {
            granted: res.state === 'granted',
            state: res.state as 'granted' | 'denied' | 'prompt',
            isPermanentlyDenied: res.state === 'denied',
          };
        } catch {
          // Some browsers throw when querying microphone permissions
        }
      }
      return {
        granted: false,
        state: 'prompt',
        isPermanentlyDenied: false,
      };
    },
    async requestMicPermission(): Promise<PermissionResult> {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        return {
          granted: true,
          state: 'granted',
          isPermanentlyDenied: false,
        };
      } catch (err: any) {
        const isDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
        return {
          granted: false,
          state: isDenied ? 'denied' : 'prompt',
          isPermanentlyDenied: isDenied,
        };
      }
    },
    async checkNotificationPermission(): Promise<PermissionResult> {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const perm = Notification.permission;
        return {
          granted: perm === 'granted',
          state: perm === 'granted' ? 'granted' : perm === 'denied' ? 'denied' : 'prompt',
          isPermanentlyDenied: perm === 'denied',
        };
      }
      return {
        granted: false,
        state: 'denied',
        isPermanentlyDenied: true,
      };
    },
    async requestNotificationPermission(): Promise<PermissionResult> {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        try {
          const perm = await Notification.requestPermission();
          return {
            granted: perm === 'granted',
            state: perm === 'granted' ? 'granted' : perm === 'denied' ? 'denied' : 'prompt',
            isPermanentlyDenied: perm === 'denied',
          };
        } catch {
          return { granted: false, state: 'denied', isPermanentlyDenied: true };
        }
      }
      return { granted: false, state: 'denied', isPermanentlyDenied: true };
    },
    async openAppSettings(): Promise<void> {
      console.warn('App settings are only available on native Android.');
    },
  }),
});

// Setup state tracking keys
const CALLING_SETUP_STATE_KEY = 'dayledger_calling_setup_state';

export type CallingSetupState = 'completed' | 'skipped' | 'none';

export function getCallingSetupState(): CallingSetupState {
  try {
    const val = localStorage.getItem(CALLING_SETUP_STATE_KEY);
    if (val === 'completed' || val === 'skipped') return val;
    return 'none';
  } catch {
    return 'none';
  }
}

export function setCallingSetupState(state: 'completed' | 'skipped'): void {
  try {
    localStorage.setItem(CALLING_SETUP_STATE_KEY, state);
  } catch {
    // Handle local storage exceptions
  }
}

export function isCallingSetupCompleted(): boolean {
  return getCallingSetupState() === 'completed';
}

export function isCallingSetupDismissed(): boolean {
  return getCallingSetupState() === 'skipped';
}

export interface CallingPermissionsStatus {
  micGranted: boolean;
  micPermanentlyDenied: boolean;
  notificationsGranted: boolean;
  fullScreenIntentGranted?: boolean;
  fullScreenIntentSupported?: boolean;
  isAndroid: boolean;
  isSecureContext: boolean;
  errorMessage?: string;
}

/**
 * Non-interruptive check of current permission states
 */
export async function checkCallingPermissions(): Promise<CallingPermissionsStatus> {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  const isAndroid = isNative && platform === 'android';
  const isSecure = typeof window !== 'undefined' ? (window.isSecureContext ?? true) : true;

  if (isAndroid) {
    try {
      const micRes = await MicrophonePermission.checkMicPermission();
      let notifGranted = false;
      try {
        const notifStatus = await PushNotifications.checkPermissions();
        notifGranted = notifStatus.receive === 'granted';
      } catch {
        // Fallback for notification check
      }

      let fullScreenGranted = true;
      let fullScreenSupported = false;
      try {
        const fsStatus = await NativeCall.checkFullScreenIntentPermission();
        fullScreenGranted = fsStatus.granted;
        fullScreenSupported = fsStatus.isSupported;
      } catch {
        // Fallback if plugin unavailable
      }

      return {
        micGranted: micRes.granted,
        micPermanentlyDenied: micRes.isPermanentlyDenied,
        notificationsGranted: notifGranted,
        fullScreenIntentGranted: fullScreenGranted,
        fullScreenIntentSupported: fullScreenSupported,
        isAndroid: true,
        isSecureContext: true,
      };
    } catch {
      return {
        micGranted: false,
        micPermanentlyDenied: false,
        notificationsGranted: false,
        fullScreenIntentGranted: true,
        fullScreenIntentSupported: false,
        isAndroid: true,
        isSecureContext: true,
      };
    }
  }

  // Web / PWA
  let micGranted = false;
  let micPermanentlyDenied = false;

  if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
    try {
      const res = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      micGranted = res.state === 'granted';
      micPermanentlyDenied = res.state === 'denied';
    } catch {
      // Browser does not support querying microphone permission
    }
  }

  const notifGranted = typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';

  return {
    micGranted,
    micPermanentlyDenied,
    notificationsGranted: notifGranted,
    isAndroid: false,
    isSecureContext: isSecure,
  };
}

/**
 * User-initiated calling setup request.
 * MUST be called directly from user interaction (e.g., tapping "Enable calling").
 * Requests Microphone access first, then Notification access.
 * Registers Android FCM token only after calling notifications have been enabled.
 */
export async function requestCallingPermissions(): Promise<{
  micGranted: boolean;
  micPermanentlyDenied: boolean;
  notificationsGranted: boolean;
  errorMessage?: string;
}> {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  const isAndroid = isNative && platform === 'android';

  if (isAndroid) {
    try {
      // 1. Request Microphone permission strictly on user tap
      const micRes = await MicrophonePermission.requestMicPermission();

      // 2. Request Notification permission strictly on user tap (Android 13+ POST_NOTIFICATIONS)
      let notifGranted = false;
      try {
        let notifStatus = await PushNotifications.checkPermissions();
        if (notifStatus.receive !== 'granted') {
          notifStatus = await PushNotifications.requestPermissions();
        }
        notifGranted = notifStatus.receive === 'granted';
      } catch (e) {
        console.warn('Android notification permission request skipped or failed:', e);
      }

      if (micRes.granted) {
        // Remember user's setup state
        setCallingSetupState('completed');

        // Register Android FCM token only after calling notifications have been enabled
        if (notifGranted) {
          registerAndroidFcmToken().catch((err) => {
            console.warn('[CallingPermissions] Error registering FCM token:', err);
          });
        }
      }

      return {
        micGranted: micRes.granted,
        micPermanentlyDenied: micRes.isPermanentlyDenied,
        notificationsGranted: notifGranted,
        errorMessage: micRes.granted ? undefined : 'Microphone permission is required to speak on audio calls.',
      };
    } catch (err: any) {
      return {
        micGranted: false,
        micPermanentlyDenied: false,
        notificationsGranted: false,
        errorMessage: err?.message || 'Failed to request calling permissions.',
      };
    }
  }

  // Web / PWA flow
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return {
      micGranted: false,
      micPermanentlyDenied: true,
      notificationsGranted: false,
      errorMessage: 'Microphone access requires a secure HTTPS connection. Please access DayLedger via HTTPS.',
    };
  }

  let micGranted = false;
  let micPermanentlyDenied = false;
  let notifGranted = false;

  // 1. Request Microphone
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    micGranted = true;
  } catch (err: any) {
    const isDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
    micGranted = false;
    micPermanentlyDenied = isDenied;
  }

  // 2. Request Notifications (Browser PushManager / Notification)
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const res = await Notification.requestPermission();
      notifGranted = res === 'granted';
    } catch {
      notifGranted = false;
    }
  }

  if (micGranted) {
    setCallingSetupState('completed');
  }

  return {
    micGranted,
    micPermanentlyDenied,
    notificationsGranted: notifGranted,
    errorMessage: micGranted ? undefined : 'Microphone permission is required to speak on audio calls.',
  };
}

/**
 * Open Android system app settings
 */
export async function openDayLedgerAppSettings(): Promise<void> {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    await MicrophonePermission.openAppSettings();
  }
}

// ==================== WEBRTC & WI-FI CONNECTION DIAGNOSTICS ====================

export interface IceCandidateDiagnostic {
  type: 'host' | 'srflx' | 'relay' | 'unknown';
  protocol: 'udp' | 'tcp' | 'unknown';
  maskedAddress: string;
}

export interface WebRtcDiagnosticReport {
  timestamp: number;
  isSecureContext: boolean;
  turnConfigured: boolean;
  iceServerCount: number;
  stunServers: string[];
  turnServers: string[];
  candidatesFound: IceCandidateDiagnostic[];
  candidateTypes: {
    hasHost: boolean;
    hasSrflx: boolean;
    hasRelay: boolean;
  };
  wifiAssessment: {
    status: 'optimal' | 'standard' | 'warning' | 'error';
    summary: string;
    description: string;
    recommendation: string;
  };
}

/**
 * Safe, privacy-preserving WebRTC and Wi-Fi connection diagnostics.
 * Inspects ICE/TURN server availability and performs a transient local candidate gathering test.
 * Masks all IP addresses to prevent leakage.
 */
export async function runWebRtcDiagnostics(): Promise<WebRtcDiagnosticReport> {
  const isSecure = typeof window !== 'undefined' ? (window.isSecureContext ?? true) : true;

  let iceConfig: IceServerConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
    turnConfigured: false,
  };

  try {
    iceConfig = await apiGetIceServers();
  } catch (e) {
    console.warn('[Diagnostics] Failed to load server ICE configuration:', e);
  }

  const stunUrls: string[] = [];
  const turnUrls: string[] = [];

  iceConfig.iceServers.forEach((server) => {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
    urls.forEach((url) => {
      if (url.startsWith('stun:')) stunUrls.push(url);
      else if (url.startsWith('turn:') || url.startsWith('turns:')) turnUrls.push(url);
    });
  });

  const candidates: IceCandidateDiagnostic[] = [];
  const candidateTypes = {
    hasHost: false,
    hasSrflx: false,
    hasRelay: false,
  };

  // Perform quick transient ICE gathering test (max 2500ms)
  if (typeof window !== 'undefined' && 'RTCPeerConnection' in window) {
    try {
      const pc = new RTCPeerConnection({
        iceServers: iceConfig.iceServers,
        iceCandidatePoolSize: 1,
      });

      await new Promise<void>((resolve) => {
        let isDone = false;
        const done = () => {
          if (!isDone) {
            isDone = true;
            resolve();
          }
        };

        const timeoutId = setTimeout(done, 2500);

        pc.onicecandidate = (event) => {
          if (!event.candidate) {
            clearTimeout(timeoutId);
            done();
            return;
          }

          const cand = event.candidate;
          const type = cand.type as 'host' | 'srflx' | 'relay';
          const proto = (cand.protocol?.toLowerCase() || 'unknown') as 'udp' | 'tcp' | 'unknown';

          if (type === 'host') candidateTypes.hasHost = true;
          if (type === 'srflx') candidateTypes.hasSrflx = true;
          if (type === 'relay') candidateTypes.hasRelay = true;

          // Mask IP address safely: preserve type & port, mask IP
          const masked = `${type}:${proto}:[masked]`;
          candidates.push({
            type: type || 'unknown',
            protocol: proto,
            maskedAddress: masked,
          });
        };

        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') {
            clearTimeout(timeoutId);
            done();
          }
        };

        // Trigger gathering with a dummy data channel and offer
        try {
          pc.createDataChannel('diag');
          pc.createOffer().then((offer) => pc.setLocalDescription(offer)).catch(() => done());
        } catch {
          done();
        }
      });

      pc.close();
    } catch (e) {
      console.warn('[Diagnostics] ICE test encountered error:', e);
    }
  }

  // Assess Wi-Fi / NAT Traversal Status
  let status: 'optimal' | 'standard' | 'warning' | 'error' = 'standard';
  let summary = '';
  let description = '';
  let recommendation = '';

  if (iceConfig.turnConfigured && candidateTypes.hasRelay) {
    status = 'optimal';
    summary = 'TURN Relay Active (High-Reliability Wi-Fi Traversal)';
    description =
      'Relay candidates gathered successfully. Calls will connect across strict Wi-Fi, Symmetric NAT, and cellular firewalls.';
    recommendation = 'Network setup is optimal. Encrypted audio will route seamlessly on any internet connection.';
  } else if (candidateTypes.hasSrflx) {
    status = 'standard';
    summary = 'STUN NAT Traversal Active (Standard Home & Public Wi-Fi)';
    description =
      'STUN discovered public reflexive candidates. P2P direct audio works smoothly on open Wi-Fi and residential routers.';
    recommendation =
      'For 100% traversal on enterprise, college campus, or symmetric hotel Wi-Fi, configure Coturn/TURN in Render environment variables.';
  } else if (candidateTypes.hasHost) {
    status = 'warning';
    summary = 'Local Network Host Candidates Only (STUN Pending/Filtered)';
    description =
      'Only local host candidates were gathered during the test. Your current Wi-Fi network may filter outgoing UDP packets or have strict firewall rules.';
    recommendation =
      'If calls fail to connect on this Wi-Fi, switch to mobile data or configure TURN relay server in Render (TURN_URL and TURN_SECRET).';
  } else {
    status = 'error';
    summary = 'WebRTC ICE Candidate Gathering Incomplete';
    description = 'Unable to gather ICE candidates. Check internet connectivity and WebRTC permissions.';
    recommendation = 'Verify your internet connection and ensure your browser or device firewall allows WebRTC.';
  }

  return {
    timestamp: Date.now(),
    isSecureContext: isSecure,
    turnConfigured: Boolean(iceConfig.turnConfigured),
    iceServerCount: iceConfig.iceServers.length,
    stunServers: stunUrls,
    turnServers: turnUrls,
    candidatesFound: candidates,
    candidateTypes,
    wifiAssessment: {
      status,
      summary,
      description,
      recommendation,
    },
  };
}

/**
 * Checks full-screen intent permission on Android 14+ (API 34+)
 */
export async function checkFullScreenIntentPermission(): Promise<FullScreenIntentStatus> {
  return NativeCall.checkFullScreenIntentPermission();
}

/**
 * Opens Android settings for full-screen intent permission on Android 14+
 */
export async function openFullScreenIntentSettings(): Promise<void> {
  return NativeCall.openFullScreenIntentSettings();
}
