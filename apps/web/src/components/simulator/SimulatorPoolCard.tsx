"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { PoolSnapshot } from "./types";

interface SimulatorPoolCardProps {
  pool: PoolSnapshot;
  onOpenTransfer?: (poolId: "everyday" | "bills" | "goals" | "surplus") => void;
}

export const SimulatorPoolCard: React.FC<SimulatorPoolCardProps> = ({ pool, onOpenTransfer }) => {
  const percent = Math.min(100, Math.round((pool.current / pool.target) * 100));
  const isFull = percent >= 100;

  return (
    <div
      className={`p-5 rounded-2xl bg-white border transition-all duration-300 shadow-2xs flex flex-col gap-4 ${
        isFull
          ? "border-emerald-300 ring-2 ring-emerald-500/10 shadow-emerald-500/5"
          : "border-slate-200/90 hover:border-slate-300"
      }`}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold font-mono text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
            {pool.stepNumber}
          </span>
          <span className="font-extrabold text-[#1B2B4B] text-sm">{pool.name}</span>
          {onOpenTransfer && (
            <button
              type="button"
              onClick={() => onOpenTransfer(pool.id as "everyday" | "bills" | "goals" | "surplus")}
              className="text-[10px] font-bold text-slate-500 hover:text-[#2563eb] bg-slate-100 hover:bg-blue-50 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
              title={t("landing.simTransferAction")}
            >
              ⇄ {t("landing.simTransferAction")}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isFull && (
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md animate-in fade-in zoom-in-95 duration-200">
              {t("landing.simFunded100")}
            </span>
          )}
          <span
            className={`font-mono font-bold text-sm tabular-nums ${
              isFull ? "text-[#22c55e]" : "text-[#2563eb]"
            }`}
          >
            ${pool.current} / ${pool.target}
          </span>
        </div>
      </div>

      {/* Main Progress Bar */}
      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/60">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            isFull ? "bg-[#22c55e]" : "bg-[#2563eb]"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Sub-items list */}
      <div className="pt-2 border-t border-slate-100 flex flex-col gap-2.5">
        {pool.subItems.map((sub) => {
          const subPercent = Math.min(100, Math.round((sub.current / sub.target) * 100));
          const subFull = subPercent >= 100;
          return (
            <div key={sub.id} className="flex flex-col gap-1 text-xs">
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-semibold flex items-center gap-1.5">
                  {sub.name}
                  {sub.priorityLabel && (
                    <span className="text-[9px] bg-blue-50 text-[#2563eb] border border-blue-200 px-1 py-0.2 rounded font-bold">
                      {sub.priorityLabel}
                    </span>
                  )}
                  {subFull && (
                    <span className="text-[10px] text-emerald-600 font-bold">✓</span>
                  )}
                </span>
                <span className="font-mono font-medium text-slate-600">
                  ${sub.current} / ${sub.target}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    subFull ? "bg-[#22c55e]" : "bg-[#2563eb]"
                  }`}
                  style={{
                    width: `${subPercent}%`,
                    transitionDuration: `${Math.round(400 * sub.speedMultiplier)}ms`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
