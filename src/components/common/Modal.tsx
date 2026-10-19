import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md',
  showCloseButton = true,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-zinc-900/40 backdrop-blur-[2px] transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        className={`relative w-full ${maxWidthStyles[maxWidth]} bg-white rounded-t-3xl sm:rounded-2xl border border-zinc-200/90 shadow-popover z-10 animate-pop-in flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-hidden`}
        role="dialog"
        aria-modal="true"
      >
        {/* Mobile Pull Handle */}
        <div className="sm:hidden w-10 h-1 bg-zinc-300 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

        {(title || showCloseButton) && (
          <div className="flex items-start justify-between px-5 sm:px-6 pt-2.5 sm:pt-5 pb-3 sm:pb-4 border-b border-zinc-100 shrink-0">
            <div className="min-w-0 pr-2">
              {title && (
                <h3 className="text-sm sm:text-base font-bold text-zinc-900 tracking-tight truncate">
                  {title}
                </h3>
              )}
              {subtitle && <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{subtitle}</p>}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 p-2 sm:p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain safe-area-pb">
          {children}
        </div>
      </div>
    </div>
  );
};
