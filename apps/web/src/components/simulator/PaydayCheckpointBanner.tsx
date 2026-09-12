"use client";

import React from "react";
import { t } from "@money-matters/i18n";

export interface PaydayCheckpointBannerProps {
  incomeAmount: number;
  onIncomeChange: (val: number) => void;
  onResume: () => void;
  day: number;
}

const PRESET_AMOUNTS = [2000, 2500, 3200, 4200];

function PresetChips({
  currentAmount,
  onSelect,
}: {
  currentAmount: number;
  onSelect: (amount: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESET_AMOUNTS.map((amt) => {
        const isSelected = currentAmount === amt;
        return (
          <button
            key={amt}
            type="button"
            onClick={() => onSelect(amt)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              isSelected
                ? "bg-[#2563eb] text-white shadow-xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            ${amt.toLocaleString()}
          </button>
        );
      })}
    </div>
  );
}

function IncomeSliderControl({
  incomeAmount,
  onChange,
}: {
  incomeAmount: number;
  onChange: (val: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs">
        <span className="font-semibold text-slate-600">
          {t("landing.simCheckpointAmount")}
        </span>
        <span className="font-mono font-extrabold text-[#2563eb] text-sm tabular-nums">
          ${incomeAmount.toLocaleString()} AUD
        </span>
      </div>
      <input
        type="range"
        min={1800}
        max={4500}
        step={50}
        value={incomeAmount}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#2563eb] h-2 bg-slate-200 rounded-lg cursor-pointer"
      />
    </div>
  );
}

export function PaydayCheckpointBanner({
  incomeAmount,
  onIncomeChange,
  onResume,
  day,
}: PaydayCheckpointBannerProps) {
  const isPayday2 = day >= 14;

  return (
    <div className="w-full bg-blue-50/90 border border-blue-200/80 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-sm animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">💰</span>
          <div>
            <h4 className="text-sm font-extrabold text-[#1B2B4B]">
              {t("landing.simCheckpointTitle")}
            </h4>
            <p className="text-xs text-slate-600 font-medium">
              {isPayday2 ? t("landing.simDay14") : t("landing.simDay0")}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onResume}
          className="bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-extrabold px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer active:scale-98"
        >
          {t("landing.simCheckpointApply")}
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 items-center">
        <IncomeSliderControl incomeAmount={incomeAmount} onChange={onIncomeChange} />
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {t("landing.simCheckpointCustom")}
          </span>
          <PresetChips currentAmount={incomeAmount} onSelect={onIncomeChange} />
        </div>
      </div>
    </div>
  );
}
