import React, { useEffect } from 'react';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop blur overlay */}
      <div
        className="absolute inset-0 bg-neutral-950/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      ></div>

      {/* Modal Box */}
      <div className={`bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800/80 rounded-3xl p-6 shadow-2xl w-full ${maxWidth} relative z-10 animate-fadeIn`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer text-lg font-bold"
          aria-label="Close modal"
        >
          ✕
        </button>

        {title && (
          <h3 className="text-base font-bold text-neutral-900 dark:text-white tracking-tight mb-4 select-none">
            {title}
          </h3>
        )}

        <div className="mt-2">
          {children}
        </div>
      </div>
    </div>
  );
}
