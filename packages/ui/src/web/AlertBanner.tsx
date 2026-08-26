'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type AlertVariant = 'success' | 'error' | 'info' | 'warning';

export interface AlertBannerProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
  id?: string;
}

const variantStyles: Record<AlertVariant, { bg: string; border: string; text: string; iconColor: string; Icon: React.ComponentType<{ className?: string }> }> = {
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
    iconColor: 'text-amber-600',
    Icon: AlertTriangle,
  },
};

export function AlertBanner({
  variant = 'info',
  title,
  children,
  onClose,
  className = '',
  id,
}: AlertBannerProps) {
  const style = variantStyles[variant] || variantStyles.info;
  const { Icon } = style;

  return (
    <div
      id={id}
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-xl border ${style.bg} ${style.border} ${style.text} ${className}`}
    >
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${style.iconColor}`} />
      <div className="flex-1 min-w-0">
        {title && <p className="text-sm font-bold leading-tight mb-1">{title}</p>}
        <div className="text-xs font-semibold leading-relaxed">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close alert"
          className="shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <X className="w-4 h-4 opacity-60 hover:opacity-100" />
        </button>
      )}
    </div>
  );
}
