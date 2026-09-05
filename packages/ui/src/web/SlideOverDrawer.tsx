"use client";
import React, { useEffect } from 'react';
import { t } from '@money-matters/i18n';

interface SlideOverDrawerProps {
  title: React.ReactNode;
  subtitle?: string;
  onClose: () => void;
  onBack?: () => void;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  widthClass?: string; // e.g. "max-w-md", "max-w-lg"
  isDirty?: boolean;
}

export function SlideOverDrawer({
  title,
  subtitle,
  onClose,
  onBack,
  children,
  headerActions,
  widthClass = 'max-w-md',
  isDirty: _isDirty = false,
}: SlideOverDrawerProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity" 
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} 
      />

      {/* Modal Dialog Body */}
      <div className={`relative pointer-events-auto w-full ${widthClass} bg-white shadow-2xl rounded-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200`}>
        {/* Header */}
        <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-950 hover:bg-slate-100 transition-colors"
              title={t('common.back', { defaultValue: 'Back' })}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold text-slate-900 leading-snug flex items-center gap-2 truncate">
              {title}
            </div>
            {subtitle && (
              <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-950 hover:bg-slate-100 transition-colors"
              title={t('common.close', { defaultValue: 'Close' })}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-grow overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
