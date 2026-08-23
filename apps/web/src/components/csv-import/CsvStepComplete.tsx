"use client";

import React from "react";

export interface CommitResult {
  importedCount: number;
  skippedDuplicatesCount: number;
  batchId?: string;
}

export interface CsvStepCompleteProps {
  commitResult: CommitResult;
}

export function CsvStepComplete({ commitResult }: CsvStepCompleteProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl">
        ✓
      </div>
      <h4 className="text-xl font-extrabold text-[#1B2B4B]">Statement Import Complete!</h4>
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs font-semibold text-slate-700 max-w-sm w-full">
        <p className="text-emerald-700 font-bold text-sm">
          {commitResult.importedCount} Transactions Imported
        </p>
        {commitResult.skippedDuplicatesCount > 0 && (
          <p className="text-amber-700">
            ({commitResult.skippedDuplicatesCount} duplicate records skipped)
          </p>
        )}
        {commitResult.batchId && (
          <p className="text-[10px] text-slate-400 font-mono pt-1">
            Batch ID: {commitResult.batchId}
          </p>
        )}
        <p className="text-slate-500 pt-1">Your ledger and available balances have been updated.</p>
      </div>
    </div>
  );
}
