"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast, ConfirmDialog, RecordFilterBadge } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";

import { trpc } from "../../../lib/trpc";
import posthog from "../../../lib/posthog-client";
import { QuickExpenseDrawer as QuickActionDrawer } from "../../../components/web/QuickExpenseDrawer";
import { EnvelopeFormModal } from "../../../components/web/EnvelopeFormModal";
import { EnvelopeSummaryItem, PoolTableRow } from "./types";
import { PoolsTable } from "./components/PoolsTable";
import { EnvelopesFilterBar } from "./components/EnvelopesFilterBar";
import { EnvelopeDetailDrawer } from "../income-and-bills/components/EnvelopeDetailDrawer";
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

  const poolsQuery = trpc.listPools.useQuery();
  const archivedQuery = trpc.listArchivedItems.useQuery();
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery();
  const transactionsQuery = trpc.listTransactions.useQuery({ limit: 1000 });
  const projectionQuery = trpc.getProjectedPoolBalances.useQuery(undefined, { enabled: false });

  const hasArchivedCategories =
    archivedQuery.data?.some(
      (i) => i.itemType === "POOL" || i.itemType === "CATEGORY" || i.itemType === "ENVELOPE"
    ) ?? false;

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

  const {
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    privacyFilter,
    setPrivacyFilter,
    projectionMonths,
    showProjectionMatrix,
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
    rawTransactions: transactionsQuery.data,
    projectionColumns: projectionQuery.data?.columns,
    poolBalances: projectionQuery.data?.poolBalances,
    userTimezone,
    paramSearch,
    paramType,
    poolIdParam,
  });

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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#1B2B4B] tracking-tight">{t("categories.title")}</h1>
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

      {isMoveMoneyOpen && (
        <QuickActionDrawer
          onClose={() => {
            setIsMoveMoneyOpen(false);
            utils.listPools.invalidate();
          }}
          initialTab="TRANSFER"
        />
      )}

      <EnvelopeFormModal
        isOpen={isPoolModalOpen}
        onClose={() => setIsPoolModalOpen(false)}
        envelopeToEdit={poolToEdit}
        onSuccess={() => {
          utils.listPools.invalidate();
          utils.listExpenseEvents.invalidate();
        }}
      />

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
