import React from "react";

export function AffordCheckSkeleton() {
  return (
    <div className="w-full space-y-4 animate-pulse">
      {/* Verdict card skeleton */}
      <div className="p-6 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 h-32 flex flex-col justify-between">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
      </div>
      {/* Rationale lines skeleton */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-2">
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-4/5" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
      </div>
    </div>
  );
}
