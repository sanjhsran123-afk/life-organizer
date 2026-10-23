import React, { forwardRef } from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = '', id, rows = 3, ...props }, ref) => {
    const textareaId = id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
            {label}
            {props.required && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={`w-full bg-white dark:bg-zinc-800/80 border border-zinc-200/90 dark:border-zinc-700 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all duration-150 p-3.5 sm:p-3 ${
            error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10' : ''
          } disabled:bg-zinc-50 dark:disabled:bg-zinc-800/40 disabled:text-zinc-400 dark:disabled:text-zinc-600 disabled:cursor-not-allowed resize-y ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
        {hint && !error && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
