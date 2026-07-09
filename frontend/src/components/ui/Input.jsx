import React from 'react';

export default function Input({
  label,
  error,
  textarea = false,
  className = '',
  id,
  type = 'text',
  rows = 4,
  ...props
}) {
  const inputStyles = `w-full px-4 py-3 rounded-xl border bg-transparent text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400 text-xs transition-colors duration-200 ${
    error
      ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
      : 'border-neutral-200 dark:border-neutral-800 focus:border-neutral-400 dark:focus:border-neutral-600'
  }`;

  return (
    <div className="space-y-1.5 w-full text-left">
      {label && (
        <label htmlFor={id} className="block text-neutral-400 font-bold text-xs select-none">
          {label}
        </label>
      )}
      {textarea ? (
        <textarea
          id={id}
          rows={rows}
          className={`${inputStyles} resize-none ${className}`}
          {...props}
        />
      ) : (
        <input
          id={id}
          type={type}
          className={`${inputStyles} ${className}`}
          {...props}
        />
      )}
      {error && (
        <span className="text-[10px] font-bold text-rose-500 animate-fadeIn block select-none">
          ⚠️ {error}
        </span>
      )}
    </div>
  );
}
