"use client";

import React, { useState, useId, useRef, useEffect } from "react";
import { Lock, Plus, Minus, ChevronDown } from "lucide-react";
import { t } from "@money-matters/i18n";

export interface PoolOption {
  id: string;
  name: string;
  isPrivate?: boolean;
  categories?: Array<{
    id: string;
    name: string;
  }>;
}

export interface PoolPickerProps {
  pools: PoolOption[];
  selectedPoolId?: string | null;
  selectedCategoryId?: string | null;
  onChange: (selection: { poolId: string; categoryId: string | null; label: string }) => void;
  allowCategorySelection?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: string;
}

export function PoolPicker({
  pools,
  selectedPoolId,
  selectedCategoryId,
  onChange,
  allowCategorySelection = true,
  placeholder,
  disabled = false,
  className = "",
  error,
}: PoolPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedPools, setExpandedPools] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonId = useId();

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentPool = pools.find((p) => p.id === selectedPoolId);
  const currentCategory = currentPool?.categories?.find((c) => c.id === selectedCategoryId);

  let displayLabel = placeholder || t("common.selectPool");
  if (currentPool) {
    if (selectedCategoryId && currentCategory) {
      displayLabel = `${currentPool.name} > ${currentCategory.name}`;
    } else {
      displayLabel = currentPool.name;
    }
  }

  const toggleExpand = (poolId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPools((prev) => ({ ...prev, [poolId]: !prev[poolId] }));
  };

  const handleSelectPool = (pool: PoolOption) => {
    onChange({
      poolId: pool.id,
      categoryId: null,
      label: pool.name,
    });
    setIsOpen(false);
  };

  const handleSelectCategory = (pool: PoolOption, cat: { id: string; name: string }) => {
    onChange({
      poolId: pool.id,
      categoryId: cat.id,
      label: `${pool.name} > ${cat.name}`,
    });
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <button
        id={buttonId}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
          error
            ? "border-rose-500 bg-rose-50/30 text-rose-900 focus:outline-none dark:border-rose-500 dark:bg-rose-950/20 dark:text-rose-200"
            : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800/60"
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      >
        <span className="flex items-center gap-2 truncate">
          {currentPool?.isPrivate && <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
          <span className="truncate">{displayLabel}</span>
        </span>
        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 ml-2" />
      </button>

      {error && <p className="mt-1 text-xs font-medium text-rose-500">{error}</p>}

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          {pools.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400">{t("common.noPoolsAvailable")}</div>
          ) : (
            pools.map((pool) => {
              const isExpanded = !!expandedPools[pool.id];
              const hasCategories = allowCategorySelection && pool.categories && pool.categories.length > 0;
              const isSelected = selectedPoolId === pool.id && !selectedCategoryId;

              return (
                <div key={pool.id} className="my-0.5">
                  <div
                    onClick={() => handleSelectPool(pool)}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      {pool.isPrivate && <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                      <span className="truncate">{pool.name}</span>
                    </span>

                    {hasCategories && (
                      <button
                        type="button"
                        onClick={(e) => toggleExpand(pool.id, e)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                        title={isExpanded ? "Collapse categories" : "Expand categories"}
                      >
                        {isExpanded ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>

                  {hasCategories && isExpanded && (
                    <div className="ml-4 border-l border-slate-200 pl-2 my-1 space-y-0.5 dark:border-slate-800">
                      {pool.categories!.map((cat) => {
                        const isCatSelected = selectedPoolId === pool.id && selectedCategoryId === cat.id;
                        return (
                          <div
                            key={cat.id}
                            onClick={() => handleSelectCategory(pool, cat)}
                            className={`rounded-md px-2.5 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                              isCatSelected
                                ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                            }`}
                          >
                            {cat.name}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
