import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PwaContextType {
  isInstalled: boolean;
  canPrompt: boolean;
  isIos: boolean;
  isIPhone: boolean;
  isSafari: boolean;
  isAndroid: boolean;
  isInstallModalOpen: boolean;
  openInstallModal: () => void;
  closeInstallModal: () => void;
  triggerInstall: () => Promise<void>;
}

const PwaContext = createContext<PwaContextType | undefined>(undefined);

function checkIsAppInstalled(): boolean {
  if (typeof window === 'undefined') return false;

  // Running inside Capacitor native Android/iOS shell
  if (Capacitor.isNativePlatform()) return true;

  // Running inside PWA standalone or fullscreen mode
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
  if (window.matchMedia('(display-mode: minimal-ui)').matches) return true;

  // iOS Safari standalone property
  if ((window.navigator as unknown as { standalone?: boolean }).standalone === true) {
    return true;
  }

  // Android TWA referrer
  if (document.referrer.startsWith('android-app://')) {
    return true;
  }

  return false;
}

export const PwaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => checkIsAppInstalled());
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  // Device & browser detection
  const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent.toLowerCase() : '';
  const isIPhone = /iphone/i.test(userAgent);
  const isIPad =
    /ipad/i.test(userAgent) ||
    (typeof navigator !== 'undefined' &&
      navigator.platform === 'MacIntel' &&
      navigator.maxTouchPoints > 1);
  const isIos = isIPhone || isIPad || /ipod/i.test(userAgent);
  const isSafari =
    /safari/i.test(userAgent) && !/crios|fxios|edgios|opios/i.test(userAgent);
  const isAndroid = /android/i.test(userAgent);

  useEffect(() => {
    // Initial check
    setIsInstalled(checkIsAppInstalled());

    // Listen for display-mode change (e.g. opened as installed PWA)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
      }
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    } else {
      mediaQuery.addListener(handleMediaChange);
    }

    // Intercept beforeinstallprompt for supported browsers
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // When app is installed successfully
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsInstallModalOpen(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } else {
        mediaQuery.removeListener(handleMediaChange);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const openInstallModal = useCallback(() => {
    setIsInstallModalOpen(true);
  }, []);

  const closeInstallModal = useCallback(() => {
    setIsInstallModalOpen(false);
  }, []);

  const triggerInstall = useCallback(async () => {
    // If already installed, nothing further to install
    if (isInstalled) {
      return;
    }

    // If native prompt is available (supported desktop & Android Chromium browsers)
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
        }
      } catch (error) {
        console.error('Failed to invoke browser install prompt:', error);
        setIsInstallModalOpen(true);
      }
      return;
    }

    // If prompt is not directly available (iPhone, iOS, or other browsers), show instructions modal
    setIsInstallModalOpen(true);
  }, [deferredPrompt, isInstalled]);

  const value: PwaContextType = {
    isInstalled,
    canPrompt: !!deferredPrompt,
    isIos,
    isIPhone,
    isSafari,
    isAndroid,
    isInstallModalOpen,
    openInstallModal,
    closeInstallModal,
    triggerInstall,
  };

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
};

export const usePwa = (): PwaContextType => {
  const context = useContext(PwaContext);
  if (!context) {
    throw new Error('usePwa must be used within a PwaProvider');
  }
  return context;
};
