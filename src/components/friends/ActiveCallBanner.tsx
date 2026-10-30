import React from 'react';
import { useCall } from '../../context/CallContext';
import { Avatar } from '../common/Avatar';
import {
  Mic,
  MicOff,
  PhoneOff,
  Maximize2,
  Radio,
  Wifi,
} from 'lucide-react';

export const ActiveCallBanner: React.FC = () => {
  const { activeCall, toggleMute, endCall, maximizeCall } = useCall();

  if (!activeCall) return null;

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isConnected = activeCall.status === 'connected';
  const isConnecting = activeCall.status === 'connecting';
  const isOutgoing = activeCall.status === 'outgoing_ringing';
  const isReconnecting = activeCall.status === 'reconnecting';

  return (
    <div
      role="region"
      aria-label="Active Call Banner"
      className="fixed top-3 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-40 w-auto sm:w-[460px] p-2.5 sm:p-3 rounded-2xl bg-zinc-900/95 dark:bg-zinc-900/95 text-white border border-zinc-700/80 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 animate-slide-down"
    >
      {/* Tap target to maximize call */}
      <button
        type="button"
        onClick={maximizeCall}
        className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer group"
        title="Tap to return to call screen"
      >
        <div className="relative shrink-0">
          <Avatar name={activeCall.peerName} size="sm" className="w-9 h-9 ring-2 ring-emerald-500/60" />
          {isConnected && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-900" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-zinc-100 truncate group-hover:text-indigo-400 transition-colors">
              {activeCall.peerName}
            </h4>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-semibold">
              Call Active
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-0.5">
            {isConnected && (
              <span className="font-mono text-emerald-400 font-semibold tracking-wider">
                {formatDuration(activeCall.duration)}
              </span>
            )}
            {isOutgoing && (
              <span className="text-indigo-400 flex items-center gap-1 animate-pulse">
                <Radio className="w-3 h-3" /> Calling...
              </span>
            )}
            {isConnecting && (
              <span className="text-amber-400 flex items-center gap-1">
                <Wifi className="w-3 h-3 animate-spin" /> Connecting...
              </span>
            )}
            {isReconnecting && (
              <span className="text-rose-400 animate-pulse">
                Reconnecting...
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Control Buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Mute button */}
        {isConnected && (
          <button
            type="button"
            onClick={toggleMute}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              activeCall.isMuted
                ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
            title={activeCall.isMuted ? 'Unmute microphone' : 'Mute microphone'}
            aria-label={activeCall.isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {activeCall.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        )}

        {/* Maximize icon button */}
        <button
          type="button"
          onClick={maximizeCall}
          className="p-2 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all cursor-pointer"
          title="Full call screen"
          aria-label="Full call screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* End call button */}
        <button
          type="button"
          onClick={endCall}
          className="p-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30 transition-all cursor-pointer active:scale-95"
          title="End Call"
          aria-label="End Call"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
