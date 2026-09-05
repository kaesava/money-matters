"use client";

import React, { useState, useId, useRef, useEffect, useMemo } from "react";
import { Lock, Plus, Minus, ChevronDown, Search } from "lucide-react";
import { t } from "@money-matters/i18n";

export interface PoolOption {
  id: string;
  name: string;
  poolType?: "EVERYDAY" | "REGULAR" | "GOAL" | string;
  currentBalance?: number | string | null;
  balance?: number | string | null;
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

const POOL_TYPE_LABELS: Record<string, string> = {
  EVERYDAY: "Everyday Pools",
  REGULAR: "Bills Pools",
  GOAL: "Goals",
  OTHER: "Other Pools",
};

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
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({
    EVERYDAY: true,
    REGULAR: true,
    GOAL: true,
    OTHER: true,
  });
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

  // Reset search on close
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  const currentPool = pools.find((p) => p.id === selectedPoolId);
  const currentCategory = currentPool?.categories?.find((c) => c.id === selectedCategoryId);

  let displayLabel = placeholder || t("common.selectPool", { defaultValue: "Select Pool" });
  if (currentPool) {
    if (selectedCategoryId && currentCategory) {
      displayLabel = `${currentPool.name} › ${currentCategory.name}`;
    } else {
      displayLabel = currentPool.name;
    }
  }

  const formatBalance = (val: number | string | null | undefined) => {
    if (val === null || val === undefined || val === "") return null;
    const num = typeof val === "number" ? val : parseFloat(val);
    if (isNaN(num)) return null;
    return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const toggleTypeExpand = (type: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const togglePoolExpand = (poolId: string, e: React.MouseEvent) => {
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
      label: `${pool.name} › ${cat.name}`,
    });
    setIsOpen(false);
  };

  // Group pools by type
  const allOption = useMemo(() => pools.find((p) => p.id === ""), [pools]);
  const regularPools = useMemo(() => pools.filter((p) => p.id !== ""), [pools]);

  const groupedPools = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    const filteredPools = regularPools.filter((p) => {
      if (!q) return true;
      const poolMatch = p.name.toLowerCase().includes(q);
      const catMatch = allowCategorySelection && p.categories?.some((c) => c.name.toLowerCase().includes(q));
      return poolMatch || catMatch;
    });

    const groups: Array<{ type: string; label: string; items: PoolOption[] }> = [
      { type: "EVERYDAY", label: POOL_TYPE_LABELS.EVERYDAY, items: [] },
      { type: "REGULAR", label: POOL_TYPE_LABELS.REGULAR, items: [] },
      { type: "GOAL", label: POOL_TYPE_LABELS.GOAL, items: [] },
    ];

    const otherItems: PoolOption[] = [];

    for (const pool of filteredPools) {
      if (pool.poolType === "EVERYDAY") {
        groups[0].items.push(pool);
      } else if (pool.poolType === "REGULAR") {
        groups[1].items.push(pool);
      } else if (pool.poolType === "GOAL") {
        groups[2].items.push(pool);
      } else {
        otherItems.push(pool);
      }
    }

    if (otherItems.length > 0) {
      groups.push({ type: "OTHER", label: POOL_TYPE_LABELS.OTHER, items: otherItems });
    }

    return groups.filter((g) => g.items.length > 0);
  }, [regularPools, searchQuery, allowCategorySelection]);

  // Auto-expand on search
  useEffect(() => {
    if (searchQuery.trim()) {
      setExpandedTypes({ EVERYDAY: true, REGULAR: true, GOAL: true, OTHER: true });
      const expMap: Record<string, boolean> = {};
      for (const p of pools) {
        expMap[p.id] = true;
      }
      setExpandedPools(expMap);
    }
  }, [searchQuery, pools]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <button
        id={buttonId}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium transition-colors cursor-pointer ${
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
        <div className="absolute left-0 top-full z-50 mt-1 max-h-80 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 flex flex-col animate-in fade-in duration-150">
          {/* Search Input */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pool or category..."
                className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-[#2563eb] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                autoFocus
              />
            </div>
          </div>

          {/* List Container */}
          <div className="overflow-y-auto p-1.5 space-y-2 flex-1">
            {allOption && (!searchQuery || allOption.name.toLowerCase().includes(searchQuery.toLowerCase().trim())) && (
              <div
                onClick={() => handleSelectPool(allOption)}
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold cursor-pointer transition-colors border border-slate-100 dark:border-slate-800 ${
                  !selectedPoolId
                    ? "bg-blue-50 text-[#2563eb] dark:bg-blue-950/50 dark:text-blue-400"
                    : "text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/80"
                }`}
              >
                <span>{allOption.name}</span>
              </div>
            )}

            {groupedPools.length === 0 && !allOption ? (
              <div className="px-3 py-4 text-center text-xs text-slate-400 font-medium">
                {searchQuery ? `No pools found matching "${searchQuery}"` : t("common.noPoolsAvailable", { defaultValue: "No pools available" })}
              </div>
            ) : (
              groupedPools.map((group) => {
                const isTypeExpanded = expandedTypes[group.type] ?? true;

                return (
                  <div key={group.type} className="rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800/80">
                    {/* Pool Type Header */}
                    <div
                      onClick={(e) => toggleTypeExpand(group.type, e)}
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
                          const balStr = formatBalance(pool.currentBalance ?? pool.balance);

                          return (
                            <div key={pool.id} className="rounded-lg overflow-hidden">
                              <div
                                onClick={() => handleSelectPool(pool)}
                                className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                                  isSelected
                                    ? "bg-blue-50 text-[#2563eb] dark:bg-blue-950/50 dark:text-blue-400"
                                    : "text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/80"
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate min-w-0 flex-1">
                                  {pool.isPrivate && <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                                  <span className="truncate">{pool.name}</span>
                                  {hasCategories && (
                                    <span className="text-[10px] font-bold text-slate-400 shrink-0">
                                      ({pool.categories!.length})
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  {balStr && (
                                    <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                                      {balStr}
                                    </span>
                                  )}

                                  {hasCategories && (
                                    <button
                                      type="button"
                                      onClick={(e) => togglePoolExpand(pool.id, e)}
                                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-200/60 transition-colors cursor-pointer"
                                      title={isPoolExpanded ? "Collapse categories" : "Expand categories"}
                                    >
                                      {isPoolExpanded ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                                    </button>
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
                                        onClick={() => handleSelectCategory(pool, cat)}
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
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

