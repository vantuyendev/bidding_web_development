import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast: addToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const typeClasses = {
            success: 'bg-emerald-500 text-white border-emerald-600',
            error: 'bg-rose-500 text-white border-rose-600',
            warning: 'bg-amber-500 text-neutral-900 border-amber-600',
            info: 'bg-neutral-900 text-white border-neutral-800 dark:bg-white dark:text-neutral-900 dark:border-neutral-200',
          };

          const typeIcons = {
            success: '✅',
            error: '⚠️',
            warning: '⚡',
            info: 'ℹ️',
          };

          return (
            <div
              key={toast.id}
              className={`flex items-center gap-3 p-4 rounded-2xl border shadow-lg text-xs font-semibold animate-fadeIn pointer-events-auto transition-all ${typeClasses[toast.type] || typeClasses.info}`}
            >
              <span>{typeIcons[toast.type] || typeIcons.info}</span>
              <span className="flex-1">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="opacity-70 hover:opacity-100 cursor-pointer font-bold text-sm"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
