"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { InfoTooltip, useToast, ConfirmDialog, SearchInput, RecordFilterBadge } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";

import { trpc } from "../../../lib/trpc";
import posthog from "../../../lib/posthog-client";
import { QuickExpenseDrawer as QuickActionDrawer } from "../../../components/web/QuickExpenseDrawer";
import { EnvelopeFormModal } from "../../../components/web/EnvelopeFormModal";
import { EnvelopeSummaryItem, PoolTableRow } from "./types";
import { PoolsTable } from "./components/PoolsTable";
import { EnvelopeDetailDrawer } from "../income-and-bills/components/EnvelopeDetailDrawer";
import { useLocale } from "../../../providers/LocaleProvider";

type PoolTypeFilter = "ALL" | "EVERYDAY" | "REGULAR" | "GOAL";

const POOL_TYPE_ORDER: Record<string, number> = {
  EVERYDAY: 0,
  REGULAR: 1,
  GOAL: 2,
};

function PoolsPageContent() {
  const { fmt, userTimezone } = useLocale();
  const toast = useToast();
  const utils = trpc.useUtils();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramSearch = searchParams.get("search") || searchParams.get("name") || "";
  const paramType = (searchParams.get("type") || "ALL").toUpperCase() as PoolTypeFilter;
  const poolIdParam = searchParams.get("poolId") || searchParams.get("id") || "";
  const categoryIdParam = searchParams.get("categoryId") || "";

  const poolsQuery = trpc.listPools.useQuery();
  const archivedQuery = trpc.listArchivedItems.useQuery();

  const hasArchivedCategories = archivedQuery.data?.some((i) => i.itemType === "POOL" || i.itemType === "CATEGORY" || i.itemType === "ENVELOPE") ?? false;

  const [searchQuery, setSearchQuery] = useState(paramSearch);
  const [typeFilter, setTypeFilter] = useState<PoolTypeFilter>(paramType);
  const [privacyFilter, setPrivacyFilter] = useState<"ALL" | "SHARED" | "PRIVATE">("ALL");
  const [projectionMonths] = useState(0);
  const [showProjectionMatrix] = useState(false);

  // Table pagination & sorting state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<"name" | "bankAccountName" | "poolType" | "currentBalance" | "targetAmount" | "targetDate">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Modal & Drawer state
  const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);
  const [poolToEdit, setPoolToEdit] = useState<EnvelopeSummaryItem | null>(null);
  const [isMoveMoneyOpen, setIsMoveMoneyOpen] = useState(false);
  const [selectedPoolForDrawer, setSelectedPoolForDrawer] = useState<PoolTableRow | null>(null);
  const [poolToArchive, setPoolToArchive] = useState<EnvelopeSummaryItem | null>(null);

  const archivePoolMut = trpc.archivePool.useMutation({
    onSuccess: () => {
      utils.listPools.invalidate();
    },
  });

  useEffect(() => {
    if (paramSearch) setSearchQuery(paramSearch);
    if (paramType) setTypeFilter(paramType);
  }, [paramSearch, paramType]);

  useEffect(() => {
    function handleOpenCreateModal() {
      setPoolToEdit(null);
      setIsPoolModalOpen(true);
    }
    window.addEventListener("open-create-category-modal", handleOpenCreateModal);
    return () => window.removeEventListener("open-create-category-modal", handleOpenCreateModal);
  }, []);

  const projectionQuery = trpc.getProjectedPoolBalances.useQuery(undefined, {
    enabled: showProjectionMatrix,
  });

  // Target date YYYY-MM-DD for projection query matching
  const targetDateISO = useMemo(() => {
    if (projectionMonths <= 0.05) return null;
    const d = new Date();
    d.setDate(d.getDate() + Math.round(projectionMonths * 30.4375));
    return new Intl.DateTimeFormat("en-CA", { timeZone: userTimezone }).format(d);
  }, [projectionMonths, userTimezone]);

  // Find projected column ID matching targetDateISO
  const activeProjectionColId = useMemo(() => {
    if (!targetDateISO || !projectionQuery.data?.columns || projectionQuery.data.columns.length === 0) return null;
    const sortedCols = [...projectionQuery.data.columns].sort((a, b) => a.date.localeCompare(b.date));
    let matchingCol = sortedCols[0];
    for (const col of sortedCols) {
      if (col.date <= targetDateISO) {
        matchingCol = col;
      } else {
        break;
      }
    }
    return matchingCol.id;
  }, [targetDateISO, projectionQuery.data]);

  const expenseEventsQuery = trpc.listExpenseEvents.useQuery();
  const transactionsQuery = trpc.listTransactions.useQuery({ limit: 1000 });

  // Map raw pools + categories into table rows
  const tableRows: PoolTableRow[] = useMemo(() => {
    const rawPools = poolsQuery.data ?? [];
    const rawExpenseEvents = expenseEventsQuery.data ?? [];
    const rawTransactions = transactionsQuery.data ?? [];
    const poolBalances = projectionQuery.data?.poolBalances;

    const checkHasHistory = (id: string, name: string) => {
      const qName = name.toLowerCase();
      return rawTransactions.some(
        (t) =>
          t.envelopeId === id ||
          (t.note && t.note.toLowerCase().includes(qName))
      );
    };

    const checkHasUpcoming = (id: string, name: string) => {
      const qName = name.toLowerCase();
      return rawExpenseEvents.some(
        (e) =>
          e.status !== "CONFIRMED" &&
          (e.envelopeId === id ||
            (e.name && e.name.toLowerCase().includes(qName)))
      );
    };

    return rawPools.map((p) => {
      const isGoal = p.envelopeType === "TARGET_GOAL" || p.envelopeType === "ONGOING_GOAL";
      const isBill = p.envelopeType === "SCHEDULED_BILL" || p.envelopeType === "FLEXIBLE_BILL";
      const isEveryday = p.envelopeType === "EVERYDAY";

      const targetAmountNum = p.targetAmount
        ? parseFloat(p.targetAmount)
        : p.monthlyAmount
        ? parseFloat(p.monthlyAmount)
        : null;

      let currentBal = p.currentBalance || 0;
      if (showProjectionMatrix && projectionMonths > 0.05 && activeProjectionColId && poolBalances?.[p.id]) {
        currentBal = poolBalances[p.id][activeProjectionColId] ?? currentBal;
      }

      let progressText = "—";
      let progressPercentage: number | null = null;

      if (isGoal) {
        if (p.envelopeType === "ONGOING_GOAL" || p.goalMode === "ONGOING") {
          progressText = p.budgetFrequency || t("categories.frequencyMonthly");
          progressPercentage = 100;
        } else if (targetAmountNum && targetAmountNum > 0) {
          const pct = Math.min(100, Math.round((currentBal / targetAmountNum) * 100));
          progressPercentage = pct;
          progressText = `${pct}%`;
        } else {
          progressText = "100%";
        }
      } else if (isBill) {
        const target = targetAmountNum || 0;
        if (target > 0 && currentBal >= target) {
          progressText = t("categories.fullyFunded");
        } else if (currentBal > 0) {
          progressText = t("categories.onTrack");
        } else {
          progressText = t("categories.shortfall");
        }
      } else if (isEveryday) {
        if (currentBal >= 0) {
          progressText = t("categories.readyToSpend");
        } else {
          progressText = t("categories.needsAttention");
        }
      }

      const rawSummaryItem: EnvelopeSummaryItem = {
        id: p.id,
        name: p.name,
        envelopeType: p.envelopeType,
        type: isEveryday ? "EVERYDAY" : isGoal ? "GOAL" : "REGULAR",
        poolType: isEveryday ? "EVERYDAY" : isGoal ? "GOAL" : "REGULAR",
        bankAccountId: p.bankAccountId,
        bankAccountName: p.bankAccountName || null,
        isPrivate: p.isPrivate,
        currentBalance: String(currentBal),
        targetAmount: p.targetAmount,
        enteredAmount: p.enteredAmount,
        monthlyAmount: p.monthlyAmount,
        budgetFrequency: p.budgetFrequency,
        startDate: p.startDate,
        rrule: p.rrule,
        endDate: p.endDate,
        targetDate: p.endDate,
        safetyBufferFloor: p.safetyBufferFloor,
        goalMode: p.goalMode,
        isSurplusTarget: p.isSurplusTarget,
        hasScheduledEvents: p.hasScheduledEvents,
      };

      return {
        id: p.id,
        name: p.name,
        envelopeType: p.envelopeType,
        poolType: isEveryday ? "EVERYDAY" : isGoal ? "GOAL" : "REGULAR",
        bankAccountId: p.bankAccountId,
        bankAccountName: p.bankAccountName || null,
        isPrivate: p.isPrivate,
        currentBalance: currentBal,
        targetAmount: targetAmountNum,
        endDate: p.endDate || null,
        targetDate: p.endDate || null,
        categoryCount: 0,
        progressText,
        progressPercentage,
        rawPool: rawSummaryItem,
        hasHistory: checkHasHistory(p.id, p.name),
        hasUpcomingExpenses: checkHasUpcoming(p.id, p.name),
      };
    });
  }, [poolsQuery.data, showProjectionMatrix, projectionMonths, activeProjectionColId, projectionQuery.data, expenseEventsQuery.data, transactionsQuery.data]);

  const matchedPool = poolIdParam ? tableRows.find((r) => r.id === poolIdParam) : null;
  const isFilterParamInvalid = Boolean(poolIdParam && !matchedPool);

  // Filter logic: Type filter + Privacy filter + Search
  const filteredRows = useMemo(() => {
    return tableRows.filter((row) => {
      if (poolIdParam && matchedPool && row.id !== poolIdParam) {
        return false;
      }
      if (typeFilter !== "ALL" && row.poolType !== typeFilter) {
        return false;
      }
      if (privacyFilter === "SHARED" && row.isPrivate) {
        return false;
      }
      if (privacyFilter === "PRIVATE" && !row.isPrivate) {
        return false;
      }
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      const poolNameMatch = row.name.toLowerCase().includes(q);
      const catNameMatch = (row.categories ?? []).some((c) => c.name.toLowerCase().includes(q));
      const bankNameMatch = row.bankAccountName ? row.bankAccountName.toLowerCase().includes(q) : false;
      return poolNameMatch || catNameMatch || bankNameMatch;
    });
  }, [tableRows, poolIdParam, matchedPool, typeFilter, privacyFilter, searchQuery]);

  // Sorting logic
  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      let aVal: string | number | null = null;
      let bVal: string | number | null = null;

      if (sortField === "name") {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (sortField === "bankAccountName") {
        aVal = (a.bankAccountName || "").toLowerCase();
        bVal = (b.bankAccountName || "").toLowerCase();
      } else if (sortField === "poolType") {
        const pTypeA = a.poolType ?? a.envelopeType;
        const pTypeB = b.poolType ?? b.envelopeType;
        const orderA = POOL_TYPE_ORDER[pTypeA] ?? 99;
        const orderB = POOL_TYPE_ORDER[pTypeB] ?? 99;
        return sortDir === "asc" ? orderA - orderB : orderB - orderA;
      } else if (sortField === "currentBalance") {
        aVal = a.currentBalance;
        bVal = b.currentBalance;
      } else if (sortField === "targetAmount") {
        aVal = a.targetAmount ?? -1;
        bVal = b.targetAmount ?? -1;
      } else if (sortField === "targetDate") {
        aVal = a.targetDate ?? "";
        bVal = b.targetDate ?? "";
      }

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === "") return 1;
      if (bVal === null || bVal === "") return -1;

      if (sortDir === "asc") {
        return aVal < bVal ? -1 : 1;
      } else {
        return aVal > bVal ? -1 : 1;
      }
    });
  }, [filteredRows, sortField, sortDir]);

  // Pagination logic
  const totalItems = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, page, pageSize]);

  const toggleSort = (field: "name" | "bankAccountName" | "poolType" | "currentBalance" | "targetAmount" | "targetDate") => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const fmtMoney = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "—";
    return fmt(val);
  };

  const confirmArchivePool = async () => {
    if (!poolToArchive) return;
    try {
      await archivePoolMut.mutateAsync({ poolId: poolToArchive.id });
      posthog.capture("pool_archived", { pool_type: poolToArchive.type });
      toast.success(t("toasts.archived"));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to archive pool.";
      toast.error(message);
    } finally {
      setPoolToArchive(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#1B2B4B] tracking-tight">{t("categories.title")}</h1>
            <InfoTooltip
              title={t("tooltips.categories.title")}
              content={t("tooltips.categories.content")}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMoveMoneyOpen(true)}
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-blue-50 text-[#2563eb] hover:bg-blue-100 border border-blue-200 transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <span>{t("categories.actions.moveMoney")}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setPoolToEdit(null);
              setIsPoolModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-[#2563eb] hover:bg-blue-700 transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <span>{t("categories.addPool")}</span>
          </button>
        </div>
      </div>

      {/* Controls Bar & Segmented Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-50 border border-zinc-200/80 rounded-2xl">
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 w-full">
          <SearchInput
            value={searchQuery}
            onChange={(val) => {
              setSearchQuery(val);
              setPage(1);
            }}
            placeholder={t("categories.searchPlaceholder")}
          />

          <div className="h-6 w-px bg-zinc-200 hidden sm:block" />

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center bg-white p-1 rounded-xl border border-zinc-200">
              {(["ALL", "EVERYDAY", "REGULAR", "GOAL"] as const).map((fType) => (
                <button
                  key={fType}
                  type="button"
                  onClick={() => {
                    setTypeFilter(fType);
                    setPage(1);
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    typeFilter === fType
                      ? "bg-[#2563eb] text-white shadow-xs"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  {fType === "ALL" ? t("common.all") : fType === "EVERYDAY" ? t("poolTypes.everyday") : fType === "REGULAR" ? t("poolTypes.bills") : t("poolTypes.goals")}
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-zinc-200 hidden sm:block" />

            <div className="flex items-center bg-white p-1 rounded-xl border border-zinc-200">
              {(["ALL", "SHARED", "PRIVATE"] as const).map((pType) => (
                <button
                  key={pType}
                  type="button"
                  onClick={() => {
                    setPrivacyFilter(pType);
                    setPage(1);
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    privacyFilter === pType
                      ? "bg-[#1B2B4B] text-white shadow-xs"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  {pType === "ALL" ? t("common.all") : pType === "SHARED" ? t("common.shared") : t("common.private")}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {(poolIdParam || categoryIdParam) && (
        <div className="flex items-center gap-3 flex-wrap">
          <RecordFilterBadge
            label={
              matchedPool
                ? `Filtered to Envelope: ${matchedPool.name}`
                : t("categories.requestedItemNotFound")
            }
            onClear={() => {
              const url = new URL(window.location.href);
              url.searchParams.delete("poolId");
              url.searchParams.delete("id");
              url.searchParams.delete("categoryId");
              router.push(url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ""));
            }}
          />
          {isFilterParamInvalid && (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-medium">
              {t("bankAccounts.itemNotFoundOrArchived")}
            </span>
          )}
        </div>
      )}

      {/* Hierarchical Pools Table with Optional Projection Mode Watermark */}
      <div className="relative">
        {showProjectionMatrix && projectionMonths > 0.05 && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden select-none">
            <span className="transform -rotate-12 text-7xl md:text-9xl font-black text-slate-900/[0.06] dark:text-white/[0.06] tracking-widest whitespace-nowrap uppercase">
              {t("categories.projectionModeWatermark")}
            </span>
          </div>
        )}
        <PoolsTable
          pools={paginatedRows}
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          sortField={sortField}
          sortDir={sortDir}
          toggleSort={toggleSort}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
          onEditPool={(pool) => {
            if (showProjectionMatrix) return;
            setPoolToEdit(pool);
            setIsPoolModalOpen(true);
          }}
          onOpenCategoryDrawer={(pool) => {
            setSelectedPoolForDrawer(pool);
          }}
          onAddPool={
            showProjectionMatrix
              ? undefined
              : (pType) => {
                  setPoolToEdit(pType ? ({ id: "", type: pType, poolType: pType, name: "", currentBalance: "0.00" } as EnvelopeSummaryItem) : null);
                  setIsPoolModalOpen(true);
                }
          }
          fmtMoney={fmtMoney}
          isLoading={poolsQuery.isLoading}
          searchQuery={searchQuery}
          typeFilter={typeFilter}
          isProjectionMode={showProjectionMatrix}
        />
      </div>

      {hasArchivedCategories && (
        <div className="flex justify-center pt-2">
          <Link
            href="/dashboard/settings/archived"
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            {t("categories.viewArchived")}
          </Link>
        </div>
      )}

      {/* Modals & Drawers */}
      {isMoveMoneyOpen && (
        <QuickActionDrawer
          onClose={() => {
            setIsMoveMoneyOpen(false);
            utils.listPools.invalidate();
          }}
          initialTab="TRANSFER"
        />
      )}

      {/* Create / Edit Envelope Modal */}
      <EnvelopeFormModal
        isOpen={isPoolModalOpen}
        onClose={() => setIsPoolModalOpen(false)}
        envelopeToEdit={poolToEdit}
        onSuccess={() => {
          utils.listPools.invalidate();
          utils.listExpenseEvents.invalidate();
        }}
      />

      {/* Envelope Side Drawer */}
      <EnvelopeDetailDrawer
        isOpen={Boolean(selectedPoolForDrawer)}
        categoryName={selectedPoolForDrawer?.name || ""}
        categoryId={selectedPoolForDrawer?.id}
        onClose={() => setSelectedPoolForDrawer(null)}
        onEditPool={(pool) => {
          setPoolToEdit(pool);
          setIsPoolModalOpen(true);
        }}
      />

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(poolToArchive)}
        onClose={() => setPoolToArchive(null)}
        onConfirm={confirmArchivePool}
        title={t("categories.archivePool")}
        description={t("categories.archivePoolConfirm", { name: poolToArchive?.name || "" })}
        confirmLabel={t("categories.archivePool")}
        variant="danger"
        isLoading={archivePoolMut.isPending}
      />
    </div>
  );
}

export default function PoolsPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-zinc-400">{t("categories.loading")}</div>}>
      <PoolsPageContent />
    </React.Suspense>
  );
}
