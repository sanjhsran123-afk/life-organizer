import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border border-dashed border-zinc-200/90 bg-white/60 ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-zinc-100/90 border border-zinc-200/60 flex items-center justify-center text-zinc-500 mb-3.5 shadow-2xs">
          {icon}
        </div>
      )}
      <h4 className="text-sm font-semibold text-zinc-900 tracking-tight">{title}</h4>
      <p className="text-xs text-zinc-500 max-w-sm mt-1 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
