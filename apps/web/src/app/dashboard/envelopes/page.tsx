"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { useToast, RecordFilterBadge } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";

import { trpc } from "../../../lib/trpc";
import posthog from "../../../lib/posthog-client";
import { EnvelopeSummaryItem, PoolTableRow } from "./types";
import { EnvelopesTable } from "./components/EnvelopesTable";
import { EnvelopesFilterBar } from "./components/EnvelopesFilterBar";
import { EnvelopesOverflowMenu } from "./components/EnvelopesOverflowMenu";
import { EnvelopesPageModals } from "./components/EnvelopesPageModals";
import { useLocale } from "../../../providers/LocaleProvider";
import { useEnvelopesTableData, PoolTypeFilter } from "./hooks/useEnvelopesTableData";

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
  const createParam = searchParams.get("create");
  const editIdParam = searchParams.get("editId");

  const poolsQuery = trpc.listEnvelopes.useQuery();
  const archivedQuery = trpc.listArchivedItems.useQuery();
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery();
  const incomeEventsQuery = trpc.listIncomeEvents.useQuery();
  const transactionsQuery = trpc.listTransactions.useQuery({ limit: 1000 });
  const [overflowMenuOpen, setOverflowMenuOpen] = useState(false);
  const [isQuickDrawerOpen, setIsQuickDrawerOpen] = useState(false);
  const [quickDrawerTab, setQuickDrawerTab] = useState<"DEBIT" | "CREDIT" | "TRANSFER">("TRANSFER");
  const [quickDrawerInitialData, setQuickDrawerInitialData] = useState<{
    type?: "DEBIT" | "CREDIT" | "TRANSFER";
    name?: string;
    categoryId?: string;
  } | undefined>(undefined);

  const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);
  const [poolToEdit, setPoolToEdit] = useState<EnvelopeSummaryItem | null>(null);
  const [selectedPoolForDrawer, setSelectedPoolForDrawer] = useState<PoolTableRow | null>(null);
  const [poolToArchive, setPoolToArchive] = useState<EnvelopeSummaryItem | null>(null);

  const hasArchivedCategories =
    archivedQuery.data?.some(
      (i) => i.itemType === "POOL" || i.itemType === "CATEGORY" || i.itemType === "ENVELOPE"
    ) ?? false;

  const {
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    privacyFilter,
    setPrivacyFilter,
    projectionMonths,
    setProjectionMonths,
    showProjectionMatrix,
    setShowProjectionMatrix,
    page,
    setPage,
    pageSize,
    setPageSize,
    sortField,
    sortDir,
    toggleSort,
    matchedPool,
    isFilterParamInvalid,
    totalItems,
    totalPages,
    paginatedRows,
  } = useEnvelopesTableData({
    rawPools: poolsQuery.data,
    rawExpenseEvents: expenseEventsQuery.data,
    rawIncomeEvents: incomeEventsQuery.data,
    rawTransactions: transactionsQuery.data,
    projectionColumns: trpc.getProjectedPoolBalances.useQuery(undefined, {
      enabled: true,
    }).data?.columns,
    poolBalances: trpc.getProjectedPoolBalances.useQuery(undefined, {
      enabled: true,
    }).data?.poolBalances,
    userTimezone,
    paramSearch,
    paramType,
    poolIdParam,
  });

  const handledDeepLinkRef = React.useRef<string>("");
  useEffect(() => {
    const key = createParam === "1" ? `create:${paramSearch}` : editIdParam ? `edit:${editIdParam}` : "";
    if (!key || handledDeepLinkRef.current === key) return;
    if (createParam === "1") {
      handledDeepLinkRef.current = key;
      setPoolToEdit(
        paramSearch
          ? ({ id: "", type: "EVERYDAY", poolType: "EVERYDAY", name: paramSearch, currentBalance: "0.00" } as EnvelopeSummaryItem)
          : null
      );
      setIsPoolModalOpen(true);
      return;
    }
    if (editIdParam && poolsQuery.data) {
      const target = poolsQuery.data.find((p) => p.id === editIdParam);
      if (target) {
        handledDeepLinkRef.current = key;
        setPoolToEdit({
          ...target,
          type: target.envelopeType,
          poolType: target.envelopeType,
          currentBalance: String(target.currentBalance ?? 0),
          targetDate: target.endDate,
        });
        setIsPoolModalOpen(true);
      }
    }
  }, [createParam, editIdParam, paramSearch, poolsQuery.data]);

  useEffect(() => {
    function handleOpenCreateModal() {
      setPoolToEdit(null);
      setIsPoolModalOpen(true);
    }
    window.addEventListener("open-create-category-modal", handleOpenCreateModal);
    return () => window.removeEventListener("open-create-category-modal", handleOpenCreateModal);
  }, []);

  const fmtMoney = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "—";
    return fmt(val);
  };

  const archivePoolMut = trpc.archiveEnvelope.useMutation({
    onSuccess: () => {
      utils.listEnvelopes.invalidate();
    },
  });

  const handleDrawDown = (pool: { id: string; name?: string }) => {
    setSelectedPoolForDrawer(null);
    setQuickDrawerTab("DEBIT");
    setQuickDrawerInitialData({
      type: "DEBIT",
      name: pool.name ? `${pool.name} draw-down` : "Draw-down",
      categoryId: pool.id,
    });
    setIsQuickDrawerOpen(true);
  };

  const confirmArchivePool = async () => {
    if (!poolToArchive) return;
    try {
      await archivePoolMut.mutateAsync({ envelopeId: poolToArchive.id });
      if (selectedPoolForDrawer?.id === poolToArchive.id) {
        setSelectedPoolForDrawer(null);
      }
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#1B2B4B] tracking-tight">{t("categories.title")}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
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

          <EnvelopesOverflowMenu
            overflowMenuOpen={overflowMenuOpen}
            setOverflowMenuOpen={setOverflowMenuOpen}
            showProjectionMatrix={showProjectionMatrix}
            setShowProjectionMatrix={setShowProjectionMatrix}
            onQuickAction={(tab) => {
              setQuickDrawerInitialData(undefined);
              setQuickDrawerTab(tab);
              setIsQuickDrawerOpen(true);
            }}
          />
        </div>
      </div>

      {showProjectionMatrix && (
        <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/80 dark:border-blue-900/60 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-[#2563eb] uppercase tracking-wider">
                {t("categories.projectionModeTitle")}
              </span>
              <span className="text-[11px] font-bold text-zinc-500 bg-white/80 dark:bg-zinc-800/80 px-2 py-0.5 rounded-md border border-zinc-200/60 dark:border-zinc-700/60">
                {projectionMonths === 0
                  ? t("common.today")
                  : t("categories.projectedBalances", { months: projectionMonths })}
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {t("categories.projectionModeReadOnlyNotice")}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {[0, 1, 2, 3, 6, 9, 12].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setProjectionMonths(m)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all border cursor-pointer ${
                  projectionMonths === m
                    ? "bg-[#2563eb] text-white border-[#2563eb] shadow-xs"
                    : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-blue-300"
                }`}
              >
                {m === 0 ? t("common.today") : `+${m}M`}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setShowProjectionMatrix(false);
                setProjectionMonths(0);
              }}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-black/5 transition-colors cursor-pointer ml-1"
              title={t("categories.actions.exitProjection")}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <EnvelopesFilterBar
        searchQuery={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          setPage(1);
        }}
        typeFilter={typeFilter}
        onTypeFilterChange={(fType) => {
          setTypeFilter(fType);
          setPage(1);
        }}
        privacyFilter={privacyFilter}
        onPrivacyFilterChange={(pType) => {
          setPrivacyFilter(pType);
          setPage(1);
        }}
      />

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

      <div className="relative">
        {showProjectionMatrix && projectionMonths > 0.05 && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden select-none px-6">
            <span className="transform -rotate-12 text-5xl md:text-7xl lg:text-8xl font-black text-slate-900/[0.06] dark:text-white/[0.06] tracking-wider whitespace-nowrap uppercase">
              {t("categories.projectionModeWatermark")}
            </span>
          </div>
        )}
        <EnvelopesTable
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
          isProjectionMode={showProjectionMatrix}
          onEditPool={(pool) => {
            if (showProjectionMatrix) return;
            setPoolToEdit(pool);
            setIsPoolModalOpen(true);
          }}
          onDrawDown={handleDrawDown}
          onOpenCategoryDrawer={(pool) => {
            setSelectedPoolForDrawer(pool);
          }}
          onAddPool={
            showProjectionMatrix
              ? undefined
              : (pType) => {
                  setPoolToEdit(
                    pType
                      ? ({
                          id: "",
                          type: pType,
                          poolType: pType,
                          name: "",
                          currentBalance: "0.00",
                        } as EnvelopeSummaryItem)
                      : null
                  );
                  setIsPoolModalOpen(true);
                }
          }
          fmtMoney={fmtMoney}
          isLoading={poolsQuery.isLoading}
          searchQuery={searchQuery}
          typeFilter={typeFilter}
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

      <EnvelopesPageModals
        isQuickDrawerOpen={isQuickDrawerOpen}
        setIsQuickDrawerOpen={setIsQuickDrawerOpen}
        quickDrawerTab={quickDrawerTab}
        quickDrawerInitialData={quickDrawerInitialData}
        setQuickDrawerInitialData={setQuickDrawerInitialData}
        isPoolModalOpen={isPoolModalOpen}
        setIsPoolModalOpen={setIsPoolModalOpen}
        poolToEdit={poolToEdit}
        setPoolToEdit={setPoolToEdit}
        selectedPoolForDrawer={selectedPoolForDrawer}
        setSelectedPoolForDrawer={setSelectedPoolForDrawer}
        onDrawDown={handleDrawDown}
        poolToArchive={poolToArchive}
        setPoolToArchive={setPoolToArchive}
        onConfirmArchive={confirmArchivePool}
        isArchiving={archivePoolMut.isPending}
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
