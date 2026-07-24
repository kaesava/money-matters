'use client';

import React, { useState, useEffect } from 'react';
import { t } from '@money-matters/i18n';
import { ListViewToolbar } from './ListViewToolbar';

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
  title: string;
  subtitle?: string;
  addButtonLabel?: string;
  onAddClick?: () => void;
  items: T[];
  isLoading: boolean;
  isFetching: boolean;
  onRefresh: () => void | Promise<void>;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  viewModeKey: string;
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
  columns: ColumnDefinition<T>[];
  gridItemRender: (item: T, onViewDetails: (item: T) => void) => React.ReactNode;
  onRowClick?: (item: T) => void;
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
  searchPlaceholder = t('common.searchPlaceholder'),
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
  emptyStateText = t('common.empty'),
}: GenericListViewProps<T>) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    const cached = localStorage.getItem(`view_mode_${viewModeKey}`);
    if (cached === 'grid' || cached === 'list') {
      setViewMode(cached);
    }
  }, [viewModeKey]);

  const handleViewModeChange = (mode: 'list' | 'grid') => {
    setViewMode(mode);
    localStorage.setItem(`view_mode_${viewModeKey}`, mode);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      <ListViewToolbar
        title={title}
        subtitle={subtitle}
        addButtonLabel={addButtonLabel}
        onAddClick={onAddClick}
        isFetching={isFetching}
        onRefresh={onRefresh}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        viewMode={viewMode}
        setViewMode={handleViewModeChange}
        sortBy={sortBy}
        onSortByChange={onSortByChange}
        sortOptions={sortOptions}
        sortOrder={sortOrder}
        onSortOrderToggle={onSortOrderToggle}
        showArchived={showArchived}
        onShowArchivedChange={onShowArchivedChange}
        activeFilterKey={activeFilterKey}
        onFilterKeyChange={onFilterKeyChange}
        filterOptions={filterOptions}
        categoryValue={categoryValue}
        onCategoryChange={onCategoryChange}
        categoryOptions={categoryOptions}
      />

      {/* Content Rendering */}
      {isLoading ? (
        <div className="h-64 rounded-2xl animate-pulse bg-zinc-200/50" />
      ) : items.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white border border-zinc-100 text-center text-xs font-semibold text-zinc-400">
          {emptyStateText}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => gridItemRender(item, (i) => onRowClick && onRowClick(i)))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                {columns.map((col) => (
                  <th key={col.key} className={`px-6 py-3.5 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-xs font-semibold">
              {items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={`hover:bg-zinc-50/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-6 py-4 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}>
                      {col.render ? col.render(item) : String((item as any)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-zinc-200/80 shadow-sm text-xs font-bold">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="px-3 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 disabled:opacity-50"
          >
            {t('common.previous')}
          </button>
          <span className="text-zinc-500">
            {t('common.pageOf', { page, totalPages })}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="px-3 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 disabled:opacity-50"
          >
            {t('common.nextPage')}
          </button>
        </div>
      )}
    </div>
  );
}
