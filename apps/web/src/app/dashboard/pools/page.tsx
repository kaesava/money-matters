"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { InfoTooltip, useToast, ConfirmDialog, SearchInput } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";

import { trpc } from "../../../lib/trpc";
import posthog from "../../../lib/posthog-client";
import { QuickActionDrawer } from "../../../components/web/QuickExpenseDrawer";
import { CategoryFormModal } from "../../../components/web/CategoryFormModal";
import { CategoryItemModal } from "../../../components/web/CategoryItemModal";
import { CategorySummaryItem, CategoryItem, PoolTableRow } from "./types";
import { PoolsTable } from "./components/PoolsTable";
import { CategoryDrawer } from "./components/CategoryDrawer";

type PoolTypeFilter = "ALL" | "EVERYDAY" | "REGULAR" | "GOAL";

function PoolsPageContent() {
  const toast = useToast();
  const utils = trpc.useUtils();
  const searchParams = useSearchParams();
  const paramSearch = searchParams.get("search") || searchParams.get("name") || "";
  const paramType = (searchParams.get("type") || "ALL").toUpperCase() as PoolTypeFilter;

  const poolsQuery = trpc.listPools.useQuery();
  const categoriesQuery = trpc.listCategories.useQuery();
  const archivedQuery = trpc.listArchivedItems.useQuery();

  const hasArchivedCategories = archivedQuery.data?.some((i) => i.itemType === "POOL" || i.itemType === "CATEGORY") ?? false;

  const [searchQuery, setSearchQuery] = useState(paramSearch);
  const [typeFilter, setTypeFilter] = useState<PoolTypeFilter>(paramType);
  const [privacyFilter, setPrivacyFilter] = useState<"ALL" | "SHARED" | "PRIVATE">("ALL");
  const [projectionMonths, setProjectionMonths] = useState(0);
  const [showProjectionMatrix, setShowProjectionMatrix] = useState(false);

  // Table pagination & sorting state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<"name" | "bankAccountName" | "poolType" | "currentBalance" | "targetAmount" | "targetDate">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Modal & Drawer state
  const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);
  const [poolToEdit, setPoolToEdit] = useState<CategorySummaryItem | null>(null);
  const [isMoveMoneyOpen, setIsMoveMoneyOpen] = useState(false);
  const [selectedPoolForDrawer, setSelectedPoolForDrawer] = useState<PoolTableRow | null>(null);
  const [poolToArchive, setPoolToArchive] = useState<CategorySummaryItem | null>(null);

  // Category item modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<CategoryItem | null>(null);
  const [categoryInitialPoolId, setCategoryInitialPoolId] = useState<string | null>(null);

  const archivePoolMut = trpc.archivePool.useMutation({
    onSuccess: () => {
      utils.listPools.invalidate();
      utils.listCategories.invalidate();
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

  const formatProjectionDate = (months: number) => {
    if (months <= 0.05) return "Today";
    const d = new Date();
    d.setDate(d.getDate() + Math.round(months * 30.4375));
    return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Sydney" }).format(d);
  };

  const projectionTargetDate = useMemo(() => formatProjectionDate(projectionMonths), [projectionMonths]);

  const axisDates = useMemo(() => {
    return [0, 3, 6, 9, 12].map((m) => {
      if (m === 0) return "Today";
      const d = new Date();
      d.setMonth(d.getMonth() + m);
      return new Intl.DateTimeFormat("en-AU", { month: "short", year: "2-digit", timeZone: "Australia/Sydney" }).format(d);
    });
  }, []);

  // Map raw pools + categories into table rows
  const tableRows: PoolTableRow[] = useMemo(() => {
    const rawPools = poolsQuery.data ?? [];
    const rawCategories = categoriesQuery.data ?? [];

    return rawPools.map((p) => {
      const poolCats: CategoryItem[] = rawCategories
        .filter((c) => c.poolId === p.id)
        .map((c) => ({
          id: c.id,
          poolId: c.poolId,
          name: c.name,
          monthlyAmount: c.monthlyAmount,
          enteredAmount: c.enteredAmount,
          budgetFrequency: c.budgetFrequency,
          isEssential: c.isEssential,
          monthlySpent: c.monthlySpent,
        }));

      let targetAmountNum: number | null = null;
      if (p.poolType === "GOAL") {
        targetAmountNum = p.targetAmount ? parseFloat(p.targetAmount) : null;
      } else {
        const catSum = poolCats.reduce((sum, c) => sum + (c.monthlyAmount ? parseFloat(c.monthlyAmount) : 0), 0);
        targetAmountNum = catSum > 0 ? catSum : (p.targetAmount ? parseFloat(p.targetAmount) : null);
      }

      let progressText = "—";
      let progressPercentage: number | null = null;

      if (p.poolType === "GOAL") {
        if (targetAmountNum && targetAmountNum > 0) {
          const pct = Math.min(100, Math.round(((p.currentBalance || 0) / targetAmountNum) * 100));
          progressPercentage = pct;
          progressText = `${pct}%`;
        } else {
          progressText = "100%";
        }
      } else if (p.poolType === "REGULAR") {
        const target = targetAmountNum || 0;
        const cur = p.currentBalance || 0;
        if (target > 0 && cur >= target) {
          progressText = t("categories.fullyFunded");
        } else if (cur > 0) {
          progressText = t("categories.onTrack");
        } else {
          progressText = t("categories.shortfall");
        }
      } else if (p.poolType === "EVERYDAY") {
        const cur = p.currentBalance || 0;
        if (cur >= 0) {
          progressText = t("categories.readyToSpend");
        } else {
          progressText = t("categories.needsAttention");
        }
      }

      const rawSummaryItem: CategorySummaryItem = {
        id: p.id,
        name: p.name,
        type: p.poolType as "REGULAR" | "GOAL" | "EVERYDAY",
        poolType: p.poolType as "REGULAR" | "GOAL" | "EVERYDAY",
        bankAccountId: p.bankAccountId,
        bankAccountName: p.bankAccountName || null,
        isPrivate: p.isPrivate,
        currentBalance: String(p.currentBalance || "0"),
        everydayAllowanceAmount: p.everydayAllowanceAmount,
        targetAmount: p.targetAmount,
        targetDate: p.targetDate,
        healthStatus: p.healthStatus,
        isSurplusTarget: p.isSurplusTarget,
      };

      return {
        id: p.id,
        name: p.name,
        poolType: p.poolType as "REGULAR" | "GOAL" | "EVERYDAY",
        bankAccountId: p.bankAccountId,
        bankAccountName: p.bankAccountName || null,
        isPrivate: p.isPrivate,
        currentBalance: p.currentBalance || 0,
        targetAmount: targetAmountNum,
        targetDate: p.targetDate || null,
        categoryCount: poolCats.length,
        categories: poolCats,
        progressText,
        progressPercentage,
        rawPool: rawSummaryItem,
      };
    });
  }, [poolsQuery.data, categoriesQuery.data]);

  // Filter logic: Type filter + Privacy filter + Search
  const filteredRows = useMemo(() => {
    return tableRows.filter((row) => {
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
      const catNameMatch = row.categories.some((c) => c.name.toLowerCase().includes(q));
      const bankNameMatch = row.bankAccountName ? row.bankAccountName.toLowerCase().includes(q) : false;
      return poolNameMatch || catNameMatch || bankNameMatch;
    });
  }, [tableRows, typeFilter, privacyFilter, searchQuery]);

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
        aVal = a.poolType;
        bVal = b.poolType;
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
    return `$${val.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

  const handleOpenAddCategoryModal = (poolId: string) => {
    setCategoryToEdit(null);
    setCategoryInitialPoolId(poolId);
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategoryModal = (cat: CategoryItem) => {
    setCategoryToEdit(cat);
    setCategoryInitialPoolId(cat.poolId);
    setIsCategoryModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#1B2B4B] tracking-tight">Pools</h1>
            <InfoTooltip
              title={t("tooltips.categories.title")}
              content={t("tooltips.categories.content")}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowProjectionMatrix(!showProjectionMatrix)}
            className={`px-3.5 py-2.5 rounded-xl font-bold text-xs border transition-all shadow-2xs cursor-pointer ${
              showProjectionMatrix
                ? "bg-blue-100 text-[#2563eb] border-blue-300"
                : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            {showProjectionMatrix ? "Hide Projection Timeline" : "Projection Timeline"}
          </button>
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
            <span>New Pool</span>
          </button>
        </div>
      </div>

      {/* Projection Matrix */}
      {showProjectionMatrix && (
        <div className="p-5 bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-purple-50/90 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 border border-blue-200/80 dark:border-blue-900/60 rounded-2xl shadow-xs relative overflow-hidden animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-[#1B2B4B] dark:text-blue-200 tracking-wider">
                {t("incomeBillsTabs.timelineSliderLabel")}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {projectionMonths > 0.05 && (
                <button
                  type="button"
                  onClick={() => setProjectionMonths(0)}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg shadow-xs transition-all animate-in fade-in flex items-center gap-1 cursor-pointer"
                >
                  <span>Snap to Today</span>
                </button>
              )}
              <span className="text-xs font-bold font-mono text-[#2563eb] bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-800 px-3 py-1 rounded-xl shadow-2xs">
                {projectionMonths <= 0.05 ? "Today (Actuals)" : projectionTargetDate}
              </span>
            </div>
          </div>

          <div className="relative pt-6 pb-2">
            <div
              className="absolute top-0 text-[11px] font-black font-mono bg-[#2563eb] text-white px-2.5 py-0.5 rounded-md shadow-md pointer-events-none transition-all"
              style={{
                left: `${Math.min(94, Math.max(6, (projectionMonths / 12) * 100))}%`,
                transform: "translateX(-50%)",
              }}
            >
              {projectionTargetDate}
            </div>

            <input
              type="range"
              min={0}
              max={12}
              step={0.1}
              value={projectionMonths}
              onChange={(e) => setProjectionMonths(parseFloat(e.target.value))}
              className="w-full h-2.5 bg-blue-200/80 dark:bg-blue-900 rounded-lg appearance-none cursor-pointer accent-[#2563eb] focus:outline-none"
            />
          </div>

          <div className="flex justify-between text-[10px] font-bold text-zinc-400 font-mono mt-1 px-1">
            {axisDates.map((label: string, idx: number) => (
              <span key={idx} className={idx === 0 && projectionMonths <= 0.05 ? "text-[#2563eb] font-extrabold" : ""}>
                {label}
              </span>
            ))}
          </div>

          {projectionMonths > 0.05 && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-xl flex items-center justify-between text-xs animate-in slide-in-from-top-2 duration-150">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-900 dark:text-amber-200">
                  PROJECTION MODE: Showing estimated pool balances as of <strong>{projectionTargetDate}</strong>.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setProjectionMonths(0)}
                className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer"
              >
                Reset to Today →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Controls Bar & Segmented Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-50 border border-zinc-200/80 rounded-2xl">
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 w-full">
          <SearchInput
            value={searchQuery}
            onChange={(val) => {
              setSearchQuery(val);
              setPage(1);
            }}
            placeholder="Search Pool Name, Category, or Bank Account..."
          />

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
                  {fType === "ALL" ? "All" : fType === "EVERYDAY" ? "Everyday" : fType === "REGULAR" ? "Bills" : "Goals"}
                </button>
              ))}
            </div>

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
                  {pType === "ALL" ? "All" : pType === "SHARED" ? "Shared" : "Private"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Flat Pools Table */}
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
          setPoolToEdit(pool);
          setIsPoolModalOpen(true);
        }}
        onOpenCategoryDrawer={(pool) => {
          setSelectedPoolForDrawer(pool);
        }}
        onAddCategoryForPool={handleOpenAddCategoryModal}
        fmtMoney={fmtMoney}
        isLoading={poolsQuery.isLoading}
      />

      {hasArchivedCategories && (
        <div className="flex justify-center pt-2">
          <a
            href="/dashboard/settings/archived"
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            {t("categories.viewArchived") || "View archived pools →"}
          </a>
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

      {/* Create / Edit Pool Modal */}
      <CategoryFormModal
        isOpen={isPoolModalOpen}
        onClose={() => setIsPoolModalOpen(false)}
        categoryToEdit={poolToEdit}
        onSuccess={() => utils.listPools.invalidate()}
      />

      {/* Create / Edit Category Modal */}
      <CategoryItemModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categoryToEdit={categoryToEdit}
        initialPoolId={categoryInitialPoolId}
        onSuccess={() => {
          utils.listCategories.invalidate();
          utils.listPools.invalidate();
        }}
      />

      {/* Category Side Drawer */}
      <CategoryDrawer
        pool={selectedPoolForDrawer}
        onClose={() => setSelectedPoolForDrawer(null)}
        onAddCategory={(poolId) => {
          handleOpenAddCategoryModal(poolId);
        }}
        onEditCategory={(cat) => {
          handleOpenEditCategoryModal(cat);
        }}
      />

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(poolToArchive)}
        onClose={() => setPoolToArchive(null)}
        onConfirm={confirmArchivePool}
        title="Archive Pool"
        description={`Are you sure you want to archive "${poolToArchive?.name || ""}"?`}
        confirmLabel="Archive Pool"
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
