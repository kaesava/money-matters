'use client';

import React from 'react';
import { t } from '@money-matters/i18n';

export interface PaginationBarProps {
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function PaginationBar({
  page,
  totalPages,
  pageSize,
  totalItems,
  pageSizeOptions = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
}: PaginationBarProps) {
  if (totalItems === 0) return null;

  const startItem = Math.min((page - 1) * pageSize + 1, totalItems);
  const endItem = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-zinc-200/80 shadow-sm text-xs font-semibold text-zinc-600">
      {/* Range and Page Size Info */}
      <div className="flex items-center gap-4">
        <span>
          {t('common.showingRange', { start: startItem, end: endItem, total: totalItems })}
        </span>

        <div className="flex items-center gap-2">
          <label htmlFor="page-size-select" className="text-zinc-400 font-medium hidden sm:inline">
            {t('common.itemsPerPage')}
          </label>
          <select
            id="page-size-select"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2.5 py-1 rounded-xl border border-zinc-200 bg-zinc-50 font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Page Navigation */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="px-3 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {t('common.previous')}
        </button>

        <span className="px-2 text-zinc-500 font-bold">
          {t('common.pageOf', { page, totalPages: Math.max(totalPages, 1) })}
        </span>

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="px-3 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {t('common.nextPage')}
        </button>
      </div>
    </div>
  );
}
