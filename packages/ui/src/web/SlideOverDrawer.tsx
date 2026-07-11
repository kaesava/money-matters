import React from 'react';
import { t } from '@money-matters/i18n';

interface SlideOverDrawerProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onBack?: () => void;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  widthClass?: string; // e.g. "max-w-md", "max-w-lg"
}

/**
 * A slide-over drawer component for web applications.
 * Typically used for "vertical slice" detail views or create/edit forms.
 *
 * @param props - Component props including title, onClose, and children.
 */
export function SlideOverDrawer({
  title,
  subtitle,
  onClose,
  onBack,
  children,
  headerActions,
  widthClass = 'max-w-md',
}: SlideOverDrawerProps) {
  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 overflow-hidden">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity" 
          onClick={onClose} 
        />

        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
          <div className={`pointer-events-auto w-screen ${widthClass} bg-white shadow-2xl border-l border-slate-200 flex flex-col h-full animate-in slide-in-from-right duration-300`}>
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
                <h2 className="text-lg font-bold text-slate-900 leading-snug truncate" title={title}>
                  {title}
                </h2>
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
      </div>
    </div>
  );
}
