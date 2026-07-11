'use client';

import React, { useState, useEffect } from 'react';
import { Search, RotateCcw, Plus, LayoutList, LayoutGrid } from 'lucide-react';
import { t } from '@money-matters/i18n';
import { RefreshButton } from './RefreshButton';

export interface ColumnDefinition<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
}

export interface FilterOption {
  key: string;
  label: string;
}

export interface GenericListViewProps<T> {
  // Title & Header Elements
  title: string;
  subtitle?: string;
  addButtonLabel?: string;
  onAddClick?: () => void;
  
  // Data Querying & Fetching
  items: T[];
  isLoading: boolean;
  isFetching: boolean;
  onRefresh: () => void | Promise<void>;
  
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  
  // Pagination
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  
  // View Toggle (List vs Grid)
  viewModeKey: string; // Used for localStorage caching
  
  // Sorting
  sortBy: string;
  onSortByChange: (sort: string) => void;
  sortOptions: { value: string; label: string }[];
  sortOrder: 'asc' | 'desc';
  onSortOrderToggle: () => void;

  // Active / Archived Toggles (Optional)
  showArchived?: boolean;
  onShowArchivedChange?: (show: boolean) => void;
  
  // Custom Filter Tabs (e.g. Order Status, Item Type)
  activeFilterKey?: string;
  onFilterKeyChange?: (key: string) => void;
  filterOptions?: FilterOption[];
  
  // Custom Category Dropdowns (Optional)
  categoryValue?: string;
  onCategoryChange?: (val: string) => void;
  categoryOptions?: { value: string; label: string }[];

  // Render Functions
  columns: ColumnDefinition<T>[];
  gridItemRender: (item: T, onViewDetails: (item: T) => void) => React.ReactNode;
  onRowClick?: (item: T) => void;
  
  // Placeholder/Empty States
  emptyStateIcon?: React.ComponentType<any>;
  emptyStateText?: string;
}

export function GenericListView<T extends { id: string }>({
  title,
  subtitle,
  addButtonLabel,
  onAddClick,
  items,
  isLoading,
  isFetching,
  onRefresh,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search...',
  page = 1,
  totalPages = 1,
  onPageChange,
  viewModeKey,
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
  columns,
  gridItemRender,
  onRowClick,
  emptyStateIcon: EmptyStateIcon = Search,
  emptyStateText = 'No items found',
}: GenericListViewProps<T>) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');

  // Load initial view mode from local storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`viewMode_${viewModeKey}`);
      if (saved === 'list' || saved === 'grid') {
        setViewMode(saved);
      }
    }
  }, [viewModeKey]);

  const handleViewModeChange = (mode: 'list' | 'grid') => {
    setViewMode(mode);
    localStorage.setItem(`viewMode_${viewModeKey}`, mode);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-1 font-sans">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/50 select-none shrink-0">
            <button
              onClick={() => handleViewModeChange('list')}
              className={`p-1.5 rounded-lg transition-all outline-none ${
                viewMode === 'list' ? 'bg-white text-indigo-650 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
              type="button"
              title={t('neo.listView.title')}
            >
              <LayoutList className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={() => handleViewModeChange('grid')}
              className={`p-1.5 rounded-lg transition-all outline-none ${
                viewMode === 'grid' ? 'bg-white text-indigo-650 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
              type="button"
              title={t('neo.listView.gridTitle')}
            >
              <LayoutGrid className="w-4.5 h-4.5" />
            </button>
          </div>

          <RefreshButton onRefresh={onRefresh} isRefreshing={isFetching} />

          {onAddClick && addButtonLabel && (
            <button
              onClick={onAddClick}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 transition duration-200"
            >
              <Plus className="w-4 h-4" />
              {addButtonLabel}
            </button>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650/20 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Active / Archived Toggle */}
          {onShowArchivedChange && showArchived !== undefined && (
            <>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/50">
                <button
                  onClick={() => onShowArchivedChange(false)}
                  className={`py-1 px-3 rounded-lg text-xs font-semibold transition-all ${
                    !showArchived ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                  type="button"
                >
                  {t('common.active', { defaultValue: 'Active' })}
                </button>
                <button
                  onClick={() => onShowArchivedChange(true)}
                  className={`py-1 px-3 rounded-lg text-xs font-semibold transition-all ${
                    showArchived ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                  type="button"
                >
                  {t('common.archived', { defaultValue: 'Archived' })}
                </button>
              </div>
              <div className="w-px h-6 bg-slate-200 mx-1 self-center" />
            </>
          )}

          {/* Custom Filter Options (e.g. status) */}
          {filterOptions && onFilterKeyChange && activeFilterKey && (
            <>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/50">
                {filterOptions.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => onFilterKeyChange(opt.key)}
                    className={`py-1 px-3 rounded-lg text-xs font-semibold transition-all ${
                      activeFilterKey === opt.key ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                    type="button"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="w-px h-6 bg-slate-200 mx-1 self-center" />
            </>
          )}

          {/* Category Dropdown Selector */}
          {categoryOptions && onCategoryChange && categoryValue !== undefined && (
            <select
              value={categoryValue}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-650 transition-all w-auto shrink-0 cursor-pointer"
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {/* Sort dropdown */}
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-650 transition-all min-w-[120px] cursor-pointer"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            onClick={onSortOrderToggle}
            className="p-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 shrink-0 rounded-xl outline-none transition-colors"
            aria-label="Toggle Sort Order"
            type="button"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              {sortOrder === 'asc' ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* List/Grid Container */}
      {viewMode === 'list' ? (
        isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse h-14 bg-slate-50 rounded-xl border border-slate-100" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center border border-slate-100 bg-slate-50/50 rounded-xl">
            <div className="w-16 h-16 bg-white border border-slate-200 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <EmptyStateIcon className="w-8 h-8" />
            </div>
            <h4 className="text-sm font-semibold text-slate-700">{emptyStateText}</h4>
            <p className="text-xs text-slate-500 mt-1 font-sans">{t('neo.listView.adjustFilters')}</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className={`px-6 py-4 ${
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        }`}
                      >
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => onRowClick?.(item)}
                      className={`hover:bg-slate-50/50 transition duration-150 ${onRowClick ? 'cursor-pointer' : ''}`}
                    >
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-6 py-[1.125rem] ${
                            col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                          }`}
                        >
                          {col.render ? col.render(item) : (item as any)[col.key] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* Grid Mode */
        isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse h-48 bg-slate-50 border border-slate-100 rounded-2xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center border border-slate-100 bg-slate-50/50 rounded-xl">
            <div className="w-16 h-16 bg-white border border-slate-200 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <EmptyStateIcon className="w-8 h-8" />
            </div>
            <h4 className="text-sm font-semibold text-slate-700">{emptyStateText}</h4>
            <p className="text-xs text-slate-500 mt-1 font-sans">{t('neo.listView.adjustFilters')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
            {items.map((item) => gridItemRender(item, onRowClick || (() => {})))}
          </div>
        )
      )}

      {/* Pagination */}
      {totalPages > 1 && !isLoading && items.length > 0 && onPageChange && (
        <div className="px-6 py-4 bg-slate-50/50 border border-slate-100 flex items-center justify-between rounded-2xl shadow-sm">
          <span className="text-xs text-slate-500">
            {t('neo.listView.page')} {page} {t('neo.listView.of')} {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white"
            >{t('neo.listView.previous')}</button>
            <button
              disabled={page === totalPages}
              onClick={() => onPageChange(page + 1)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white"
            >{t('neo.listView.next')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
