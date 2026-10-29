import { Capacitor, registerPlugin, PluginListenerHandle } from '@capacitor/core';

export interface PendingCallAction {
  hasPendingAction: boolean;
  action?: 'answer' | 'decline';
  callId?: string;
  callerId?: string;
  callerName?: string;
  callerAvatar?: string;
}

export interface FullScreenIntentStatus {
  isSupported: boolean;
  granted: boolean;
}

export interface NativeCallPluginInterface {
  getPendingCallAction(): Promise<PendingCallAction>;
  clearPendingCallAction(): Promise<void>;
  dismissActiveCall(options: { callId: string }): Promise<void>;
  checkFullScreenIntentPermission(): Promise<FullScreenIntentStatus>;
  openFullScreenIntentSettings(): Promise<void>;
  addListener(
    eventName: 'callAnswered',
    listenerFunc: (info: { action: string; callId: string; callerId: string; callerName: string; callerAvatar?: string }) => void
  ): Promise<PluginListenerHandle>;
}

export const NativeCall = registerPlugin<NativeCallPluginInterface>('NativeCall', {
  web: () => ({
    async getPendingCallAction(): Promise<PendingCallAction> {
      return { hasPendingAction: false };
    },
    async clearPendingCallAction(): Promise<void> {},
    async dismissActiveCall(_options: { callId: string }): Promise<void> {},
    async checkFullScreenIntentPermission(): Promise<FullScreenIntentStatus> {
      return { isSupported: false, granted: true };
    },
    async openFullScreenIntentSettings(): Promise<void> {},
    async addListener(): Promise<PluginListenerHandle> {
      return {
        remove: async () => {},
      };
    },
  }),
});

export const isNativeAndroid = (): boolean => {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
};
