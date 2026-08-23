"use client";

import React, { useState, useRef, useEffect } from "react";
import { SearchInput } from "./SearchInput";
import { useIconVisibility } from "../hooks/IconVisibilityContext";

export interface CategoryOption {
  id: string;
  name: string;
  type: "EVERYDAY" | "REGULAR" | "GOAL";
  currentBalance?: string | number | null;
  icon?: string | null;
}

export interface SearchableCategorySelectProps {
  value: string;
  onChange: (id: string) => void;
  categories: CategoryOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableCategorySelect({
  value,
  onChange,
  categories,
  placeholder = "Select category...",
  disabled = false,
  className = "",
}: SearchableCategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [poolFilter, setPoolFilter] = useState<"ALL" | "EVERYDAY" | "REGULAR" | "GOAL">("ALL");
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

  // Intercept Escape key when search dropdown is open so it only closes the dropdown
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

  const filteredCategories = categories.filter((c) => {
    if (poolFilter !== "ALL" && c.type !== poolFilter) return false;
    if (search.trim() && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  useEffect(() => {
    setHighlightedIndex(0);
  }, [search, poolFilter]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 >= filteredCategories.length ? 0 : prev + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 < 0 ? Math.max(0, filteredCategories.length - 1) : prev - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      const targetCat = filteredCategories[highlightedIndex] || filteredCategories[0];
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

  const getPoolLabel = (type: "EVERYDAY" | "REGULAR" | "GOAL") => {
    switch (type) {
      case "EVERYDAY":
        return "Everyday";
      case "REGULAR":
        return "Bills";
      case "GOAL":
        return "Goal";
      default:
        return type;
    }
  };

  const getPoolBadgeColor = (type: "EVERYDAY" | "REGULAR" | "GOAL") => {
    switch (type) {
      case "EVERYDAY":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "REGULAR":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "GOAL":
        return "bg-teal-50 text-teal-700 border-teal-200";
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#2563eb] disabled:bg-zinc-100 disabled:opacity-75 shadow-xs"
      >
        {selectedCategory ? (
          <div className="flex items-center gap-2 overflow-hidden min-w-0">
            {showIcons && <span>{selectedCategory.icon || (selectedCategory.type === "REGULAR" ? "📌" : selectedCategory.type === "GOAL" ? "🎯" : "🛒")}</span>}
            <span className="font-bold text-[#1B2B4B] truncate">{selectedCategory.name}</span>
            {selectedCategory.currentBalance !== undefined && (
              <span className="text-[11px] font-mono text-zinc-500 shrink-0">
                (${parseFloat(String(selectedCategory.currentBalance || 0)).toFixed(2)})
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
            placeholder="Type to filter & hit Enter..."
          />

          {/* Pool Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-zinc-200 w-full">
            {(["ALL", "EVERYDAY", "REGULAR", "GOAL"] as const).map((filterKey) => (
              <button
                key={filterKey}
                type="button"
                onClick={() => setPoolFilter(filterKey)}
                className={`flex-1 py-1 text-[10px] font-extrabold rounded-lg transition-all ${
                  poolFilter === filterKey
                    ? "bg-white text-[#2563eb] shadow-2xs"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {filterKey === "ALL" ? "All" : filterKey === "EVERYDAY" ? "Everyday" : filterKey === "REGULAR" ? "Bills" : "Goals"}
              </button>
            ))}
          </div>

          {/* Category List */}
          <div className="overflow-y-auto max-h-48 flex flex-col gap-1 pr-0.5 w-full">
            {filteredCategories.length === 0 ? (
              <div className="py-4 text-center text-xs text-zinc-400 font-medium">
                No matching categories found
              </div>
            ) : (
              filteredCategories.map((cat, idx) => {
                const isSelected = cat.id === value;
                const isHighlighted = idx === highlightedIndex;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      onChange(cat.id);
                      setIsOpen(false);
                    }}
                    className={`w-full p-2 rounded-xl text-xs flex items-center justify-between text-left transition-all ${
                      isSelected || isHighlighted
                        ? "bg-blue-50 border border-blue-200 font-bold"
                        : "hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden min-w-0">
                      {showIcons && <span>{cat.icon || (cat.type === "REGULAR" ? "📌" : cat.type === "GOAL" ? "🎯" : "🛒")}</span>}
                      <span className="font-bold text-[#1B2B4B] truncate">{cat.name}</span>
                      <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border shrink-0 ${getPoolBadgeColor(cat.type)}`}>
                        {getPoolLabel(cat.type)}
                      </span>
                    </div>
                    {cat.currentBalance !== undefined && (
                      <span className="font-mono font-bold text-zinc-600 ml-2 shrink-0">
                        ${parseFloat(String(cat.currentBalance || 0)).toFixed(2)}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
