import React from 'react';
import { useCall } from '../../context/CallContext';
import { Avatar } from '../common/Avatar';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Radio,
  Wifi,
  Sparkles,
  ShieldCheck,
  X,
  Settings,
} from 'lucide-react';

export const CallModal: React.FC = () => {
  const {
    activeCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    callError,
    clearCallError,
    isPermissionPermanentlyDenied,
    openAppSettings,
    openCallingSetup,
  } = useCall();

  if (callError && !activeCall) {
    return (
      <div className="fixed inset-x-4 top-20 z-50 max-w-md mx-auto p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 shadow-xl flex items-start justify-between gap-3 animate-slide-down">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300">
            <PhoneOff className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-rose-900 dark:text-rose-100">Microphone Required</h4>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5 leading-relaxed">
              {callError}
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  clearCallError();
                  openCallingSetup();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Set Up Calling</span>
              </button>
              {isPermissionPermanentlyDenied && (
                <button
                  type="button"
                  onClick={openAppSettings}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Open Settings</span>
                </button>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={clearCallError}
          className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-200 p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (!activeCall) return null;

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isIncoming = activeCall.status === 'incoming_ringing';
  const isOutgoing = activeCall.status === 'outgoing_ringing';
  const isConnecting = activeCall.status === 'connecting';
  const isConnected = activeCall.status === 'connected';
  const isReconnecting = activeCall.status === 'reconnecting';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 sm:p-8 flex flex-col items-center text-center overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Security / Quality Header */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-6">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Encrypted WebRTC Audio</span>
        </div>

        {/* Avatar with visual sound rings */}
        <div className="relative my-2">
          {isConnected && (
            <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping opacity-75" />
          )}
          {(isIncoming || isOutgoing) && (
            <div className="absolute -inset-2 rounded-full border-2 border-indigo-500/40 animate-pulse" />
          )}
          <Avatar name={activeCall.peerName} size="lg" className="w-24 h-24 text-3xl shadow-xl relative z-10" />
        </div>

        {/* Peer Name & Status */}
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-4">
          {activeCall.peerName}
        </h3>

        <div className="mt-1 flex items-center justify-center gap-2 text-xs">
          {isIncoming && (
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold animate-pulse flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5" /> Incoming Audio Call...
            </span>
          )}
          {isOutgoing && (
            <span className="text-zinc-500 dark:text-zinc-400 font-medium animate-pulse flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-indigo-500" /> Calling friend...
            </span>
          )}
          {isConnecting && (
            <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 animate-spin" /> Establishing stream...
            </span>
          )}
          {isConnected && (
            <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold text-sm tracking-widest bg-emerald-50 dark:bg-emerald-950/40 px-3 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
              {formatDuration(activeCall.duration)}
            </span>
          )}
          {isReconnecting && (
            <span className="text-rose-500 font-medium animate-pulse">
              Reconnecting audio...
            </span>
          )}
        </div>

        {/* Hardware Echo Cancellation / Audio Notice */}
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-4 max-w-xs leading-relaxed">
          {isConnected
            ? 'Audio echo cancellation & noise suppression active.'
            : isIncoming
            ? 'Tap Accept to connect live internet audio.'
            : 'Friend must have DayLedger open on their device to receive the call.'}
        </p>

        {/* Action Controls */}
        <div className="w-full mt-8 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-center gap-4">
          {isIncoming ? (
            <>
              {/* Decline Button */}
              <button
                onClick={declineCall}
                className="flex-1 py-3 px-4 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 cursor-pointer transition-all active:scale-95"
              >
                <PhoneOff className="w-4 h-4" />
                <span>Decline</span>
              </button>

              {/* Accept Button */}
              <button
                onClick={acceptCall}
                className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer transition-all active:scale-95"
              >
                <Phone className="w-4 h-4" />
                <span>Accept</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-4">
              {/* Mute Toggle */}
              {isConnected && (
                <button
                  onClick={toggleMute}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    activeCall.isMuted
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 border-amber-300 dark:border-amber-800'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                  }`}
                  title={activeCall.isMuted ? 'Unmute microphone' : 'Mute microphone'}
                  aria-label={activeCall.isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {activeCall.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              )}

              {/* End Call Button */}
              <button
                onClick={endCall}
                className="py-3 px-8 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 cursor-pointer transition-all active:scale-95"
              >
                <PhoneOff className="w-4 h-4" />
                <span>End Call</span>
              </button>
            </div>
          )}
        </div>

        {/* Background Calling Notice */}
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-4 leading-tight">
          Internet audio calls connect once answered. On the Android app, push notifications ring incoming calls even while your phone is locked. On the website, browser alerts ring while other tabs are open.
        </p>
      </div>
    </div>
  );
};
