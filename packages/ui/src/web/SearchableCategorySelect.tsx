"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { SearchInput } from "./SearchInput";
import { useIconVisibility } from "../hooks/IconVisibilityContext";
import { t } from "@money-matters/i18n";

export interface CategoryOption {
  id: string;
  name: string;
  type: "EVERYDAY" | "REGULAR" | "GOAL";
  currentBalance?: string | number | null;
  icon?: string | null;
  categoryCount?: number;
}

export interface SearchableCategorySelectProps {
  value: string;
  onChange: (id: string) => void;
  categories: CategoryOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function renderCategoryIcon(icon?: string | null, type?: "EVERYDAY" | "REGULAR" | "GOAL") {
  if (!icon) {
    return type === "REGULAR" ? "📌" : type === "GOAL" ? "🎯" : "🛒";
  }
  if (/\p{Extended_Pictographic}/u.test(icon)) {
    return icon;
  }
  const iconMap: Record<string, string> = {
    coffee: "☕",
    home: "🏠",
    car: "🚗",
    "shopping-cart": "🛒",
    "shopping-bag": "🛍️",
    zap: "⚡",
    wifi: "📡",
    phone: "📱",
    tv: "📺",
    umbrella: "☂️",
    heart: "❤️",
    book: "📚",
    shield: "🛡️",
    user: "👤",
    "user-check": "👤",
    smile: "😊",
    "dollar-sign": "💵",
    briefcase: "💼",
    piggy: "🐷",
    target: "🎯",
    pin: "📌",
    gift: "🎁",
    plane: "✈️",
    graduation: "🎓",
    music: "🎵",
    film: "🎬",
    tool: "🔧",
    key: "🔑",
  };
  const lowerKey = icon.toLowerCase().trim();
  return iconMap[lowerKey] || (type === "REGULAR" ? "📌" : type === "GOAL" ? "🎯" : "🛒");
}

const POOL_TYPE_LABELS: Record<"EVERYDAY" | "REGULAR" | "GOAL", string> = {
  EVERYDAY: "Everyday Pools",
  REGULAR: "Bills Pools",
  GOAL: "Goal Pools",
};

export function SearchableCategorySelect({
  value,
  onChange,
  categories,
  placeholder = "Select pool...",
  disabled = false,
  className = "",
}: SearchableCategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { showIcons } = useIconVisibility();

  const selectedCategory = categories.find((c) => c.id === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setHighlightedIndex(0);
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Intercept Escape key when dropdown is open
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const lower = search.toLowerCase().trim();
    return categories.filter((c) => c.name.toLowerCase().includes(lower));
  }, [categories, search]);

  // Hierarchical grouping
  const groupedCategories = useMemo(() => {
    const types: Array<"EVERYDAY" | "REGULAR" | "GOAL"> = ["EVERYDAY", "REGULAR", "GOAL"];
    return types.map((type) => ({
      type,
      label: POOL_TYPE_LABELS[type],
      items: filteredCategories.filter((c) => c.type === type),
    })).filter((g) => g.items.length > 0);
  }, [filteredCategories]);

  const flatSelectableList = useMemo(() => {
    const list: CategoryOption[] = [];
    for (const group of groupedCategories) {
      for (const item of group.items) {
        list.push(item);
      }
    }
    return list;
  }, [groupedCategories]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [search]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 >= flatSelectableList.length ? 0 : prev + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 < 0 ? Math.max(0, flatSelectableList.length - 1) : prev - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      const targetCat = flatSelectableList[highlightedIndex] || flatSelectableList[0];
      if (targetCat) {
        onChange(targetCat.id);
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
    }
  };

  const fmtMoney = (val?: string | number | null) => {
    if (val === undefined || val === null) return "$0.00";
    const num = typeof val === "number" ? val : parseFloat(val);
    return `$${isNaN(num) ? "0.00" : num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#2563eb] disabled:bg-zinc-100 disabled:opacity-75 shadow-xs cursor-pointer"
      >
        {selectedCategory ? (
          <div className="flex items-center gap-2 overflow-hidden min-w-0">
            <span className="font-bold text-[#1B2B4B] truncate">{selectedCategory.name}</span>
            {selectedCategory.currentBalance !== undefined && (
              <span className="text-[11px] font-mono text-zinc-500 shrink-0">
                ({fmtMoney(selectedCategory.currentBalance)})
              </span>
            )}
          </div>
        ) : (
          <span className="text-zinc-400 truncate">{placeholder}</span>
        )}
        <span className="text-zinc-400 text-xs ml-2 shrink-0">▼</span>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-zinc-200 rounded-2xl shadow-xl z-50 p-3 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150 max-h-80 overflow-hidden w-full">
          {/* Inline Search Input */}
          <SearchInput
            inputRef={searchInputRef}
            value={search}
            onChange={setSearch}
            onKeyDown={handleInputKeyDown}
            autoFocus
            placeholder="Type pool or category name..."
          />

          {/* Hierarchical Tree List */}
          <div className="overflow-y-auto max-h-56 flex flex-col gap-2 pr-0.5 w-full">
            {groupedCategories.length === 0 ? (
              <div className="py-4 text-center text-xs text-zinc-400 font-medium">
                {t("common.noMatchingOptions")}
              </div>
            ) : (
              groupedCategories.map((group) => (
                <div key={group.type} className="flex flex-col gap-1">
                  {/* Level 1: Pool Type Header */}
                  <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[#1B2B4B] bg-slate-100 rounded-lg">
                    {group.label} ({group.items.length})
                  </div>

                  {/* Level 2/3: Selectable Items */}
                  <div className="flex flex-col gap-0.5 pl-1">
                    {group.items.map((cat) => {
                      const isSelected = cat.id === value;
                      const flatIndex = flatSelectableList.findIndex((item) => item.id === cat.id);
                      const isHighlighted = flatIndex === highlightedIndex;

                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            onChange(cat.id);
                            setIsOpen(false);
                          }}
                          className={`w-full p-2 rounded-xl text-xs flex items-center justify-between text-left transition-all cursor-pointer ${
                            isSelected || isHighlighted
                              ? "bg-blue-50 border border-blue-200 font-bold"
                              : "hover:bg-slate-50 border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden min-w-0">
                            <span className="font-bold text-[#1B2B4B] truncate">{cat.name}</span>
                            {cat.categoryCount !== undefined && cat.categoryCount > 0 && (
                              <span className="text-[10px] text-zinc-400 font-medium">
                                ({cat.categoryCount})
                              </span>
                            )}
                          </div>

                          <span className="font-mono font-bold text-zinc-700 text-[11px] ml-2 shrink-0">
                            {fmtMoney(cat.currentBalance)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
