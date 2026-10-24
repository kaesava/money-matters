'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, ArrowRight } from 'lucide-react';
import { t } from '@money-matters/i18n';

export interface BalanceMatchNudgeBannerProps {
  readonly onOpenMatch?: () => void;
}

export const BalanceMatchNudgeBanner: React.FC<BalanceMatchNudgeBannerProps> = ({ onOpenMatch }) => {
  const router = useRouter();

  const handleClick = () => {
    if (onOpenMatch) {
      onOpenMatch();
    } else {
      router.push('/dashboard/bank-accounts');
    }
  };

  return (
    <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
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

      <button
        type="button"
        onClick={handleClick}
        className="px-3.5 py-2 h-9 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
      >
        <span>{t('dashboard.hero.balanceMatchNudgeAction')}</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
