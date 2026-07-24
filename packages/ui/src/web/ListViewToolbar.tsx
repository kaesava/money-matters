'use client';

import React from 'react';
import { Search, RotateCcw, Plus, LayoutList, LayoutGrid } from 'lucide-react';
import { t } from '@money-matters/i18n';
import { RefreshButton } from './RefreshButton';
import { FilterOption } from './GenericListView';

interface ListViewToolbarProps {
  title: string;
  subtitle?: string;
  addButtonLabel?: string;
  onAddClick?: () => void;
  isFetching: boolean;
  onRefresh: () => void | Promise<void>;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchPlaceholder?: string;
  viewMode: 'list' | 'grid';
  setViewMode: (mode: 'list' | 'grid') => void;
  sortBy: string;
  onSortByChange: (sort: string) => void;
  sortOptions: { value: string; label: string }[];
  sortOrder: 'asc' | 'desc';
  onSortOrderToggle: () => void;
  showArchived?: boolean;
  onShowArchivedChange?: (show: boolean) => void;
  activeFilterKey?: string;
  onFilterKeyChange?: (key: string) => void;
  filterOptions?: FilterOption[];
  categoryValue?: string;
  onCategoryChange?: (val: string) => void;
  categoryOptions?: { value: string; label: string }[];
}

export function ListViewToolbar({
  title,
  subtitle,
  addButtonLabel,
  onAddClick,
  isFetching,
  onRefresh,
  searchQuery,
  onSearchChange,
  searchPlaceholder = t('common.searchPlaceholder'),
  viewMode,
  setViewMode,
  sortBy,
  onSortByChange,
  sortOptions,
  sortOrder,
  onSortOrderToggle,
  showArchived,
  onShowArchivedChange,
  activeFilterKey,
  onFilterKeyChange,
  filterOptions,
  categoryValue,
  onCategoryChange,
  categoryOptions,
}: ListViewToolbarProps) {
  return (
    <div className="space-y-4 mb-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1B2B4B] tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs text-zinc-500 font-semibold mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-3">
          <RefreshButton isRefreshing={isFetching} onRefresh={onRefresh} />

          {onAddClick && (
            <button
              type="button"
              onClick={onAddClick}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#00B4A6] hover:opacity-90 active:scale-95 transition-all shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{addButtonLabel || t('common.addItem')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Controls Toolbar */}
      <div className="p-4 bg-white rounded-2xl border border-zinc-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Side: Search + Category Selector */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
            />
          </div>

          {categoryOptions && onCategoryChange && (
            <select
              value={categoryValue}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] bg-white text-zinc-700"
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Right Side: Filters, Sort & View Mode Toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          {filterOptions && onFilterKeyChange && (
            <div className="flex bg-zinc-100 p-1 rounded-xl">
              {filterOptions.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => onFilterKeyChange(opt.key)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeFilterKey === opt.key ? 'bg-white text-[#1B2B4B] shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Sort Control */}
          <div className="flex items-center gap-1.5">
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] bg-white text-zinc-700"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onSortOrderToggle}
              className="p-1.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
              title={t('common.sortOrder', { order: sortOrder === 'asc' ? t('common.ascending') : t('common.descending') })}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-zinc-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'list' ? 'bg-white text-[#1B2B4B] shadow-sm' : 'text-zinc-400 hover:text-zinc-700'
              }`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-white text-[#1B2B4B] shadow-sm' : 'text-zinc-400 hover:text-zinc-700'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
