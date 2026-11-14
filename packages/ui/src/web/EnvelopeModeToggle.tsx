import React from "react";

export interface EnvelopeModeToggleProps {
  mode: "TARGET_BALANCE" | "RECURRING";
  onChange: (mode: "TARGET_BALANCE" | "RECURRING") => void;
  label?: string;
  targetBalanceLabel: string;
  recurringLabel: string;
  targetBalanceDesc?: string;
  recurringDesc?: string;
}

export function EnvelopeModeToggle({
  mode,
  onChange,
  label,
  targetBalanceLabel,
  recurringLabel,
  targetBalanceDesc,
  recurringDesc,
}: EnvelopeModeToggleProps) {
  return (
    <div className="space-y-1.5">
      {label ? (
        <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </span>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange("TARGET_BALANCE")}
          className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
            mode === "TARGET_BALANCE"
              ? "border-blue-600 bg-blue-50 text-blue-900 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-100"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          <div className="font-medium">{targetBalanceLabel}</div>
          {targetBalanceDesc ? (
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {targetBalanceDesc}
            </div>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => onChange("RECURRING")}
          className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
            mode === "RECURRING"
              ? "border-blue-600 bg-blue-50 text-blue-900 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-100"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          <div className="font-medium">{recurringLabel}</div>
          {recurringDesc ? (
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {recurringDesc}
            </div>
          ) : null}
        </button>
      </div>
    </div>
  );
}
