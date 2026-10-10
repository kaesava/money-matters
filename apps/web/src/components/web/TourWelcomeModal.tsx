'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { t } from '@money-matters/i18n';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import { authClient } from '../../lib/auth';
import { Button } from '@money-matters/ui/web';

export interface TourWelcomeModalProps {
  isOpen: boolean;
  onStartTour: () => void;
  onDismiss: () => void;
}

export function TourWelcomeModal({ isOpen, onStartTour, onDismiss }: TourWelcomeModalProps) {
  const { data: session } = authClient.useSession();
  const userName = session?.user?.name ? session.user.name.split(' ')[0] : '';

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-welcome-title"
    >
      <div
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity"
        onClick={onDismiss}
      />
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 flex flex-col gap-5 animate-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-5 right-5 p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label={t('tour.welcome.dismissAction')}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl font-black shadow-xs">
          <Sparkles className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <h3
            id="tour-welcome-title"
            className="text-lg font-black text-[#1B2B4B] dark:text-white tracking-tight"
          >
            {t('tour.welcome.title', { name: userName })}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            {t('tour.welcome.subtitle')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
          <Button
            type="button"
            variant="primary"
            onClick={onStartTour}
            className="w-full !py-3 !text-xs font-bold !gap-1.5 shadow-md"
          >
            <span>{t('tour.welcome.startAction')}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onDismiss}
            className="w-full !py-3 !text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            {t('tour.welcome.dismissAction')}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
