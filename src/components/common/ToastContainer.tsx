import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 flex flex-col gap-2 max-w-sm sm:w-full pointer-events-none">
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
          error: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />,
          warning: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />,
          info: <Info className="w-4 h-4 text-indigo-600 shrink-0" />,
        };

        const borders = {
          success: 'border-emerald-200/80 dark:border-emerald-900/60 bg-white dark:bg-zinc-900',
          error: 'border-rose-200/80 dark:border-rose-900/60 bg-white dark:bg-zinc-900',
          warning: 'border-amber-200/80 dark:border-amber-900/60 bg-white dark:bg-zinc-900',
          info: 'border-indigo-200/80 dark:border-indigo-900/60 bg-white dark:bg-zinc-900',
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-card animate-slide-down ${borders[toast.type]} transition-all duration-200`}
            role="status"
          >
            <div className="mt-0.5">{icons[toast.type]}</div>
            <div className="flex-1 min-w-0">
              {toast.title && <h5 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{toast.title}</h5>}
              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded transition-colors cursor-pointer"
              aria-label="Dismiss toast"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
