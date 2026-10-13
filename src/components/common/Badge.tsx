import React from 'react';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'purple'
  | 'sky'
  | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'xs' | 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
  className = '',
}) => {
  const sizeStyles = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-1 font-medium tracking-tight',
    sm: 'text-xs px-2 py-0.5 gap-1.5 font-medium',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
  };

  const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
    default: {
      container: 'bg-zinc-100 text-zinc-700 border border-zinc-200/60',
      dot: 'bg-zinc-500',
    },
    neutral: {
      container: 'bg-stone-100 text-stone-600 border border-stone-200/50',
      dot: 'bg-stone-400',
    },
    primary: {
      container: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
      dot: 'bg-indigo-500',
    },
    success: {
      container: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
      dot: 'bg-emerald-500',
    },
    warning: {
      container: 'bg-amber-50 text-amber-800 border border-amber-200/70',
      dot: 'bg-amber-500',
    },
    danger: {
      container: 'bg-rose-50 text-rose-700 border border-rose-200/60',
      dot: 'bg-rose-500',
    },
    purple: {
      container: 'bg-purple-50 text-purple-700 border border-purple-200/60',
      dot: 'bg-purple-500',
    },
    sky: {
      container: 'bg-sky-50 text-sky-700 border border-sky-200/60',
      dot: 'bg-sky-500',
    },
  };

  return (
    <span
      className={`inline-flex items-center rounded-md ${sizeStyles[size]} ${variantStyles[variant].container} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${variantStyles[variant].dot}`} />}
      {children}
    </span>
  );
};
