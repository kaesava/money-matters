"use client";
import React from "react";
import { t } from "@money-matters/i18n";

export interface FilterOption {
  id: string;
  label: string;
}

export interface FilterGroupProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  filterGroups?: {
    label: string;
    value: string;
    onChange: (val: string) => void;
    options: FilterOption[];
    defaultValue: string;
  }[];
  onClearAll?: () => void;
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
  filterGroups = [],
  onClearAll,
}: FilterGroupProps) {
  const isFiltered =
    searchQuery.trim().length > 0 ||
    filterGroups.some((fg) => fg.value !== fg.defaultValue);

  const handleClearAll = () => {
    onSearchChange("");
    filterGroups.forEach((fg) => fg.onChange(fg.defaultValue));
    if (onClearAll) onClearAll();
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-zinc-200/80 shadow-sm">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[220px]">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm select-none">
          🔍
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-9 pr-8 py-2 text-xs font-medium rounded-xl bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] focus:bg-white transition-all text-zinc-900 placeholder-zinc-400"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 text-xs font-bold"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filter Groups */}
      <div className="flex flex-wrap items-center gap-3">
        {filterGroups.map((fg, idx) => (
          <div key={idx} className="flex items-center gap-1 bg-zinc-100/80 p-1 rounded-xl">
            <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider px-2">
              {fg.label}:
            </span>
            {fg.options.map((opt) => {
              const active = fg.value === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => fg.onChange(opt.id)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                    active
                      ? "bg-[#1B2B4B] text-white shadow-sm"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        ))}

        {/* Clear All Button */}
        {isFiltered && (
          <button
            type="button"
            onClick={handleClearAll}
            className="px-3 py-1.5 text-xs font-bold rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all flex items-center gap-1.5"
          >
            <span>✕</span>
            <span>Clear All</span>
          </button>
        )}
      </div>
    </div>
  );
}
