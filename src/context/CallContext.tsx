import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { ActiveCall, CallStatus, IceServerConfig } from '../types';
import { connectSocket, getSocket } from '../utils/socket';
import { apiGetIceServers, getAuthToken } from '../api';
import {
  ensureMicrophonePermission,
  openDayLedgerAppSettings,
  isCallingSetupCompleted,
  checkCallingPermissions,
} from '../utils/microphonePermission';
import { CallingSetupModal } from '../components/friends/CallingSetupModal';

interface CallContextType {
  activeCall: ActiveCall | null;
  startCall: (peerId: string, peerName: string, peerAvatar: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  callError: string | null;
  clearCallError: () => void;
  isPermissionPermanentlyDenied: boolean;
  openAppSettings: () => Promise<void>;
  openCallingSetup: (targetFriend?: { id: string; name: string; avatar: string }) => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

// Web Audio API synthesized ringer and cadence tones (compatible with iOS PWA, Android, and Web)
class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private intervalId: any = null;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playIncomingRing() {
    this.stop();
    this.initCtx();
    const playChime = () => {
      if (!this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.1);
          gain.gain.setValueAtTime(0, now + i * 0.1);
          gain.gain.linearRampToValueAtTime(0.12, now + i * 0.1 + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.35);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + i * 0.1);
          osc.stop(now + i * 0.1 + 0.36);
        });
      } catch {}
    };

    playChime();
    this.intervalId = setInterval(playChime, 2200);
  }

  playOutgoingCadence() {
    this.stop();
    this.initCtx();
    const playCadence = () => {
      if (!this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        [440, 480].forEach((freq) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.06, now);
          gain.gain.setValueAtTime(0.06, now + 1.2);
          gain.gain.linearRampToValueAtTime(0.001, now + 1.25);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 1.25);
        });
      } catch {}
    };

    playCadence();
    this.intervalId = setInterval(playCadence, 3000);
  }

  playEndTone() {
    this.stop();
    this.initCtx();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.4);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch {}
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

const soundSynth = new SoundSynthesizer();

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [isPermissionPermanentlyDenied, setIsPermissionPermanentlyDenied] = useState<boolean>(false);

  // Calling setup modal states
  const [isSetupOpen, setIsSetupOpen] = useState<boolean>(false);
  const [setupTarget, setSetupTarget] = useState<{ id: string; name: string; avatar: string } | null>(null);
  const [setupForceDenied, setSetupForceDenied] = useState<boolean>(false);
  const [setupDeniedMessage, setSetupDeniedMessage] = useState<string>('');

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<any>(null);
  const pendingIceCandidates = useRef<RTCIceCandidateInit[]>([]);

  // Hidden audio element for remote stream playback
  useEffect(() => {
    const audio = document.createElement('audio');
    audio.autoplay = true;
    (audio as any).playsInline = true;
    remoteAudioRef.current = audio;
    document.body.appendChild(audio);

    return () => {
      audio.remove();
    };
  }, []);

  // Cleanup peer connection and media streams
  const cleanupMedia = useCallback(() => {
    soundSynth.stop();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    pendingIceCandidates.current = [];
  }, []);

  // Initialize RTCPeerConnection with secure ICE servers
  const initPeerConnection = async (targetUserId: string, callId: string) => {
    let iceConfig: IceServerConfig;
    try {
      iceConfig = await apiGetIceServers();
    } catch {
      iceConfig = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
        turnConfigured: false,
      };
    }

    const pc = new RTCPeerConnection({
      iceServers: iceConfig.iceServers,
      iceCandidatePoolSize: 2,
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = getSocket();
        socket?.emit('call:signal', {
          callId,
          targetUserId,
          signal: {
            type: 'candidate',
            candidate: event.candidate.toJSON(),
          },
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play().catch(() => {});
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        soundSynth.stop();
        setActiveCall((prev) => (prev ? { ...prev, status: 'connected', startedAt: Date.now() } : null));

        // Start call duration timer
        if (!timerRef.current) {
          timerRef.current = setInterval(() => {
            setActiveCall((prev) => (prev ? { ...prev, duration: prev.duration + 1 } : null));
          }, 1000);
        }
      } else if (state === 'connecting') {
        setActiveCall((prev) => (prev ? { ...prev, status: 'connecting' } : null));
      } else if (state === 'disconnected') {
        setActiveCall((prev) => (prev ? { ...prev, status: 'reconnecting' } : null));
        // Attempt ICE restart
        pc.restartIce();
      } else if (state === 'failed' || state === 'closed') {
        soundSynth.playEndTone();
        cleanupMedia();
        setActiveCall(null);
      }
    };

    pcRef.current = pc;
    return pc;
  };

  // Acquire local microphone with echo cancellation
  const getMicrophoneStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      localStreamRef.current = stream;
      return stream;
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('Microphone permission was denied. Please allow microphone access to make audio calls.');
      }
      throw new Error(`Unable to access microphone: ${err.message || 'Device error'}`);
    }
  };

  // Socket signaling listener
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const socket = connectSocket(token);

    // Incoming Call
    const handleIncomingCall = ({ callId, callerId, callerName, callerAvatar }: any) => {
      // If already in a call, decline automatically with busy reason
      if (activeCall) {
        socket.emit('call:decline', { callId, callerId, reason: 'busy' });
        return;
      }

      soundSynth.playIncomingRing();
      setActiveCall({
        callId,
        peerId: callerId,
        peerName: callerName,
        peerAvatar: callerAvatar,
        isIncoming: true,
        isMuted: false,
        status: 'incoming_ringing',
        duration: 0,
      });
    };

    // Caller receives acceptance from callee
    const handleCallAccepted = async ({ callId, responderId }: any) => {
      soundSynth.stop();
      try {
        const pc = await initPeerConnection(responderId, callId);
        const stream = await getMicrophoneStream();
        stream.getAudioTracks().forEach((track) => pc.addTrack(track, stream));

        // Create and send SDP Offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('call:signal', {
          callId,
          targetUserId: responderId,
          signal: { type: 'offer', sdp: offer.sdp },
        });

        setActiveCall((prev) => (prev ? { ...prev, status: 'connecting' } : null));
      } catch (err: any) {
        setCallError(err.message || 'Call initialization failed');
        cleanupMedia();
        setActiveCall(null);
      }
    };

    // Call declined by peer
    const handleCallDeclined = ({ reason }: any) => {
      soundSynth.playEndTone();
      cleanupMedia();
      setActiveCall(null);
      setCallError(reason === 'busy' ? 'Friend is currently busy on another call.' : 'Call was declined.');
    };

    // Peer ended call
    const handleCallEnded = () => {
      soundSynth.playEndTone();
      cleanupMedia();
      setActiveCall(null);
    };

    // Peer unavailable / offline
    const handleCallUnavailable = ({ message }: any) => {
      soundSynth.stop();
      cleanupMedia();
      setActiveCall(null);
      setCallError(message || 'Friend is offline. Both users must have the app open.');
    };

    // General Call Error
    const handleCallError = ({ error }: any) => {
      soundSynth.stop();
      cleanupMedia();
      setActiveCall(null);
      setCallError(error || 'Call failed');
    };

    // WebRTC Signaling Relay (Offer, Answer, ICE Candidates)
    const handleCallSignal = async ({ callId, senderId, signal }: any) => {
      const pc = pcRef.current;

      try {
        if (signal.type === 'offer') {
          // Callee receives SDP offer
          await pc?.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.sdp }));

          // Flush queued ICE candidates
          while (pendingIceCandidates.current.length > 0) {
            const cand = pendingIceCandidates.current.shift();
            if (cand && pc) await pc.addIceCandidate(new RTCIceCandidate(cand));
          }

          if (pc) {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit('call:signal', {
              callId,
              targetUserId: senderId,
              signal: { type: 'answer', sdp: answer.sdp },
            });
          }
        } else if (signal.type === 'answer') {
          // Caller receives SDP answer
          await pc?.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.sdp }));

          // Flush queued candidates
          while (pendingIceCandidates.current.length > 0) {
            const cand = pendingIceCandidates.current.shift();
            if (cand && pc) await pc.addIceCandidate(new RTCIceCandidate(cand));
          }
        } else if (signal.type === 'candidate' && signal.candidate) {
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } else {
            pendingIceCandidates.current.push(signal.candidate);
          }
        }
      } catch (err: any) {
        console.error('Signaling processing error:', err.message);
      }
    };

    socket.on('call:incoming', handleIncomingCall);
    socket.on('call:accepted', handleCallAccepted);
    socket.on('call:declined', handleCallDeclined);
    socket.on('call:ended', handleCallEnded);
    socket.on('call:unavailable', handleCallUnavailable);
    socket.on('call:error', handleCallError);
    socket.on('call:signal', handleCallSignal);

    return () => {
      socket.off('call:incoming', handleIncomingCall);
      socket.off('call:accepted', handleCallAccepted);
      socket.off('call:declined', handleCallDeclined);
      socket.off('call:ended', handleCallEnded);
      socket.off('call:unavailable', handleCallUnavailable);
      socket.off('call:error', handleCallError);
      socket.off('call:signal', handleCallSignal);
    };
  }, [activeCall, cleanupMedia]);

  // Core call initiator once permissions and setup are verified
  const executeCall = async (peerId: string, peerName: string, peerAvatar: string) => {
    setCallError(null);
    setIsPermissionPermanentlyDenied(false);
    const token = getAuthToken();
    if (!token) {
      setCallError('Authentication required to start a call.');
      return;
    }

    try {
      // Test and acquire local microphone stream
      await getMicrophoneStream();
    } catch (err: any) {
      setCallError(err.message || 'Microphone access required');
      setIsSetupOpen(true);
      setSetupForceDenied(true);
      setSetupDeniedMessage(
        err.message || 'Microphone access was denied. Please allow microphone permission in settings.'
      );
      return;
    }

    const socket = connectSocket(token);
    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    soundSynth.playOutgoingCadence();
    setActiveCall({
      callId,
      peerId,
      peerName,
      peerAvatar,
      isIncoming: false,
      isMuted: false,
      status: 'outgoing_ringing',
      duration: 0,
    });

    socket.emit('call:initiate', { callId, recipientId: peerId });
  };

  // Initiate Outgoing Call - Gates on calling setup
  const startCall = async (peerId: string, peerName: string, peerAvatar: string) => {
    setCallError(null);
    setIsPermissionPermanentlyDenied(false);

    const isSetup = isCallingSetupCompleted();
    const permStatus = await checkCallingPermissions();

    // If calling has not been set up or microphone is not granted, present the one-time setup screen
    if (!isSetup || !permStatus.micGranted) {
      setSetupTarget({ id: peerId, name: peerName, avatar: peerAvatar });
      setSetupForceDenied(permStatus.micPermanentlyDenied);
      setSetupDeniedMessage(
        permStatus.micPermanentlyDenied
          ? 'Microphone access is needed for audio calls, but permission was permanently denied. Please tap "Open Android Settings" below or unblock in browser settings.'
          : ''
      );
      setIsSetupOpen(true);
      return;
    }

    // Permission setup is complete: start ringing friend immediately without another microphone prompt
    await executeCall(peerId, peerName, peerAvatar);
  };

  // Accept Incoming Call - Recipient must choose to answer
  const acceptCall = async () => {
    if (!activeCall) return;
    soundSynth.stop();

    const permStatus = await checkCallingPermissions();
    if (!permStatus.micGranted) {
      setSetupTarget({ id: activeCall.peerId, name: activeCall.peerName, avatar: activeCall.peerAvatar });
      setSetupForceDenied(permStatus.micPermanentlyDenied);
      setSetupDeniedMessage(
        permStatus.micPermanentlyDenied
          ? 'Microphone access is needed to accept calls, but permission was permanently denied. Please enable Microphone in settings.'
          : 'Microphone access is needed to accept audio calls. Please allow permission.'
      );
      setIsSetupOpen(true);
      return;
    }

    try {
      const pc = await initPeerConnection(activeCall.peerId, activeCall.callId);
      const stream = await getMicrophoneStream();
      stream.getAudioTracks().forEach((track) => pc.addTrack(track, stream));

      const socket = getSocket();
      socket?.emit('call:accept', {
        callId: activeCall.callId,
        callerId: activeCall.peerId,
      });

      setActiveCall((prev) => (prev ? { ...prev, status: 'connecting' } : null));
    } catch (err: any) {
      setCallError(err.message || 'Failed to accept call');
      declineCall();
    }
  };

  // Decline Incoming Call
  const declineCall = () => {
    if (!activeCall) return;
    soundSynth.stop();

    const socket = getSocket();
    socket?.emit('call:decline', {
      callId: activeCall.callId,
      callerId: activeCall.peerId,
      reason: 'declined',
    });

    cleanupMedia();
    setActiveCall(null);
  };

  // End Active or Outgoing Call
  const endCall = () => {
    if (!activeCall) return;
    soundSynth.playEndTone();

    const socket = getSocket();
    socket?.emit('call:end', {
      callId: activeCall.callId,
      targetUserId: activeCall.peerId,
    });

    cleanupMedia();
    setActiveCall(null);
  };

  // Toggle Microphone Mute
  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setActiveCall((prev) => (prev ? { ...prev, isMuted: !audioTrack.enabled } : null));
    }
  };

  const clearCallError = () => {
    setCallError(null);
    setIsPermissionPermanentlyDenied(false);
  };

  const openCallingSetup = (targetFriend?: { id: string; name: string; avatar: string }) => {
    if (targetFriend) setSetupTarget(targetFriend);
    setSetupForceDenied(false);
    setSetupDeniedMessage('');
    setIsSetupOpen(true);
  };

  const handleSetupSuccess = async () => {
    setIsSetupOpen(false);
    if (setupTarget) {
      const target = setupTarget;
      setSetupTarget(null);
      if (activeCall && activeCall.status === 'incoming_ringing') {
        await acceptCall();
      } else {
        await executeCall(target.id, target.name, target.avatar);
      }
    }
  };

  return (
    <CallContext.Provider
      value={{
        activeCall,
        startCall,
        acceptCall,
        declineCall,
        endCall,
        toggleMute,
        callError,
        clearCallError,
        isPermissionPermanentlyDenied,
        openAppSettings: openDayLedgerAppSettings,
        openCallingSetup,
      }}
    >
      {children}

      <CallingSetupModal
        isOpen={isSetupOpen}
        onClose={() => {
          setIsSetupOpen(false);
          setSetupTarget(null);
        }}
        onSetupSuccess={handleSetupSuccess}
        targetFriendName={setupTarget?.name}
        forceDeniedMode={setupForceDenied}
        deniedErrorMessage={setupDeniedMessage}
      />
    </CallContext.Provider>
  );
};

export const useCall = (): CallContextType => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
