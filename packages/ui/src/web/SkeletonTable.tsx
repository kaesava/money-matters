"use client";

import React from "react";

export interface SkeletonTableProps {
  rows?: number;
  cols?: number;
  className?: string;
}

export function SkeletonTable({ rows = 5, cols = 4, className = "" }: SkeletonTableProps) {
  return (
    <div className={`w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 ${className}`}>
      <div className="animate-pulse">
        {/* Table Header Skeleton */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={`th-${c}`} className="flex-1 px-3">
              <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>

        {/* Table Rows Skeleton */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {Array.from({ length: rows }).map((_, r) => (
            <div key={`tr-${r}`} className="flex items-center p-4">
              {Array.from({ length: cols }).map((_, c) => (
                <div key={`td-${r}-${c}`} className="flex-1 px-3">
                  <div
                    className="h-4 rounded bg-slate-100 dark:bg-slate-800"
                    style={{ width: `${60 + ((r + c) % 4) * 10}%` }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
