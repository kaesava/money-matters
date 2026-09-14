'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface FormErrorBannerProps {
  message?: string | null;
  className?: string;
  onDismiss?: () => void;
}

export function FormErrorBanner({ message, className = '', onDismiss }: FormErrorBannerProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={`p-3 bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-xs rounded-xl flex items-start gap-2.5 ${className}`}
    >
      <AlertCircle className="w-4 h-4 text-[#ba1a1a] shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">{message}</div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-rose-500 hover:text-rose-800 p-0.5 rounded-md transition-colors"
          aria-label="Dismiss error"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default FormErrorBanner;
