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
      className={`bg-white rounded-2xl border border-zinc-200/70 shadow-xs transition-all duration-200 ${
        padded ? 'p-5' : ''
      } ${
        hoverEffect
          ? 'hover:border-zinc-300 hover:shadow-card hover:-translate-y-0.5 cursor-pointer'
          : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
