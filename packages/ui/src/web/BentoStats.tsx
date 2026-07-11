import React from 'react';
import { t } from '@money-matters/i18n';

interface BentoStatsProps {
  entityLabel: string;
  activeCount: number;
  archivedCount: number;
  totalCount: number;
  isFetching: boolean;
}

/**
 * A beautiful, generic Bento-grid style metrics display card.
 * Renders active, archived, and total counts for any record type.
 */
export function BentoStats({
  entityLabel,
  activeCount,
  archivedCount,
  totalCount,
  isFetching,
}: BentoStatsProps) {
  if (isFetching) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm animate-pulse"
          >
            <div className="h-4 w-24 bg-slate-200 rounded mb-4" />
            <div className="h-10 w-16 bg-slate-200 rounded mb-2" />
            <div className="h-3 w-32 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Active records card */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6 text-emerald-950 shadow-sm transition-all hover:shadow-md">
        <div className="absolute right-4 top-4 h-12 w-12 rounded-xl bg-emerald-100/80 flex items-center justify-center">
          <svg className="w-6 h-6 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">{t('dashboard.statusActiveLabel')} {entityLabel}</p>
        <h3 className="mt-4 text-4xl font-extrabold tracking-tight text-emerald-900">{activeCount}</h3>
        <p className="mt-2 text-xs text-emerald-600/90 font-medium">
          {t('dashboard.activeForTenant', { defaultValue: 'Active for this workspace' })}
        </p>
      </div>

      {/* Recycle bin card */}
      <div className="relative overflow-hidden rounded-2xl border border-rose-100 bg-rose-50/60 p-6 text-rose-950 shadow-sm transition-all hover:shadow-md">
        <div className="absolute right-4 top-4 h-12 w-12 rounded-xl bg-rose-100/80 flex items-center justify-center">
          <svg className="w-6 h-6 text-rose-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-rose-700">{t('dashboard.statusArchivedLabel')} {entityLabel}</p>
        <h3 className="mt-4 text-4xl font-extrabold tracking-tight text-rose-900">{archivedCount}</h3>
        <p className="mt-2 text-xs text-rose-600/90 font-medium">{t('dashboard.statusSoftDeletedLabel')}</p>
      </div>

      {/* Total records card */}
      <div className="relative overflow-hidden rounded-2xl border border-purple-100 bg-purple-50/60 p-6 text-purple-950 shadow-sm transition-all hover:shadow-md sm:col-span-2 lg:col-span-1">
        <div className="absolute right-4 top-4 h-12 w-12 rounded-xl bg-purple-100/80 flex items-center justify-center">
          <svg className="w-6 h-6 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-purple-700">{t('dashboard.statusAllLabel')} {entityLabel}</p>
        <h3 className="mt-4 text-4xl font-extrabold tracking-tight text-purple-900">{totalCount}</h3>
        <p className="mt-2 text-xs text-purple-600/90 font-medium">{t('dashboard.statusAllLabel')}</p>
      </div>
    </div>
  );
}
