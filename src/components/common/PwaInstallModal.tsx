import React from 'react';
import { usePwa } from '../../context/PwaContext';
import { Modal } from './Modal';
import { Button } from './Button';
import {
  Share,
  PlusSquare,
  Download,
  CheckCircle2,
  Smartphone,
  Laptop,
  Compass,
  Sparkles,
} from 'lucide-react';

export const PwaInstallModal: React.FC = () => {
  const {
    isInstallModalOpen,
    closeInstallModal,
    isInstalled,
    canPrompt,
    triggerInstall,
    isIPhone,
    isIos,
    isSafari,
    isAndroid,
  } = usePwa();

  if (!isInstallModalOpen) return null;

  return (
    <Modal
      isOpen={isInstallModalOpen}
      onClose={closeInstallModal}
      maxWidth="md"
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-2xs">
            <Download className="w-4 h-4" />
          </div>
          <span>Install DayLedger</span>
        </div>
      }
      subtitle="Install DayLedger on your device for fast access and offline capability"
    >
      <div className="space-y-5">
        {/* App Identity Banner */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80">
          <img
            src="/icons/icon-192.png"
            alt="DayLedger Icon"
            className="w-12 h-12 rounded-xl shadow-xs object-cover border border-zinc-200/60"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-bold text-zinc-900 tracking-tight">DayLedger</h4>
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md font-semibold">
                PWA
              </span>
            </div>
            <p className="text-xs text-zinc-500 truncate mt-0.5">
              Personal Tasks & Money Manager
            </p>
          </div>
          {isInstalled && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-1 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Installed
            </span>
          )}
        </div>

        {isInstalled ? (
          /* Already Installed Message */
          <div className="text-center py-4 space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-200">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-zinc-900">DayLedger is already installed!</h4>
            <p className="text-xs text-zinc-600 max-w-sm mx-auto leading-relaxed">
              DayLedger is running as an installed application. You can launch it directly from your
              Home Screen or app launcher with full offline caching.
            </p>
            <div className="pt-3">
              <Button variant="secondary" onClick={closeInstallModal} className="w-full">
                Close
              </Button>
            </div>
          </div>
        ) : isIPhone || isIos ? (
          /* iPhone / iOS Instructions */
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900">
              <Smartphone className="w-4 h-4 text-indigo-600" />
              <span>How to install on iPhone & iOS</span>
            </div>

            {!isSafari && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
                <Compass className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-semibold">Safari recommended:</span> If you are currently in
                  another browser (e.g., Chrome, Edge, or an in-app viewer), copy this link and open
                  it in <strong className="font-bold">Safari</strong> to install.
                </div>
              </div>
            )}

            <ol className="space-y-3">
              {/* Step 1 */}
              <li className="flex items-start gap-3 p-3 rounded-xl bg-white border border-zinc-200/70 shadow-2xs">
                <span className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-zinc-900">Open in Safari</p>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                    Make sure this website is open in <strong className="text-zinc-800">Safari</strong> on your iPhone.
                  </p>
                </div>
              </li>

              {/* Step 2 */}
              <li className="flex items-start gap-3 p-3 rounded-xl bg-white border border-zinc-200/70 shadow-2xs">
                <span className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
                    <span>Tap the Share button</span>
                    <span className="inline-flex items-center gap-1 bg-zinc-100 text-zinc-800 px-1.5 py-0.5 rounded text-[11px] font-mono border border-zinc-200">
                      <Share className="w-3 h-3 text-indigo-600" />
                      <span>Share</span>
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                    Find the Share icon in the bottom menu toolbar of Safari.
                  </p>
                </div>
              </li>

              {/* Step 3 */}
              <li className="flex items-start gap-3 p-3 rounded-xl bg-white border border-zinc-200/70 shadow-2xs">
                <span className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
                    <span>Choose “Add to Home Screen”</span>
                    <PlusSquare className="w-3.5 h-3.5 text-indigo-600" />
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                    Scroll down the share sheet and tap <strong className="text-zinc-800">Add to Home Screen</strong>.
                  </p>
                </div>
              </li>

              {/* Step 4 */}
              <li className="flex items-start gap-3 p-3 rounded-xl bg-white border border-zinc-200/70 shadow-2xs">
                <span className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  4
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-zinc-900">Confirm & Tap “Add”</p>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                    Optionally turn on <span className="font-medium text-zinc-700">Open as Web App</span> (iOS 17+), then tap <strong className="text-zinc-800">Add</strong> in the top right.
                  </p>
                </div>
              </li>
            </ol>

            <div className="pt-2">
              <Button variant="primary" onClick={closeInstallModal} className="w-full">
                Got it
              </Button>
            </div>
          </div>
        ) : (
          /* Android / Desktop / Other browsers */
          <div className="space-y-4">
            {canPrompt ? (
              <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white mx-auto flex items-center justify-center shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">Ready to Install</h4>
                  <p className="text-xs text-zinc-600 mt-1 max-w-sm mx-auto">
                    Click the button below to prompt your browser to install DayLedger on your
                    device.
                  </p>
                </div>
                <Button
                  variant="primary"
                  icon={<Download className="w-4 h-4" />}
                  onClick={triggerInstall}
                  className="w-full shadow-xs"
                >
                  Install DayLedger Now
                </Button>
              </div>
            ) : isAndroid ? (
              /* Android Manual Instructions */
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900">
                  <Smartphone className="w-4 h-4 text-indigo-600" />
                  <span>How to install on Android</span>
                </div>
                <ol className="space-y-2.5 text-xs text-zinc-600">
                  <li className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-zinc-200">
                    <span className="font-bold text-indigo-600">1.</span>
                    <span>Tap the menu button (<strong className="text-zinc-900">⋮</strong> three dots) in Chrome or your browser.</span>
                  </li>
                  <li className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-zinc-200">
                    <span className="font-bold text-indigo-600">2.</span>
                    <span>Select <strong className="text-zinc-900">Install app</strong> or <strong className="text-zinc-900">Add to Home screen</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-zinc-200">
                    <span className="font-bold text-indigo-600">3.</span>
                    <span>Tap <strong className="text-zinc-900">Install</strong> to confirm.</span>
                  </li>
                </ol>
              </div>
            ) : (
              /* Desktop Manual Instructions */
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900">
                  <Laptop className="w-4 h-4 text-indigo-600" />
                  <span>How to install on Desktop (Chrome, Edge, Brave)</span>
                </div>
                <ol className="space-y-2.5 text-xs text-zinc-600">
                  <li className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-zinc-200">
                    <span className="font-bold text-indigo-600">1.</span>
                    <span>Look for the <strong className="text-zinc-900">Install</strong> icon in the address bar (right side of URL bar).</span>
                  </li>
                  <li className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-zinc-200">
                    <span className="font-bold text-indigo-600">2.</span>
                    <span>Or click the browser menu (<strong className="text-zinc-900">⋮</strong>) and choose <strong className="text-zinc-900">Install DayLedger</strong>.</span>
                  </li>
                </ol>
              </div>
            )}

            <div className="pt-2">
              <Button variant="secondary" onClick={closeInstallModal} className="w-full">
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
