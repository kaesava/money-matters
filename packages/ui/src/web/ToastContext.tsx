'use client';

import React, { createContext, useContext, useState, useCallback, useId } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
}

export interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (options: { type: ToastType; message: string; title?: string; duration?: number }) => string;
  success: (message: string, title?: string, duration?: number) => string;
  error: (message: string, title?: string, duration?: number) => string;
  info: (message: string, title?: string, duration?: number) => string;
  warning: (message: string, title?: string, duration?: number) => string;
  dismissToast: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idPrefix = useId();

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const showToast = useCallback(
    ({ type, message, title, duration = 3500 }: { type: ToastType; message: string; title?: string; duration?: number }) => {
      const id = `${idPrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newToast: ToastItem = { id, type, message, title, duration };
      
      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }

      return id;
    },
    [dismissToast, idPrefix]
  );

  const success = useCallback(
    (message: string, title?: string, duration?: number) => showToast({ type: 'success', message, title, duration }),
    [showToast]
  );

  const error = useCallback(
    (message: string, title?: string, duration?: number) => showToast({ type: 'error', message, title, duration }),
    [showToast]
  );

  const info = useCallback(
    (message: string, title?: string, duration?: number) => showToast({ type: 'info', message, title, duration }),
    [showToast]
  );

  const warning = useCallback(
    (message: string, title?: string, duration?: number) => showToast({ type: 'warning', message, title, duration }),
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        success,
        error,
        info,
        warning,
        dismissToast,
        dismissAll,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
