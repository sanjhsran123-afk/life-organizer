import React from 'react';
import { getInitials } from '../../utils/formatters';

interface AvatarProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, size = 'md', className = '' }) => {
  const sizeStyles = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-xs',
    lg: 'w-11 h-11 text-sm font-semibold',
    xl: 'w-14 h-14 text-base font-semibold',
  };

  // Generate deterministic gentle pastel gradient based on name string
  const getGradient = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const gradients = [
      'from-blue-100 to-indigo-100 text-indigo-700 border-indigo-200/50',
      'from-emerald-100 to-teal-100 text-emerald-800 border-emerald-200/50',
      'from-amber-100 to-orange-100 text-amber-800 border-amber-200/50',
      'from-purple-100 to-pink-100 text-purple-800 border-purple-200/50',
      'from-rose-100 to-pink-100 text-rose-800 border-rose-200/50',
      'from-sky-100 to-cyan-100 text-sky-800 border-sky-200/50',
    ];
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  };

  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl bg-gradient-to-br border font-medium select-none shrink-0 ${
        sizeStyles[size]
      } ${getGradient(name || 'User')} ${className}`}
    >
      {getInitials(name)}
    </div>
  );
};
