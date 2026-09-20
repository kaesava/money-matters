"use client";

import React from "react";
import { Lock } from "lucide-react";
import { t } from "@money-matters/i18n";
import { PoolOption } from "./poolPickerUtils";

export interface PoolPickerGroupProps {
  readonly group: { type: string; label: string; items: PoolOption[] };
  readonly isTypeExpanded: boolean;
  readonly onToggleTypeExpand: (type: string, e: React.MouseEvent) => void;
  readonly expandedPools: Record<string, boolean>;
  readonly onTogglePoolExpand: (poolId: string, e: React.MouseEvent) => void;
  readonly selectedPoolId?: string | null;
  readonly selectedCategoryId?: string | null;
  readonly allowCategorySelection: boolean;
  readonly showBalance: boolean;
  readonly onSelectPool: (pool: PoolOption) => void;
  readonly onSelectCategory: (pool: PoolOption, cat: { id: string; name: string }) => void;
  readonly formatBalance: (val: number | string | null | undefined) => string | null;
}

export function PoolPickerGroup({
  group,
  isTypeExpanded,
  onToggleTypeExpand,
  expandedPools,
  onTogglePoolExpand,
  selectedPoolId,
  selectedCategoryId,
  allowCategorySelection,
  showBalance,
  onSelectPool,
  onSelectCategory,
  formatBalance,
}: PoolPickerGroupProps) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800/80">
      {/* Pool Type Header */}
      <div
        onClick={(e) => onToggleTypeExpand(group.type, e)}
        className="flex items-center justify-between px-3 py-1.5 bg-slate-100/90 dark:bg-slate-800/80 cursor-pointer hover:bg-slate-200/80 transition-colors select-none"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400">
            {isTypeExpanded ? "▼" : "▶"}
          </span>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#1B2B4B] dark:text-blue-300">
            {group.label} ({group.items.length})
          </span>
        </div>
      </div>

      {/* Group Items */}
      {isTypeExpanded && (
        <div className="p-1 space-y-0.5 bg-white dark:bg-slate-900">
          {group.items.map((pool) => {
            const isPoolExpanded = Boolean(expandedPools[pool.id]);
            const hasCategories = allowCategorySelection && pool.categories && pool.categories.length > 0;
            const isSelected = selectedPoolId === pool.id && !selectedCategoryId;
            const balStr = showBalance ? formatBalance(pool.currentBalance ?? pool.balance) : null;

            return (
              <div key={pool.id} className="rounded-lg overflow-hidden">
                <div
                  onClick={() => onSelectPool(pool)}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-blue-50 text-[#2563eb] dark:bg-blue-950/50 dark:text-blue-400"
                      : "text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/80"
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate min-w-0 flex-1">
                    {hasCategories ? (
                      <button
                        type="button"
                        onClick={(e) => onTogglePoolExpand(pool.id, e)}
                        className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
                        title={isPoolExpanded ? t('common.collapseCategories') : t('common.expandCategories')}
                      >
                        <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400">
                          {isPoolExpanded ? "▼" : "▶"}
                        </span>
                      </button>
                    ) : (
                      <span className="w-4 shrink-0" />
                    )}
                    {pool.isPrivate && <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                    <span className="truncate">{pool.name}</span>
                    {hasCategories && (
                      <span className="text-[10px] font-bold text-slate-400 shrink-0">
                        ({pool.categories!.length})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center shrink-0 ml-2">
                    {balStr && (
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                        {balStr}
                      </span>
                    )}
                  </div>
                </div>

                {/* Child Categories */}
                {hasCategories && isPoolExpanded && (
                  <div className="ml-4 border-l-2 border-slate-200 dark:border-slate-800 pl-2 my-1 space-y-0.5">
                    {pool.categories!.map((cat) => {
                      const isCatSelected = selectedPoolId === pool.id && selectedCategoryId === cat.id;
                      return (
                        <div
                          key={cat.id}
                          onClick={() => onSelectCategory(pool, cat)}
                          className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-[11px] font-medium cursor-pointer transition-colors ${
                            isCatSelected
                              ? "bg-blue-50 text-[#2563eb] font-bold dark:bg-blue-950/40 dark:text-blue-400"
                              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-slate-400">•</span>
                            <span className="truncate">{cat.name}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
