import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 select-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

  const sizeStyles = {
    xs: 'text-xs px-2.5 py-1 min-h-[32px] sm:min-h-0 gap-1.5',
    sm: 'text-xs px-3 py-1.5 min-h-[38px] sm:min-h-[34px] gap-1.5 font-medium',
    md: 'text-sm px-3.5 py-2 min-h-[42px] sm:min-h-[38px] gap-2',
    lg: 'text-base px-4.5 py-2.5 min-h-[46px] gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-xs focus-visible:ring-indigo-500 border border-indigo-600/20 active:scale-[0.98]',
    secondary:
      'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/80 dark:hover:bg-zinc-700 active:bg-zinc-200 dark:active:bg-zinc-650 text-zinc-800 dark:text-zinc-200 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600 border border-zinc-200/60 dark:border-zinc-700/60 active:scale-[0.98]',
    outline:
      'bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 active:bg-zinc-100 dark:active:bg-zinc-750 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700 shadow-xs focus-visible:ring-zinc-300 dark:focus-visible:ring-zinc-600 active:scale-[0.98]',
    ghost:
      'bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200/60 dark:active:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 focus-visible:ring-zinc-300 dark:focus-visible:ring-zinc-600',
    danger:
      'bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 active:bg-rose-200/80 dark:active:bg-rose-900/70 text-rose-700 dark:text-rose-300 border border-rose-200/70 dark:border-rose-900/60 focus-visible:ring-rose-400 active:scale-[0.98]',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
          {children && <span>{children}</span>}
          {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
};
