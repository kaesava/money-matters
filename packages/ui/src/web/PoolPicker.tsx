"use client";

import React, { useState, useId, useRef, useEffect, useMemo } from "react";
import { Lock, ChevronDown, Search, X, Check } from "lucide-react";
import { t } from "@money-matters/i18n";
import { PoolPickerGroup } from "./PoolPickerGroup";
import {
  PoolOption,
  PoolPickerProps,
  formatPoolBalance,
  groupPoolsByType,
} from "./poolPickerUtils";

export type { PoolOption, PoolPickerProps };

export function PoolPicker({
  pools,
  showBalance,
  selectedPoolId,
  selectedCategoryId,
  onChange,
  allowCategorySelection = true,
  allowAllOption = false,
  allOptionLabel,
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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  const explicitAllOption = pools.find(
    (p) => p.id === "" || p.id === "ALL" || p.name.toLowerCase().includes("all pools")
  );
  const showAllOption = allowAllOption || Boolean(explicitAllOption);
  const allLabel = explicitAllOption?.name || allOptionLabel || t("common.allPools", { defaultValue: "All Pools" });
  const isAllSelected = !selectedPoolId || selectedPoolId === "" || selectedPoolId === "ALL";

  const regularPools = useMemo(
    () => pools.filter((p) => p.id !== "" && p.id !== "ALL" && !p.name.toLowerCase().includes("all pools")),
    [pools]
  );

  const currentPool = regularPools.find((p) => p.id === selectedPoolId);
  const currentCategory = currentPool?.categories?.find((c) => c.id === selectedCategoryId);

  let displayLabel = placeholder || (showAllOption ? allLabel : t("common.selectPool", { defaultValue: "Select Pool" }));
  if (!isAllSelected && currentPool) {
    if (selectedCategoryId && currentCategory) {
      displayLabel = `${currentPool.name} › ${currentCategory.name}`;
    } else {
      displayLabel = currentPool.name;
    }
  } else if (isAllSelected && showAllOption) {
    displayLabel = allLabel;
  }

  const handleSelectAll = () => {
    onChange({
      poolId: explicitAllOption?.id === "ALL" ? "ALL" : "",
      categoryId: null,
      label: allLabel,
    });
    setIsOpen(false);
    setSearchQuery("");
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

  const groupedPools = useMemo(
    () => groupPoolsByType(regularPools, searchQuery, allowCategorySelection),
    [regularPools, searchQuery, allowCategorySelection]
  );

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
        <span className="flex items-center gap-2 truncate flex-1 min-w-0">
          {currentPool?.isPrivate && <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
          <span className="truncate">{displayLabel}</span>
        </span>
        <span className="flex items-center gap-1 shrink-0 ml-2">
          {showAllOption && !isAllSelected && !disabled && (
            <span
              role="button"
              tabIndex={0}
              title={t("common.clear", { defaultValue: "Clear" })}
              aria-label={t("common.clear", { defaultValue: "Clear" })}
              onClick={(e) => {
                e.stopPropagation();
                handleSelectAll();
              }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
        </span>
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
            {showAllOption && (!searchQuery || allLabel.toLowerCase().includes(searchQuery.toLowerCase().trim())) && (
              <div
                onClick={handleSelectAll}
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold cursor-pointer transition-colors border ${
                  isAllSelected
                    ? "bg-blue-50 border-blue-200 text-[#2563eb] dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-400"
                    : "border-slate-100 dark:border-slate-800 text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/80"
                }`}
              >
                <span>{allLabel}</span>
                {isAllSelected && <Check className="h-3.5 w-3.5 text-[#2563eb] dark:text-blue-400" />}
              </div>
            )}

            {groupedPools.length === 0 && !showAllOption ? (
              <div className="px-3 py-4 text-center text-xs text-slate-400 font-medium">
                {searchQuery ? `No pools found matching "${searchQuery}"` : t("common.noPoolsAvailable", { defaultValue: "No pools available" })}
              </div>
            ) : (
              groupedPools.map((group) => (
                <PoolPickerGroup
                  key={group.type}
                  group={group}
                  isTypeExpanded={expandedTypes[group.type] ?? true}
                  onToggleTypeExpand={(type, e) => {
                    e.stopPropagation();
                    setExpandedTypes((prev) => ({ ...prev, [type]: !prev[type] }));
                  }}
                  expandedPools={expandedPools}
                  onTogglePoolExpand={(poolId, e) => {
                    e.stopPropagation();
                    setExpandedPools((prev) => ({ ...prev, [poolId]: !prev[poolId] }));
                  }}
                  selectedPoolId={selectedPoolId}
                  selectedCategoryId={selectedCategoryId}
                  allowCategorySelection={allowCategorySelection}
                  showBalance={showBalance}
                  onSelectPool={handleSelectPool}
                  onSelectCategory={handleSelectCategory}
                  formatBalance={formatPoolBalance}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
