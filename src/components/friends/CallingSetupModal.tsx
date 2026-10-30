import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  Mic,
  Bell,
  ShieldCheck,
  Settings,
  AlertCircle,
  Wifi,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info,
  X,
  Share,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import {
  requestCallingPermissions,
  openDayLedgerAppSettings,
  setCallingSetupState,
  checkCallingPermissions,
  openFullScreenIntentSettings,
  runWebRtcDiagnostics,
  WebRtcDiagnosticReport,
} from '../../utils/callingPermissions';

interface CallingSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetupSuccess?: () => void;
  targetFriendName?: string;
  forceDeniedMode?: boolean;
  deniedErrorMessage?: string;
}

export const CallingSetupModal: React.FC<CallingSetupModalProps> = ({
  isOpen,
  onClose,
  onSetupSuccess,
  targetFriendName,
  forceDeniedMode = false,
  deniedErrorMessage,
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [isDenied, setIsDenied] = useState(forceDeniedMode);
  const [errorMessage, setErrorMessage] = useState(deniedErrorMessage || '');
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagReport, setDiagReport] = useState<WebRtcDiagnosticReport | null>(null);

  const [fullScreenStatus, setFullScreenStatus] = useState<{ isSupported: boolean; granted: boolean }>({
    isSupported: false,
    granted: true,
  });

  const isNative = Capacitor.isNativePlatform();
  const isAndroid = isNative && Capacitor.getPlatform() === 'android';
  const isHttps = typeof window !== 'undefined' ? (window.isSecureContext ?? true) : true;
  const isIos = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);
  const isStandalone = typeof window !== 'undefined' && (
    ('standalone' in window.navigator && Boolean((window.navigator as any).standalone)) ||
    window.matchMedia('(display-mode: standalone)').matches
  );

  useEffect(() => {
    if (isAndroid) {
      checkCallingPermissions().then((status) => {
        if (status.fullScreenIntentSupported !== undefined) {
          setFullScreenStatus({
            isSupported: Boolean(status.fullScreenIntentSupported),
            granted: Boolean(status.fullScreenIntentGranted),
          });
        }
      }).catch(() => {});
    }
  }, [isAndroid]);

  useEffect(() => {
    if (forceDeniedMode) {
      setIsDenied(true);
      if (deniedErrorMessage) setErrorMessage(deniedErrorMessage);
    } else {
      setIsDenied(false);
      setErrorMessage('');
    }
  }, [forceDeniedMode, deniedErrorMessage]);

  if (!isOpen) return null;

  const handleEnableCalling = async () => {
    setIsRequesting(true);
    setErrorMessage('');

    try {
      const result = await requestCallingPermissions();

      if (result.micGranted) {
        setIsDenied(false);
        setCallingSetupState('completed');
        if (onSetupSuccess) {
          onSetupSuccess();
        } else {
          onClose();
        }
      } else {
        setIsDenied(true);
        setErrorMessage(
          result.errorMessage ||
            (result.micPermanentlyDenied
              ? 'Microphone permission was denied. Please allow microphone access in your device settings to make or receive audio calls.'
              : 'Microphone access is needed for audio calls. Please allow permission to proceed.')
        );
      }
    } catch (err: any) {
      setIsDenied(true);
      setErrorMessage(err?.message || 'Unable to request permissions. Please check settings.');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleNotNow = () => {
    setCallingSetupState('skipped');
    onClose();
  };

  const handleOpenDiagnostics = async () => {
    setShowDiagnostics(true);
    setDiagLoading(true);
    try {
      const report = await runWebRtcDiagnostics();
      setDiagReport(report);
    } catch {
      // Diagnostics handled
    } finally {
      setDiagLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 sm:p-8 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Glow Ambient Lights */}
        <div className="absolute -top-24 -left-24 w-52 h-52 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-52 h-52 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors z-20 cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
            <PhoneCall className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {isDenied ? 'Microphone Permission Needed' : 'Set Up Audio Calling'}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {targetFriendName
                ? `Prepare your device to call ${targetFriendName}`
                : 'Private, end-to-end internet audio calls on DayLedger'}
            </p>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {!isDenied ? (
            <>
              {/* Permission requirement explanations */}
              <div className="space-y-3">
                {/* 1. Microphone Access */}
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        Microphone Access
                      </h4>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                        Required for Audio
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">
                      Needed so your friends can hear your voice. Includes hardware echo cancellation and noise suppression. The microphone is only active while an audio call is in progress.
                    </p>
                  </div>
                </div>

                {/* 2. Notification Access */}
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        Notification Access
                      </h4>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                        {isAndroid ? 'Background Ringing' : 'Incoming Call Alerts'}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">
                      {isAndroid
                        ? 'Allows DayLedger to ring your phone and alert you of incoming calls even when your phone is locked or the app is closed in the background.'
                        : isIos
                        ? 'Sends Lock Screen notifications for incoming calls when installed as a Home Screen PWA. Tapping the notification opens DayLedger to answer the call (note: iOS PWAs do not support native CallKit).'
                        : 'Alerts you of incoming calls when browsing other browser tabs or when DayLedger is running in the background.'}
                    </p>
                  </div>
                </div>

                {/* iPhone Home Screen PWA Tip */}
                {isIos && !isStandalone && !isAndroid && (
                  <div className="p-3.5 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0">
                      <Share className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          Add to iPhone Home Screen
                        </h4>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                          Recommended
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">
                        To receive incoming call alerts when your iPhone screen is locked, tap <strong>Share</strong> (⎋ / <span className="inline-block font-bold">↥</span>) in Safari and tap <strong>Add to Home Screen</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {/* 3. Android 14+ Full-Screen Intent Access (when not yet granted) */}
                {isAndroid && fullScreenStatus.isSupported && !fullScreenStatus.granted && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 mt-0.5 shrink-0">
                      <PhoneCall className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          Full-Screen Lock Screen Calls
                        </h4>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-200/70 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                          Android 14+ Setup
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">
                        To display the incoming-call screen over your lock screen on Android 14+, allow full-screen intents for DayLedger.
                      </p>
                      <button
                        type="button"
                        onClick={openFullScreenIntentSettings}
                        className="mt-2.5 py-1.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Enable Lock Screen Calls</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Privacy and Security Guarantee */}
              <div className="p-3 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/40 border border-zinc-200/50 dark:border-zinc-700/50 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Privacy First Audio Calls</span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Audio calls only require microphone access. DayLedger never requests or accesses your camera, contacts, location, or storage files for audio calls.
                </p>
              </div>

              {!isHttps && !isAndroid && (
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 text-[11px] text-amber-800 dark:text-amber-200">
                  ⚠️ Note: Web browser microphone permission requires a secure HTTPS connection.
                </div>
              )}
            </>
          ) : (
            /* Permission Denied / Instructions Mode */
            <div className="space-y-3.5">
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed font-medium">
                  {errorMessage ||
                    'Microphone access was denied. Audio calls require microphone permission so you and your friends can speak.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 space-y-3">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-indigo-500" />
                  <span>How to Enable Microphone Permission:</span>
                </h4>

                {isAndroid ? (
                  <ol className="text-xs text-zinc-600 dark:text-zinc-300 space-y-2 list-decimal list-inside leading-relaxed">
                    <li>Tap the <strong>Open Android Settings</strong> button below.</li>
                    <li>Tap <strong>Permissions</strong> in the app info screen.</li>
                    <li>Tap <strong>Microphone</strong> and select <strong>&quot;Allow only while using the app&quot;</strong>.</li>
                    <li>Tap <strong>Notifications</strong> and make sure <strong>&quot;Allow notifications&quot;</strong> is switched on.</li>
                    <li>Return to DayLedger and tap Call again!</li>
                  </ol>
                ) : isIos ? (
                  <ol className="text-xs text-zinc-600 dark:text-zinc-300 space-y-2 list-decimal list-inside leading-relaxed">
                    <li>Open <strong>Settings</strong> on your iPhone.</li>
                    <li>Scroll down and tap <strong>Safari</strong> (or <strong>DayLedger</strong> if installed to Home Screen).</li>
                    <li>Tap <strong>Microphone</strong> and set it to <strong>Allow</strong>.</li>
                    <li>Tap <strong>Notifications</strong> and ensure <strong>Allow Notifications</strong> is enabled.</li>
                    <li>Return to DayLedger and tap &quot;Try Again&quot; below.</li>
                  </ol>
                ) : (
                  <ol className="text-xs text-zinc-600 dark:text-zinc-300 space-y-2 list-decimal list-inside leading-relaxed">
                    <li>Look at your browser address bar at the top of the page.</li>
                    <li>
                      Click the <strong>Lock (🔒) or Site Settings (tune)</strong> icon directly beside the URL.
                    </li>
                    <li>
                      Find <strong>Microphone</strong> and switch it to <strong>Allow</strong>.
                    </li>
                    <li>
                      Find <strong>Notifications</strong> and switch it to <strong>Allow</strong>.
                    </li>
                    <li>Reload the page or tap &quot;Try Again&quot; below.</li>
                  </ol>
                )}
              </div>

              {isAndroid && (
                <button
                  type="button"
                  onClick={openDayLedgerAppSettings}
                  className="w-full py-3 px-4 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-xs flex items-center justify-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer shadow-md transition-all active:scale-95"
                >
                  <Settings className="w-4 h-4" />
                  <span>Open Android Settings</span>
                </button>
              )}
            </div>
          )}

          {/* Wi-Fi & WebRTC Diagnostics Panel */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
            {!showDiagnostics ? (
              <button
                type="button"
                onClick={handleOpenDiagnostics}
                className="text-xs text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Wifi className="w-3.5 h-3.5" />
                <span>Wi-Fi &amp; Connection Diagnostics</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    <Wifi className="w-4 h-4 text-indigo-500" />
                    <span>Connection &amp; Wi-Fi Diagnostics</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenDiagnostics}
                    disabled={diagLoading}
                    className="p-1 rounded-lg text-zinc-400 hover:text-indigo-600 transition-colors cursor-pointer"
                    title="Re-run Diagnostics"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${diagLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {diagLoading ? (
                  <div className="py-4 text-center text-xs text-zinc-500 animate-pulse">
                    Testing STUN / TURN NAT traversal...
                  </div>
                ) : diagReport ? (
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                          Traversal Status:
                        </span>
                        <span
                          className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                            diagReport.wifiAssessment.status === 'optimal'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : diagReport.wifiAssessment.status === 'standard'
                              ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {diagReport.wifiAssessment.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">
                        {diagReport.wifiAssessment.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800/70">
                        <span className="text-zinc-400">TURN Relay:</span>
                        <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {diagReport.turnConfigured ? 'Configured' : 'Not Set (STUN Only)'}
                        </p>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800/70">
                        <span className="text-zinc-400">NAT Candidates:</span>
                        <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {diagReport.candidateTypes.hasRelay
                            ? 'Host + Srflx + Relay'
                            : diagReport.candidateTypes.hasSrflx
                            ? 'Host + Srflx (STUN)'
                            : 'Host only'}
                        </p>
                      </div>
                    </div>

                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 italic">
                      {diagReport.wifiAssessment.recommendation}
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-3 shrink-0">
          {!isDenied ? (
            <>
              <button
                type="button"
                onClick={handleNotNow}
                disabled={isRequesting}
                className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={handleEnableCalling}
                disabled={isRequesting}
                className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                {isRequesting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Requesting...</span>
                  </>
                ) : (
                  <>
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Enable calling</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEnableCalling}
                disabled={isRequesting}
                className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRequesting ? 'animate-spin' : ''}`} />
                <span>Try Again</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
