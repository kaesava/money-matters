'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToast, ToastItem, ToastType } from './ToastContext';

const typeStyles: Record<ToastType, { bg: string; border: string; text: string; iconColor: string; Icon: React.ComponentType<{ className?: string }> }> = {
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-950',
    iconColor: 'text-[#22c55e]',
    Icon: CheckCircle2,
  },
  error: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-950',
    iconColor: 'text-[#ba1a1a]',
    Icon: AlertCircle,
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-950',
    iconColor: 'text-[#2563eb]',
    Icon: Info,
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-950',
    iconColor: 'text-amber-500',
    Icon: AlertTriangle,
  },
};

export function ToastItemComponent({ toast }: { toast: ToastItem }) {
  const { dismissToast } = useToast();
  const style = typeStyles[toast.type] || typeStyles.info;
  const { Icon } = style;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto flex items-start gap-3 w-full max-w-sm p-4 rounded-xl border ${style.bg} ${style.border} ${style.text} shadow-lg transition-all duration-200 animate-slide-up`}
    >
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${style.iconColor}`} />
      <div className="flex-1 min-w-0">
        {toast.title && <p className="text-sm font-bold leading-tight mb-1">{toast.title}</p>}
        <p className="text-xs font-semibold leading-relaxed break-words">{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        aria-label="Dismiss toast"
        className="shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
      >
        <X className="w-4 h-4 opacity-60 hover:opacity-100" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, dismissAll } = useToast();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && toasts.length > 0) {
        dismissAll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toasts.length, dismissAll]);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full px-4 pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastItemComponent key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
