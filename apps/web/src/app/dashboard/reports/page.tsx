"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "../../../lib/trpc";
import { t } from "@money-matters/i18n";
import {
  Tabs,
  Spinner,
  SearchInput,
  PoolPicker,
  SpendingOverviewCard,
  InfoTooltip,
} from "@money-matters/ui/web";
import { useLocale } from "../../../providers/LocaleProvider";
import { useAppFeatures } from "../../../hooks/useAppFeatures";
import type { SpendingTimeframe, SpendingFlowType } from "@money-matters/types";

function ReportsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "payday-plans" ? "payday-plans" : "spending";
  const [activeTab, setActiveTab] = useState(initialTab);
  const { hasReports } = useAppFeatures();
  const { fmt } = useLocale();

  useEffect(() => {
    if (!hasReports) {
      router.replace("/dashboard");
    }
  }, [hasReports, router]);

  // Tab 1 (Spending) filters
  const [spendingTimeframe, setSpendingTimeframe] = useState<SpendingTimeframe>("90D");
  const [spendingSearch, setSpendingSearch] = useState("");
  const [debouncedSpendingSearch, setDebouncedSpendingSearch] = useState("");
  const [spendingPool, setSpendingPool] = useState("ALL");
  const [spendingBank, setSpendingBank] = useState("ALL");
  const [spendingFlowType, setSpendingFlowType] = useState<SpendingFlowType>("ALL");

  // Tab 2 (Payday Plans) filters
  const [planTimeframe, setPlanTimeframe] = useState<SpendingTimeframe>("90D");
  const [planSearch, setPlanSearch] = useState("");
  const [debouncedPlanSearch, setDebouncedPlanSearch] = useState("");
  const [planBank, setPlanBank] = useState("ALL");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSpendingSearch(spendingSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [spendingSearch]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedPlanSearch(planSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [planSearch]);

  const poolsQuery = trpc.listEnvelopes.useQuery(undefined, { enabled: hasReports });
  const bankAccountsQuery = trpc.getBankAccountsWithMappings.useQuery(undefined, {
    enabled: hasReports,
  });

  const pools = useMemo(() => poolsQuery.data ?? [], [poolsQuery.data]);
  const bankAccounts = useMemo(() => bankAccountsQuery.data ?? [], [bankAccountsQuery.data]);

  const spendingAnalyticsQuery = trpc.getSpendingAnalytics.useQuery(
    {
      timeframe: spendingTimeframe,
      envelopeId: spendingPool !== "ALL" ? spendingPool : undefined,
      bankAccountId: spendingBank !== "ALL" ? spendingBank : undefined,
      searchQuery:
        debouncedSpendingSearch.trim().length >= 2 ? debouncedSpendingSearch.trim() : undefined,
      flowType: spendingFlowType,
    },
    { enabled: hasReports && activeTab === "spending" }
  );

  const incomeSplitAnalyticsQuery = trpc.getPaydayPlanAnalytics.useQuery(
    {
      timeframe: planTimeframe,
      bankAccountId: planBank !== "ALL" ? planBank : undefined,
      searchQuery: debouncedPlanSearch.trim().length >= 2 ? debouncedPlanSearch.trim() : undefined,
    },
    { enabled: hasReports && activeTab === "payday-plans" }
  );

  const incomeSplitLabels = useMemo(
    () => ({
      overviewTitle: t("history.reporting.incomeSplits.overviewTitle"),
      overviewSubtitle: t("history.reporting.incomeSplits.overviewSubtitle"),
      filteredOverviewTitle: t("history.reporting.incomeSplits.filteredOverviewTitle"),
      filteredOverviewSubtitle: t("history.reporting.incomeSplits.filteredOverviewSubtitle"),
      donutTitle: t("history.reporting.incomeSplits.donutTitle"),
      filteredDonutTitle: t("history.reporting.incomeSplits.filteredDonutTitle"),
      cashFlowTitle: t("history.reporting.incomeSplits.cashFlowTitle"),
      filteredCashFlowTitle: t("history.reporting.incomeSplits.filteredCashFlowTitle"),
      topPoolsTitle: t("history.reporting.incomeSplits.topPoolsTitle"),
      filteredTopPoolsTitle: t("history.reporting.incomeSplits.filteredTopPoolsTitle"),
      centerLabel: t("history.reporting.incomeSplits.totalAllocated"),
      inflowLegend: t("history.reporting.incomeSplits.inflow"),
      outflowLegend: t("history.reporting.incomeSplits.sweepOutflow"),
      emptyText: t("history.reporting.incomeSplits.empty"),
    }),
    []
  );

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.replace(`/dashboard/reports?tab=${tabId}`, { scroll: false });
  };

  const tabsList = [
    { id: "spending", label: t("reports.tabs.spending") },
    { id: "payday-plans", label: t("reports.tabs.paydayPlans") },
  ];

  const hasActiveSpendingFilters =
    spendingSearch.trim().length > 0 ||
    spendingPool !== "ALL" ||
    spendingBank !== "ALL" ||
    spendingFlowType !== "ALL";

  const hasActivePlanFilters = planSearch.trim().length > 0 || planBank !== "ALL";

  if (!hasReports) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl pb-16 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-extrabold text-[#1B2B4B]">{t("reports.title")}</h1>
          <InfoTooltip title={t("reports.title")} content={t("reports.subtitle")} />
        </div>
      </div>

      {/* 2-Tab Navigation Bar */}
      <Tabs tabs={tabsList} activeTab={activeTab} onChange={handleTabChange} />

      {/* Tab 1: Spending & Cash Flow */}
      {activeTab === "spending" && (
        <div className="space-y-6">
          {/* Controls Bar & Segmented Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-50 border border-zinc-200/80 rounded-2xl">
            <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 w-full">
              <SearchInput
                value={spendingSearch}
                onChange={setSpendingSearch}
                placeholder={t("reports.filters.searchSpendingPlaceholder")}
              />

              <div className="h-6 w-px bg-zinc-200 hidden sm:block" />

              <div className="w-full sm:w-56 text-xs">
                <PoolPicker
                  pools={pools.map((p) => ({
                    id: p.id,
                    name: p.name,
                    poolType: p.envelopeType,
                    isPrivate: p.isPrivate,
                  }))}
                  allowAllOption={true}
                  selectedPoolId={spendingPool}
                  allowCategorySelection={false}
                  placeholder={t("reports.filters.allEnvelopes")}
                  showBalance={false}
                  onChange={(sel) => setSpendingPool(sel.poolId || "ALL")}
                />
              </div>

              <select
                value={spendingBank}
                onChange={(e) => setSpendingBank(e.target.value)}
                className="w-full sm:w-48 px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-zinc-700"
              >
                <option value="ALL">{t("reports.filters.allBanks")}</option>
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              {/* Segmented Flow Filter */}
              <div className="flex items-center bg-zinc-100 p-0.5 rounded-xl border border-zinc-200">
                {(["ALL", "DEBIT", "CREDIT", "TRANSFER"] as const).map((tType) => (
                  <button
                    key={tType}
                    type="button"
                    onClick={() => setSpendingFlowType(tType)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      spendingFlowType === tType
                        ? "bg-[#2563eb] text-white shadow-xs"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    {tType === "ALL"
                      ? t("history.filterAll")
                      : tType === "DEBIT"
                      ? t("history.filterDebit")
                      : tType === "CREDIT"
                      ? t("history.filterCredit")
                      : t("history.filterTransfer")}
                  </button>
                ))}
              </div>
            </div>

            {hasActiveSpendingFilters && (
              <button
                type="button"
                onClick={() => {
                  setSpendingSearch("");
                  setSpendingPool("ALL");
                  setSpendingBank("ALL");
                  setSpendingFlowType("ALL");
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
              >
                {t("reports.filters.clearAll")}
              </button>
            )}
          </div>

          {/* Visual Analytics */}
          <SpendingOverviewCard
            analytics={spendingAnalyticsQuery.data}
            isLoading={spendingAnalyticsQuery.isLoading}
            timeframe={spendingTimeframe}
            onTimeframeChange={setSpendingTimeframe}
            formatCurrency={(amt) => fmt(amt)}
          />
        </div>
      )}

      {/* Tab 2: Payday Plans */}
      {activeTab === "payday-plans" && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-50 border border-zinc-200/80 rounded-2xl">
            <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 w-full">
              <SearchInput
                value={planSearch}
                onChange={setPlanSearch}
                placeholder={t("reports.filters.searchPaydaysPlaceholder")}
              />

              <div className="h-6 w-px bg-zinc-200 hidden sm:block" />

              <select
                value={planBank}
                onChange={(e) => setPlanBank(e.target.value)}
                className="w-full sm:w-56 px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-zinc-700"
              >
                <option value="ALL">{t("reports.filters.allBanks")}</option>
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {hasActivePlanFilters && (
              <button
                type="button"
                onClick={() => {
                  setPlanSearch("");
                  setPlanBank("ALL");
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
              >
                {t("reports.filters.clearAll")}
              </button>
            )}
          </div>

          {/* Visual Analytics */}
          <SpendingOverviewCard
            analytics={incomeSplitAnalyticsQuery.data}
            isLoading={incomeSplitAnalyticsQuery.isLoading}
            timeframe={planTimeframe}
            onTimeframeChange={setPlanTimeframe}
            formatCurrency={(amt) => fmt(amt)}
            labels={incomeSplitLabels}
            showPayeesWhenFiltered={false}
          />
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <ReportsPageContent />
    </Suspense>
  );
}
