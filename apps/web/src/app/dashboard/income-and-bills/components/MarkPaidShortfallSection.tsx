"use client";

import React, { useState, useMemo } from "react";
import { t } from "@money-matters/i18n";
import { AmountField } from "@money-matters/ui/web";
import type { CategoryOption } from "./MarkPaidModal";

export type FilterBadge = "ALL" | "TARGET_GOAL" | "ONGOING_GOAL" | "FLEXIBLE_BILL" | "SCHEDULED_BILL";

export interface MarkPaidShortfallSectionProps {
  billName: string;
  formattedPoolName: string;
  shortfallAmount: number;
  isFulfilled: boolean;
  fundingPools: CategoryOption[];
  transferAmounts: Record<string, string>;
  handleTransferChange: (poolId: string, val: string) => void;
  handleFillMax: (poolId: string, available: number) => void;
  currency: string;
  currencySymbol: string;
  minorUnits: number;
  fmt: (val: string | number) => string;
  totalAllocated: number;
  remainingShortfall: number;
  isOverAllocated: boolean;
  overAllocatedAmount: number;
  onOpenTransferModal?: () => void;
}

export function MarkPaidShortfallSection({
  billName: _billName,
  formattedPoolName,
  shortfallAmount,
  isFulfilled,
  fundingPools,
  transferAmounts,
  handleTransferChange,
  handleFillMax,
  currency,
  currencySymbol,
  minorUnits,
  fmt,
  totalAllocated,
  remainingShortfall,
  isOverAllocated,
  overAllocatedAmount,
  onOpenTransferModal,
}: MarkPaidShortfallSectionProps) {
  const [selectedFilter, setSelectedFilter] = useState<FilterBadge>("ALL");
  const [sortAsc, setSortAsc] = useState(true);

  const filterBadges: Array<{ id: FilterBadge; label: string }> = [
    { id: "ALL", label: t("common.all") },
    { id: "TARGET_GOAL", label: t("categories.targetDateGoalBadge") },
    { id: "ONGOING_GOAL", label: t("categories.ongoingGoalBadge") },
    { id: "FLEXIBLE_BILL", label: t("categories.flexibleBillBadge") },
    { id: "SCHEDULED_BILL", label: t("categories.scheduledBillBadge") },
  ];

  const filteredPools = useMemo(() => {
    return fundingPools.filter((p) => {
      if (selectedFilter === "ALL") return true;
      const type = (p as unknown as { envelopeType?: string }).envelopeType || p.poolType;
      return type === selectedFilter;
    });
  }, [fundingPools, selectedFilter]);

  const sortedPools = useMemo(() => {
    return [...filteredPools].sort((a, b) => {
      // Sweep target always pinned first
      if (a.isSurplusTarget && !b.isSurplusTarget) return -1;
      if (!a.isSurplusTarget && b.isSurplusTarget) return 1;
      return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    });
  }, [filteredPools, sortAsc]);

  return (
    <>
      {/* Insufficient Funds Warning Banner */}
      <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl space-y-3">
        <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 leading-relaxed">
          {t("incomeBillsTabs.insufficientModalMessage", {
            envelopeName: formattedPoolName,
            amount: fmt(shortfallAmount),
          })}
        </p>

        {isFulfilled ? (
          <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-bold text-emerald-800 dark:text-emerald-300">
            <span>✓</span>
            <span>
              {t("incomeBillsTabs.shortfallCovered", {
                amount: fmt(shortfallAmount),
              })}
            </span>
          </div>
        ) : isOverAllocated ? (
          <div className="flex items-start gap-2 p-2.5 bg-amber-100/70 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-lg text-xs font-semibold text-amber-900 dark:text-amber-200">
            <span className="text-amber-600 dark:text-amber-400">⚠️</span>
            <span>
              {t("incomeBillsTabs.shortfallOverAllocated", {
                amount: fmt(overAllocatedAmount),
              })}
            </span>
          </div>
        ) : (
          <div className="flex items-start gap-2 p-2.5 bg-amber-100/70 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-lg text-xs font-semibold text-amber-900 dark:text-amber-200">
            <span className="text-amber-600 dark:text-amber-400">⚠️</span>
            <span>
              {t("incomeBillsTabs.shortfallRemaining", {
                amount: fmt(Math.max(0, remainingShortfall)),
              })}
            </span>
          </div>
        )}
      </div>

      {/* Header and Subtitle on distinct lines */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-[#1B2B4B] dark:text-zinc-200 uppercase tracking-wider block">
          {t("incomeBillsTabs.fundingSourceSelectLabel")}
        </label>
        <p className="text-[11px] text-zinc-400 italic">
          {t("incomeBillsTabs.hiddenZeroBalanceNote")}
        </p>
      </div>

      {/* Filter Badges Strip */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {filterBadges.map((badge) => {
          const isActive = selectedFilter === badge.id;
          return (
            <button
              key={badge.id}
              type="button"
              onClick={() => setSelectedFilter(badge.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                isActive
                  ? "bg-[#2563eb] text-white shadow-xs"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              {badge.label}
            </button>
          );
        })}
      </div>

      {/* Flat Envelopes Table */}
      <div className="max-h-[35vh] overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-xl divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
        {sortedPools.length === 0 ? (
          <div className="p-6 text-center text-xs text-zinc-500 font-semibold">
            {t("incomeBillsTabs.coverShortfallNoEnvelopes")}
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wider bg-zinc-50/70 dark:bg-zinc-800/50 sticky top-0 z-10 backdrop-blur-xs">
                <th
                  className="py-2 px-4 text-left cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200 select-none"
                  onClick={() => setSortAsc(!sortAsc)}
                >
                  <div className="flex items-center gap-1">
                    <span>{t("tables.name")}</span>
                    <span>{sortAsc ? "▲" : "▼"}</span>
                  </div>
                </th>
                <th className="py-2 px-4 text-right">{t("tables.available")}</th>
                <th className="py-2 px-4 text-right">{t("tables.transferAmount")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
              {sortedPools.map((p) => {
                const available =
                  typeof p.currentBalance === "string"
                    ? parseFloat(p.currentBalance || "0")
                    : (p.currentBalance ?? 0);
                const val = transferAmounts[p.id] || "";
                return (
                  <tr key={p.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40">
                    <td className="py-2.5 px-4 text-left font-semibold text-zinc-800 dark:text-zinc-200">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{p.name}</span>
                        {p.isSurplusTarget && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            {t("categories.surplusBadge")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-medium text-zinc-500 tabular-nums">
                      {fmt(available)}
                    </td>
                    <td className="py-2.5 px-4 text-right w-44">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleFillMax(p.id, available)}
                          className="text-[10px] font-bold text-[#2563eb] hover:underline px-1 py-0.5"
                          title={t("incomeBillsTabs.allocateMaxTooltip")}
                        >
                          {t("common.max")}
                        </button>
                        <div className="w-28">
                          <AmountField
                            value={val}
                            onChange={(v) => handleTransferChange(p.id, v)}
                            placeholder="0.00"
                            allowNegative={false}
                            currency={currency}
                            currencySymbol={currencySymbol}
                            minorUnits={minorUnits}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Allocation Summary Footer Bar */}
      <div className="p-3 bg-zinc-50 dark:bg-zinc-800/80 rounded-xl border border-zinc-200 dark:border-zinc-700/80 flex items-center justify-between text-xs font-semibold">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-zinc-500 block text-[10px] uppercase font-bold">{t("tables.totalAllocated")}</span>
            <span className="font-mono font-bold text-sm text-[#1B2B4B] dark:text-white tabular-nums">
              {fmt(totalAllocated)}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[10px] uppercase font-bold">{t("tables.remainingShortfall")}</span>
            <span className={`font-mono font-bold text-sm tabular-nums ${remainingShortfall <= 0.005 ? "text-emerald-600" : "text-amber-600"}`}>
              {fmt(Math.max(0, remainingShortfall))}
            </span>
          </div>
        </div>

        {onOpenTransferModal && (
          <button
            type="button"
            onClick={onOpenTransferModal}
            className="text-xs font-bold text-[#2563eb] hover:underline"
          >
            {t("incomeBillsTabs.openCustomTransferModalLink")}
          </button>
        )}
      </div>
    </>
  );
}
