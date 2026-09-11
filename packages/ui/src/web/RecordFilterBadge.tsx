"use client";

import React from "react";

export interface RecordFilterBadgeProps {
  label: string;
  prefix?: string;
  onClear: () => void;
  className?: string;
}

/**
 * Serene Finance active filter pill for exact-ID cross-screen navigation.
 * Renders cleanly beside or above search bars and tables.
 */
export const RecordFilterBadge: React.FC<RecordFilterBadgeProps> = ({
  label,
  prefix,
  onClear,
  className = "",
}) => {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full animate-in fade-in duration-150 ${className}`}
      role="status"
    >
      {prefix ? (
        <span className="text-slate-400 dark:text-slate-500 font-normal">{prefix}</span>
      ) : null}
      <span className="font-bold text-[#1B2B4B] dark:text-white max-w-[200px] truncate">
        {label}
      </span>
      <button
        type="button"
        onClick={onClear}
        className="ml-0.5 w-4 h-4 rounded-full inline-flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-white transition-colors cursor-pointer"
        aria-label={`Clear filter for ${label}`}
      >
        ✕
      </button>
    </div>
  );
};
