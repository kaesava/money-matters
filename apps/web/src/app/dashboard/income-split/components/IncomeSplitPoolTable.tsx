"use client";

import React, { useState } from "react";
import { FileText } from "lucide-react";
import { t } from "@money-matters/i18n";

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
  bankAccountId?: string | null;
  bankAccountName?: string | null;
  currentBalance?: string | number | null;
  targetAmount?: string | number | null;
  targetDate?: string | null;
  everydayAllowanceAmount?: string | number | null;
}

export interface IncomeSplitPoolTableProps {
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
  readonly reasoningMap?: Record<string, string>;
  readonly numericActual: number;
  readonly isReadOnly: boolean;
  readonly onLineAmountChange: (poolId: string, val: string) => void;
  readonly onLineReasoningChange?: (poolId: string, reasoning: string) => void;
}

function fmt(val: number) {
  return `$${val.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function IncomeSplitPoolTable({
  groups,
  pools,
  sweepPoolId,
  sweepPoolRemainder,
  linesMap,
  initialLinesMap: _initialLinesMap,
  reasoningMap,
  numericActual: _numericActual,
  isReadOnly,
  onLineAmountChange,
  onLineReasoningChange,
}: IncomeSplitPoolTableProps) {
  // Collapsed state for each group (default: none collapsed)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [openReasoningPools, setOpenReasoningPools] = useState<Record<string, boolean>>({});

  const toggleGroup = (type: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const toggleReasoning = (poolId: string) => {
    setOpenReasoningPools((prev) => ({ ...prev, [poolId]: !prev[poolId] }));
  };

  return (
    <div className="flex-1 min-w-0 space-y-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* Table Header with 100% Alignment Parity */}
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/60 text-[11px] font-semibold tracking-wide text-zinc-500">
                <th scope="col" className="py-3 px-4 md:px-6 text-left">
                  {t("paydayDrawer.tableColPool", { defaultValue: "Pool" })}
                </th>
                <th scope="col" className="py-3 px-3 text-center w-36">
                  {t("paydayDrawer.tableColTarget", { defaultValue: "Target" })}
                </th>
                <th scope="col" className="py-3 px-4 text-right w-36 tabular-nums font-mono">
                  {t("paydayDrawer.tableColBalance", { defaultValue: "Balance" })}
                </th>
                <th scope="col" className="py-3 px-4 md:px-6 text-right w-64 md:w-80 tabular-nums font-mono">
                  {t("paydayDrawer.tableColAllocation", { defaultValue: "Allocation" })}
                </th>
              </tr>
            </thead>

            {/* Table Body Divided by Groups */}
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
              {groups.map((group) => {
                const isCollapsed = Boolean(collapsedGroups[group.type]);
                const groupSum = group.items.reduce((acc, l) => {
                  if (l.bucketId === sweepPoolId) {
                    return acc + Math.max(0, sweepPoolRemainder);
                  }
                  return acc + (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0);
                }, 0);

                return (
                  <React.Fragment key={group.type}>
                    {/* Collapsible Group Subheader Row */}
                    <tr
                      onClick={() => toggleGroup(group.type)}
                      className="bg-slate-50/80 dark:bg-zinc-800/50 hover:bg-slate-100/70 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer select-none border-t border-zinc-200/60 dark:border-zinc-800"
                    >
                      <td colSpan={3} className="py-2 px-4 md:px-6">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-400 dark:text-zinc-500 text-[10px] w-3 text-center">
                            {isCollapsed ? "▶" : "▼"}
                          </span>
                          <span className="font-medium text-xs text-zinc-600 dark:text-zinc-300">
                            {group.label}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-4 md:px-6 text-right font-mono font-medium text-xs text-zinc-500 dark:text-zinc-400">
                        {fmt(groupSum)}
                      </td>
                    </tr>

                    {/* Group Items (when not collapsed) */}
                    {!isCollapsed &&
                      group.items.map((l) => {
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

                        // Sweep Pool Row (Auto Surplus)
                        if (isSweep) {
                          return (
                            <React.Fragment key={l.bucketId}>
                              <tr
                                className="bg-emerald-50/40 dark:bg-emerald-950/20 border-l-2 border-l-emerald-500"
                              >
                                <td className="py-3 px-4 md:px-6 text-left">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-[#1B2B4B] dark:text-white">
                                      {l.bucketName}
                                    </span>
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                      {t("paydayDrawer.autoSurplusBadge", { defaultValue: "Auto-Surplus" })}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-zinc-400 mt-0.5">
                                    {t("paydayDrawer.sweepExplanation", { defaultValue: "Absorbs residual income" })}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center text-zinc-400 font-mono text-[11px]">
                                  —
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-medium text-zinc-600 dark:text-zinc-300 tabular-nums">
                                  {fmt(currentBal)}
                                </td>
                                <td className="py-3 px-4 md:px-6 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <div className={`text-base font-mono font-bold tabular-nums ${
                                      sweepPoolRemainder < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-300"
                                    }`}>
                                      {fmt(sweepPoolRemainder)}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => toggleReasoning(l.bucketId)}
                                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                        openReasoningPools[l.bucketId] || Boolean(reasoningMap?.[l.bucketId] ?? l.reasoning)
                                          ? "bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400"
                                          : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                                      }`}
                                      title={t("paydayDrawer.showReasoning", { defaultValue: "Show or edit note / reasoning" })}
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              {openReasoningPools[l.bucketId] && (
                                <tr className="bg-slate-50/50 dark:bg-zinc-800/30 border-b border-zinc-200/40 dark:border-zinc-800">
                                  <td colSpan={4} className="py-2.5 px-4 md:px-6">
                                    <div className="flex items-center gap-3">
                                      <span className="text-[11px] font-bold text-zinc-400 whitespace-nowrap">
                                        {t("paydayDrawer.reasoningLabel", { defaultValue: "Reasoning / Note:" })}
                                      </span>
                                      <input
                                        type="text"
                                        value={reasoningMap?.[l.bucketId] ?? l.reasoning ?? ""}
                                        disabled={isReadOnly}
                                        placeholder={t("paydayDrawer.reasoningPlaceholder", { defaultValue: "Add reasoning for this allocation..." })}
                                        onChange={(e) => onLineReasoningChange?.(l.bucketId, e.target.value)}
                                        className="flex-1 px-3 py-1.5 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb] disabled:opacity-60"
                                      />
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        }

                        // Non-Sweep Rows (Bills, Goals, Discretionary Everyday)
                        const targetDisplay = group.type === "REGULAR"
                          ? (targetNum > 0 ? `${fmt(targetNum)}/mo` : "—")
                          : (targetNum > 0 ? (
                              <div>
                                <div>{fmt(targetNum)}</div>
                                {poolObj?.targetDate && (
                                  <div className="text-[10px] text-zinc-400 font-sans">{poolObj.targetDate}</div>
                                )}
                              </div>
                            ) : "—");

                        return (
                          <React.Fragment key={l.bucketId}>
                            <tr
                              className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                            >
                              <td className="py-3 px-4 md:px-6 text-left">
                                <div className="font-semibold text-sm text-[#1B2B4B] dark:text-white">
                                  {l.bucketName}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center font-mono text-xs text-zinc-600 dark:text-zinc-300">
                                {targetDisplay}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-medium text-zinc-600 dark:text-zinc-300 tabular-nums">
                                {fmt(currentBal)}
                              </td>
                              <td className="py-3 px-4 md:px-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {!isReadOnly && (
                                    <button
                                      type="button"
                                      onClick={() => onLineAmountChange(l.bucketId, "0.00")}
                                      className="px-2 py-1 text-[10px] font-bold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md transition-colors cursor-pointer"
                                      title="Set to 0%"
                                    >
                                      0%
                                    </button>
                                  )}
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    disabled={isReadOnly}
                                    value={currentValStr}
                                    onChange={(e) => onLineAmountChange(l.bucketId, e.target.value)}
                                    className="w-28 px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-xl text-right font-mono font-bold text-xs focus:ring-2 focus:ring-[#2563eb] bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white tabular-nums disabled:opacity-60"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => toggleReasoning(l.bucketId)}
                                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                      openReasoningPools[l.bucketId] || Boolean(reasoningMap?.[l.bucketId] ?? l.reasoning)
                                        ? "bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400"
                                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                                    }`}
                                    title={t("paydayDrawer.showReasoning", { defaultValue: "Show or edit note / reasoning" })}
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {openReasoningPools[l.bucketId] && (
                              <tr className="bg-slate-50/50 dark:bg-zinc-800/30 border-b border-zinc-200/40 dark:border-zinc-800">
                                <td colSpan={4} className="py-2.5 px-4 md:px-6">
                                  <div className="flex items-center gap-3">
                                    <span className="text-[11px] font-bold text-zinc-400 whitespace-nowrap">
                                      {t("paydayDrawer.reasoningLabel", { defaultValue: "Reasoning / Note:" })}
                                    </span>
                                    <input
                                      type="text"
                                      value={reasoningMap?.[l.bucketId] ?? l.reasoning ?? ""}
                                      disabled={isReadOnly}
                                      placeholder={t("paydayDrawer.reasoningPlaceholder", { defaultValue: "Add reasoning for this allocation..." })}
                                      onChange={(e) => onLineReasoningChange?.(l.bucketId, e.target.value)}
                                      className="flex-1 px-3 py-1.5 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb] disabled:opacity-60"
                                    />
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
