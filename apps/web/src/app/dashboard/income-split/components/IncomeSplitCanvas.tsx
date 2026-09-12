"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { PoolAllocationSlider } from "./PoolAllocationSlider";

interface AllocationLineItem {
  bucketId: string;
  bucketName: string;
  proposedAmount: number;
  reasoning: string;
}

interface PoolRecord {
  id: string;
  name: string;
  poolType?: string;
  currentBalance?: string | number | null;
  targetAmount?: string | number | null;
  everydayAllowanceAmount?: string | number | null;
}

export interface IncomeSplitCanvasProps {
  readonly groups: Array<{
    type: "EVERYDAY" | "REGULAR" | "GOAL";
    label: string;
    items: AllocationLineItem[];
  }>;
  readonly pools: PoolRecord[];
  readonly sweepPoolId?: string;
  readonly sweepPoolRemainder: number;
  readonly linesMap: Record<string, string>;
  readonly initialLinesMap: Record<string, string>;
  readonly numericActual: number;
  readonly isReadOnly: boolean;
  readonly onLineAmountChange: (poolId: string, val: string) => void;
  readonly onResetLine: (poolId: string) => void;
}

function fmt(val: number) {
  return `$${val.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function IncomeSplitCanvas({
  groups,
  pools,
  sweepPoolId,
  sweepPoolRemainder,
  linesMap,
  initialLinesMap,
  numericActual,
  isReadOnly,
  onLineAmountChange,
  onResetLine,
}: IncomeSplitCanvasProps) {
  return (
    <div className="flex-1 min-w-0 space-y-6">
      {groups.map((group) => {
        const groupSum = group.items.reduce((acc, l) => {
          if (l.bucketId === sweepPoolId) {
            return acc + Math.max(0, sweepPoolRemainder);
          }
          return acc + (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0);
        }, 0);

        return (
          <section
            key={group.type}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs"
          >
            {/* Group Header */}
            <div className="p-4 md:px-6 bg-slate-50/80 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-black uppercase tracking-wider text-xs text-[#1B2B4B] dark:text-white">
                  {group.label}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-zinc-200/70 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                  {group.items.length}
                </span>
              </div>
              <span className="font-mono font-bold text-xs text-zinc-700 dark:text-zinc-300">
                {fmt(groupSum)}
              </span>
            </div>

            {/* Pool Items */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {group.items.map((l) => {
                const poolObj = pools.find((p) => p.id === l.bucketId);
                const isSweep = Boolean(sweepPoolId && l.bucketId === sweepPoolId);
                const currentBal = poolObj ? parseFloat(String(poolObj.currentBalance || "0")) : 0;
                const targetRaw = poolObj
                  ? poolObj.poolType === "EVERYDAY"
                    ? poolObj.everydayAllowanceAmount || poolObj.targetAmount
                    : poolObj.targetAmount
                  : null;
                const targetNum = targetRaw ? parseFloat(String(targetRaw)) : 0;

                const currentValStr = isSweep
                  ? sweepPoolRemainder.toFixed(2)
                  : (linesMap[l.bucketId] ?? l.proposedAmount.toFixed(2));
                const currentValNum = parseFloat(currentValStr) || 0;

                const initialValStr = initialLinesMap[l.bucketId] ?? l.proposedAmount.toFixed(2);
                const initialValNum = parseFloat(initialValStr) || 0;
                const isModified = !isSweep && Math.abs(currentValNum - initialValNum) > 0.01;

                if (isSweep) {
                  return (
                    <div
                      key={l.bucketId}
                      className="p-4 md:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-50/40 dark:bg-emerald-950/20"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-[#1B2B4B] dark:text-white">
                            {l.bucketName}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {t("paydayDrawer.autoSurplusBadge", { defaultValue: "Auto-Surplus" })}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 font-medium mt-0.5">
                          {t("paydayDrawer.balance", { defaultValue: "Balance:" })} {fmt(currentBal)} • Residual income absorbs into this pool
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="block text-[10px] font-bold uppercase text-zinc-400">Allocated</span>
                          <span className={`text-base font-mono font-black ${
                            sweepPoolRemainder < 0 ? "text-red-600" : "text-emerald-700 dark:text-emerald-300"
                          }`}>
                            {fmt(sweepPoolRemainder)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Regular Bill Row: Compact precision input + quick action chips
                if (group.type === "REGULAR") {
                  return (
                    <div
                      key={l.bucketId}
                      className="p-4 md:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#1B2B4B] dark:text-white truncate">
                            {l.bucketName}
                          </span>
                          {isModified && (
                            <button
                              type="button"
                              onClick={() => onResetLine(l.bucketId)}
                              disabled={isReadOnly}
                              title={t("paydayDrawer.resetPoolTooltip", { defaultValue: "Reset to proposed amount" })}
                              className="text-[10px] font-bold text-[#2563eb] hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <span>⟲</span>
                              <span>Auto ${initialValNum.toFixed(2)}</span>
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 font-mono mt-0.5">
                          {t("paydayDrawer.balance", { defaultValue: "Balance:" })} {fmt(currentBal)}
                          {targetNum > 0 && ` • Target: ${fmt(targetNum)}/mo`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!isReadOnly && targetNum > 0 && (
                          <div className="flex items-center gap-1.5 mr-1">
                            <button
                              type="button"
                              onClick={() => onLineAmountChange(l.bucketId, targetNum.toFixed(2))}
                              className="px-2 py-1 text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                            >
                              100% Target
                            </button>
                            <button
                              type="button"
                              onClick={() => onLineAmountChange(l.bucketId, "0.00")}
                              className="px-2 py-1 text-[11px] font-semibold text-zinc-500 hover:text-zinc-800 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 rounded-md transition-colors cursor-pointer"
                            >
                              Skip ($0)
                            </button>
                          </div>
                        )}

                        <input
                          type="text"
                          inputMode="decimal"
                          disabled={isReadOnly}
                          value={currentValStr}
                          onChange={(e) => onLineAmountChange(l.bucketId, e.target.value)}
                          className="w-32 px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-xl text-right font-mono font-bold text-xs focus:ring-2 focus:ring-[#2563eb] bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white tabular-nums"
                        />
                      </div>
                    </div>
                  );
                }

                // Goals & Discretionary Everyday: Full Slider track + dual-bound input
                return (
                  <div
                    key={l.bucketId}
                    className="p-4 md:px-6 space-y-3 hover:bg-slate-50/60 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#1B2B4B] dark:text-white truncate">
                            {l.bucketName}
                          </span>
                          {isModified && (
                            <button
                              type="button"
                              onClick={() => onResetLine(l.bucketId)}
                              disabled={isReadOnly}
                              className="text-[10px] font-bold text-[#2563eb] hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <span>⟲</span>
                              <span>Auto ${initialValNum.toFixed(2)}</span>
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 font-mono mt-0.5">
                          {t("paydayDrawer.balance", { defaultValue: "Balance:" })} {fmt(currentBal)}
                          {targetNum > 0 && ` • Target: ${fmt(targetNum)}`}
                        </p>
                      </div>

                      <input
                        type="text"
                        inputMode="decimal"
                        disabled={isReadOnly}
                        value={currentValStr}
                        onChange={(e) => onLineAmountChange(l.bucketId, e.target.value)}
                        className="w-32 px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-xl text-right font-mono font-bold text-xs focus:ring-2 focus:ring-[#2563eb] bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white tabular-nums shrink-0"
                      />
                    </div>

                    {!isReadOnly && (
                      <PoolAllocationSlider
                        value={currentValNum}
                        min={0}
                        max={numericActual}
                        step={5}
                        proposedValue={initialValNum}
                        targetValue={targetNum > 0 ? targetNum : undefined}
                        onChange={(val) => onLineAmountChange(l.bucketId, val.toFixed(2))}
                        onResetProposed={() => onResetLine(l.bucketId)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
