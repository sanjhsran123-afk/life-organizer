/**
 * Compatibility wrapper re-exporting calling permissions and settings helpers.
 */
export {
  MicrophonePermission,
  type MicrophonePermissionPlugin,
  type PermissionResult,
  type CallingPermissionsStatus,
  type CallingSetupState,
  getCallingSetupState,
  setCallingSetupState,
  isCallingSetupCompleted,
  isCallingSetupDismissed,
  checkCallingPermissions,
  requestCallingPermissions,
  openDayLedgerAppSettings,
  runWebRtcDiagnostics,
  type WebRtcDiagnosticReport,
} from './callingPermissions';

import { checkCallingPermissions, requestCallingPermissions } from './callingPermissions';

export interface MicrophonePermissionStatus {
  granted: boolean;
  permanentlyDenied: boolean;
  errorMessage?: string;
}

/**
 * Checks and requests calling microphone permission
 */
export async function ensureMicrophonePermission(): Promise<MicrophonePermissionStatus> {
  const current = await checkCallingPermissions();
  if (current.micGranted) {
    return { granted: true, permanentlyDenied: false };
  }

  const result = await requestCallingPermissions();
  return {
    granted: result.micGranted,
    permanentlyDenied: result.micPermanentlyDenied,
    errorMessage: result.errorMessage,
  };
}
