import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-zinc-700 mb-1.5">
            {label}
            {props.required && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            className={`w-full appearance-none bg-white border border-zinc-200/90 rounded-xl text-base sm:text-sm text-zinc-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all duration-150 pl-3.5 pr-9 py-2.5 sm:py-2 min-h-[42px] sm:min-h-0 ${
              error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10' : ''
            } disabled:bg-zinc-50 disabled:text-zinc-400 disabled:cursor-not-allowed cursor-pointer ${className}`}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="absolute right-3 text-zinc-400 pointer-events-none flex items-center justify-center">
            <ChevronDown className="w-4 h-4" />
          </span>
        </div>
        {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
        {hint && !error && <p className="text-xs text-zinc-500 mt-1">{hint}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
