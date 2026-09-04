"use client";

import React from "react";
import { useIconVisibility } from "../hooks/IconVisibilityContext";

export interface SearchInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  showIcon?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  autoFocus?: boolean;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
  showIcon = true,
  inputRef,
  onKeyDown,
  autoFocus = false,
}: SearchInputProps) {
  const internalRef = React.useRef<HTMLInputElement>(null);
  const actualRef = inputRef || internalRef;

  React.useEffect(() => {
    if (value && actualRef.current) {
      actualRef.current.select();
    }
  }, []);

  return (
    <div className={`relative flex-1 ${className}`}>
      {showIcon && (
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      )}
      <input
        ref={actualRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className={`w-full ${
          showIcon ? "pl-10" : "pl-3.5"
        } pr-10 py-2.5 text-xs font-semibold rounded-xl bg-white border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] transition-all text-zinc-900 placeholder-zinc-400`}
      />
      {value.trim().length > 0 && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs font-bold px-1.5 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 transition-colors cursor-pointer"
          title="Clear search"
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
}
