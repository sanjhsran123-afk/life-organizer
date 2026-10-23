import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverEffect?: boolean;
  padded?: boolean;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverEffect = false,
  padded = true,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 shadow-xs transition-all duration-200 ${
        padded ? 'p-5' : ''
      } ${
        hoverEffect
          ? 'hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-card hover:-translate-y-0.5 cursor-pointer'
          : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
