import React from 'react';
import { t } from '@money-matters/i18n';
import { ShoppingBag, ReceiptText, Target } from 'lucide-react';

interface EnvelopeExplainerProps {
  envelopeType?: 'EVERYDAY' | 'REGULAR' | 'GOAL';
  compact?: boolean;
  className?: string;
}

export function EnvelopeExplainer({
  envelopeType,
  compact = false,
  className = '',
}: EnvelopeExplainerProps) {
  const cards = [
    {
      key: 'EVERYDAY' as const,
      title: t('envelopes.everyday.title'),
      desc: t('envelopes.everyday.description'),
      icon: <ShoppingBag className="w-5 h-5 text-blue-600 shrink-0" />,
      borderClass: 'border-blue-100 bg-blue-50/40 dark:border-blue-900/30 dark:bg-blue-950/20',
    },
    {
      key: 'REGULAR' as const,
      title: t('envelopes.bills.title'),
      desc: t('envelopes.bills.description'),
      icon: <ReceiptText className="w-5 h-5 text-amber-600 shrink-0" />,
      borderClass: 'border-amber-100 bg-amber-50/40 dark:border-amber-900/30 dark:bg-amber-950/20',
    },
    {
      key: 'GOAL' as const,
      title: t('envelopes.goals.title'),
      desc: t('envelopes.goals.description'),
      icon: <Target className="w-5 h-5 text-emerald-600 shrink-0" />,
      borderClass: 'border-emerald-100 bg-emerald-50/40 dark:border-emerald-900/30 dark:bg-emerald-950/20',
    },
  ];

  const visibleCards = envelopeType
    ? cards.filter((c) => c.key === envelopeType)
    : cards;

  return (
    <div
      className={`grid gap-3 ${
        visibleCards.length > 1 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1'
      } ${className}`}
    >
      {visibleCards.map((card) => (
        <div
          key={card.key}
          className={`p-3.5 rounded-xl border ${card.borderClass} flex flex-col gap-1.5`}
        >
          <div className="flex items-center gap-2">
            {card.icon}
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
              {card.title}
            </span>
          </div>
          <p className={`text-slate-600 dark:text-slate-300 leading-relaxed ${compact ? 'text-xs' : 'text-xs'}`}>
            {card.desc}
          </p>
        </div>
      ))}
    </div>
  );
}
