'use client';

import React from 'react';
import { t } from '@money-matters/i18n';
import { Sparkles, ArrowRight } from 'lucide-react';
import { authClient } from '../../lib/auth';
import { ModalDialog, Button } from '@money-matters/ui/web';

export interface TourWelcomeModalProps {
  isOpen: boolean;
  onStartTour: () => void;
  onDismiss: () => void;
}

export function TourWelcomeModal({ isOpen, onStartTour, onDismiss }: TourWelcomeModalProps) {
  const { data: session } = authClient.useSession();
  const userName = session?.user?.name ? session.user.name.split(' ')[0] : '';

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onDismiss}
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg font-black shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-lg font-black text-[#1B2B4B] dark:text-white tracking-tight">
            {t('tour.welcome.title', { name: userName })}
          </span>
        </div>
      }
      maxWidthClass="max-w-md"
    >
      <div className="flex flex-col gap-5 pt-2">
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
          {t('tour.welcome.subtitle')}
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
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
    </ModalDialog>
  );
}
