'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, ArrowRight, X } from 'lucide-react';
import { t } from '@money-matters/i18n';

export interface BalanceMatchNudgeBannerProps {
  readonly onOpenMatch?: () => void;
}

export const BalanceMatchNudgeBanner: React.FC<BalanceMatchNudgeBannerProps> = ({ onOpenMatch }) => {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  const handleClick = () => {
    if (onOpenMatch) {
      onOpenMatch();
    } else {
      router.push('/dashboard/bank-accounts');
    }
  };

  if (dismissed) return null;

  return (
    <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative">
      <div className="flex items-center gap-3 pr-6 sm:pr-0">
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
          <RefreshCw className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200">
            {t('dashboard.hero.balanceMatchNudgeTitle')}
          </h3>
          <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
            {t('dashboard.hero.balanceMatchNudgeDesc')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-start sm:self-auto">
        <button
          type="button"
          onClick={handleClick}
          className="px-3.5 py-2 h-9 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <span>{t('dashboard.hero.balanceMatchNudgeAction')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-2 text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100 rounded-lg transition-colors cursor-pointer"
          aria-label={t('common.dismiss')}
          title={t('common.dismiss')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
