"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { monthProgress } from "@money-matters/ui";
import { InfoTooltip, useToast } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../lib/trpc";
import posthog from "../../../lib/posthog-client";
import { CategoryDetailDrawer } from "../../../components/web/CategoryDetailDrawer";
import { QuickActionDrawer } from "../../../components/web/QuickExpenseDrawer";
import { FilterBar } from "../../../components/web/FilterBar";
import { CategoryFormModal } from "../../../components/web/CategoryFormModal";
import { CategoryActivityModal } from "../../../components/web/CategoryActivityModal";
import { EverydayPoolSection, CategorySummaryItem } from "./components/EverydayPoolSection";
import { RegularBillsSection } from "./components/RegularBillsSection";
import { SavingsGoalsSection } from "./components/SavingsGoalsSection";

function CategoriesPageContent() {
  const toast = useToast();
  const utils = trpc.useUtils();
  const searchParams = useSearchParams();
  const paramSearch = searchParams.get("search") || searchParams.get("name") || "";
  const paramHealth = searchParams.get("health") || searchParams.get("status") || "ALL";

  const categoriesQuery = trpc.listCategories.useQuery();
  const categories = (categoriesQuery.data ?? []) as CategorySummaryItem[];

  const billCoverageQuery = trpc.listBillCoverage.useQuery();
  const billCoverageItems = billCoverageQuery.data?.items ?? [];

  const archivedQuery = trpc.listArchivedItems.useQuery();
  const hasArchivedCategories = archivedQuery.data?.some(i => i.itemType === 'CATEGORY') ?? false;

  // Filter States
  const [searchQuery, setSearchQuery] = useState(paramSearch);
  const [healthFilter, setHealthFilter] = useState(paramHealth);
  const [projectionMonths, setProjectionMonths] = useState(0);

  const formatProjectionDate = (months: number) => {
    if (months <= 0.05) return "Today";
    const d = new Date();
    d.setDate(d.getDate() + Math.round(months * 30.4375));
    return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Sydney" }).format(d);
  };

  const projectionTargetDate = React.useMemo(() => formatProjectionDate(projectionMonths), [projectionMonths]);

  const axisDates = React.useMemo(() => {
    return [0, 3, 6, 9, 12].map((m) => {
      if (m === 0) return "Today";
      const d = new Date();
      d.setMonth(d.getMonth() + m);
      return new Intl.DateTimeFormat("en-AU", { month: "short", year: "2-digit", timeZone: "Australia/Sydney" }).format(d);
    });
  }, []);

  // Section Collapse States (Collapsed by default, expanded if filtered)
  const isFiltered = Boolean(paramSearch || searchQuery.trim() || (paramHealth && paramHealth !== "ALL") || (healthFilter && healthFilter !== "ALL"));
  const [isEverydayCollapsed, setIsEverydayCollapsed] = useState(!isFiltered);
  const [isRegularCollapsed, setIsRegularCollapsed] = useState(!isFiltered);

  useEffect(() => {
    if (paramSearch) setSearchQuery(paramSearch);
    if (paramHealth) setHealthFilter(paramHealth);
  }, [paramSearch, paramHealth]);

  useEffect(() => {
    if (searchQuery.trim() || healthFilter !== "ALL") {
      setIsEverydayCollapsed(false);
      setIsRegularCollapsed(false);
    }
  }, [searchQuery, healthFilter]);

  // Listen for global floating + button event on Pools screen
  useEffect(() => {
    function handleOpenCreateModal() {
      setCategoryToEdit(null);
      setIsFormModalOpen(true);
    }
    window.addEventListener("open-create-category-modal", handleOpenCreateModal);
    return () => window.removeEventListener("open-create-category-modal", handleOpenCreateModal);
  }, []);

  // Selection & Modals
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<CategorySummaryItem | null>(null);
  const [activityCategory, setActivityCategory] = useState<CategorySummaryItem | null>(null);
  const [isMoveMoneyOpen, setIsMoveMoneyOpen] = useState(false);

  // Month progress
  const { elapsedPct } = monthProgress();

  // Mutations
  const archiveCategoryMut = trpc.archiveCategory.useMutation({
    onSuccess: () => {
      utils.listCategories.invalidate();
      utils.listBillCoverage.invalidate();
    },
  });

  const handleArchive = async (cat: CategorySummaryItem) => {
    if (cat.type === "EVERYDAY") {
      toast.warning("The Everyday category cannot be archived or deleted.");
      return;
    }
    if (confirm(`Are you sure you want to archive "${cat.name}"?`)) {
      try {
        await archiveCategoryMut.mutateAsync({ categoryId: cat.id });
        posthog.capture("category_archived", { category_type: cat.type });
        toast.success(t("toasts.archived"));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to archive category.";
        toast.error(message);
      }
    }
  };

  // Group Categories by Bucket
  const everydayCategories = categories.filter((c) => c.type === "EVERYDAY");
  const regularCategories = categories.filter((c) => c.type === "REGULAR");
  const goalCategories = categories.filter((c) => c.type === "GOAL");

  // Everyday Bucket Summary Math
  const everydayBalance = everydayCategories.reduce((sum, c) => sum + parseFloat(c.currentBalance || "0"), 0);
  const everydayMonthlyBudget = everydayCategories.reduce(
    (sum, c) => sum + parseFloat(c.everydayAllowanceAmount || c.monthlyAmount || "0"),
    0
  );
  const everydayConsumedPct =
    everydayMonthlyBudget > 0
      ? Math.min(100, Math.max(0, Math.round(((everydayMonthlyBudget - everydayBalance) / everydayMonthlyBudget) * 100)))
      : 0;

  // Regular Bills Bucket Summary Math
  const regularBalance = regularCategories.reduce((sum, c) => sum + parseFloat(c.currentBalance || "0"), 0);
  const regularMonthlyBudget = regularCategories.reduce((sum, c) => sum + parseFloat(c.monthlyAmount || "0"), 0);
  const regularConsumedPct =
    regularMonthlyBudget > 0
      ? Math.min(100, Math.max(0, Math.round(((regularMonthlyBudget - regularBalance) / regularMonthlyBudget) * 100)))
      : 0;

  // Filter Helper
  const filterFn = (catList: CategorySummaryItem[]) =>
    catList.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      if (q && !c.name.toLowerCase().includes(q)) return false;
      if (healthFilter !== "ALL" && c.healthStatus !== healthFilter) return false;
      return true;
    });

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Header & Main Actions */}
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
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-blue-50 text-[#2563eb] hover:bg-blue-100 border border-blue-200 transition-all flex items-center gap-2 shadow-2xs"
          >
            <span>↔️</span>
            <span>{t("categories.actions.moveMoney")}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setCategoryToEdit(null);
              setIsFormModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-[#2563eb] hover:bg-blue-700 transition-all shadow-md flex items-center gap-2"
          >
            <span>➕</span>
            <span>{t("categories.addCategory")}</span>
          </button>
        </div>
      </div>

      {/* Timeline Projection Slider (Today -> +12 Months) */}
      <div className="p-5 bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-purple-50/90 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 border border-blue-200/80 dark:border-blue-900/60 rounded-2xl shadow-xs relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">📅</span>
            <span className="text-xs font-black uppercase text-[#1B2B4B] dark:text-blue-200 tracking-wider">
              {t("incomeBillsTabs.timelineSliderLabel")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {projectionMonths > 0.05 && (
              <button
                type="button"
                onClick={() => setProjectionMonths(0)}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg shadow-xs transition-all animate-in fade-in flex items-center gap-1"
              >
                <span>⏱️</span>
                <span>Snap to Today</span>
              </button>
            )}
            <span className="text-xs font-bold font-mono text-[#2563eb] bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-800 px-3 py-1 rounded-xl shadow-2xs">
              {projectionMonths <= 0.05 ? "Today (Actuals)" : projectionTargetDate}
            </span>
          </div>
        </div>

        {/* Floating Tooltip displaying target date at slider thumb position */}
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

        {/* Axis Labels showing actual calculated dates */}
        <div className="flex justify-between text-[10px] font-bold text-zinc-400 font-mono mt-1 px-1">
          {axisDates.map((label: string, idx: number) => (
            <span key={idx} className={idx === 0 && projectionMonths <= 0.05 ? "text-[#2563eb] font-extrabold" : ""}>
              {label}
            </span>
          ))}
        </div>

        {/* Visual Indicator Banner when in Projection Mode */}
        {projectionMonths > 0.05 && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-xl flex items-center justify-between text-xs animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center gap-2">
              <span className="animate-pulse text-base">🔮</span>
              <span className="font-bold text-amber-900 dark:text-amber-200">
                PROJECTION MODE: Showing estimated category balances as of <strong>{projectionTargetDate}</strong>.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setProjectionMonths(0)}
              className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline"
            >
              Reset to Today →
            </button>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t("categories.searchPlaceholder")}
        filterGroups={[]}
        onClearAll={() => {
          setSearchQuery("");
          setHealthFilter("ALL");
        }}
      />

      {/* SECTION 1: EVERYDAY SPENDING */}
      <EverydayPoolSection
        categories={filterFn(everydayCategories)}
        everydayBalance={everydayBalance}
        everydayMonthlyBudget={everydayMonthlyBudget}
        everydayConsumedPct={everydayConsumedPct}
        elapsedPct={elapsedPct}
        isCollapsed={isEverydayCollapsed}
        onToggleCollapse={() => setIsEverydayCollapsed(!isEverydayCollapsed)}
        onSelectCategory={setSelectedCategoryId}
        onEditCategory={(cat) => {
          setCategoryToEdit(cat);
          setIsFormModalOpen(true);
        }}
        onOpenActivity={setActivityCategory}
      />

      {/* SECTION 2: REGULAR BILLS */}
      <RegularBillsSection
        categories={filterFn(regularCategories)}
        billCoverageItems={billCoverageItems}
        regularBalance={regularBalance}
        regularMonthlyBudget={regularMonthlyBudget}
        regularConsumedPct={regularConsumedPct}
        elapsedPct={elapsedPct}
        isCollapsed={isRegularCollapsed}
        onToggleCollapse={() => setIsRegularCollapsed(!isRegularCollapsed)}
        onSelectCategory={setSelectedCategoryId}
        onEditCategory={(cat) => {
          setCategoryToEdit(cat);
          setIsFormModalOpen(true);
        }}
        onArchiveCategory={handleArchive}
        onOpenActivity={setActivityCategory}
      />

      {/* SECTION 3: SAVE TOWARD (GOALS) */}
      <SavingsGoalsSection
        categories={filterFn(goalCategories)}
        onSelectCategory={setSelectedCategoryId}
        onEditCategory={(cat) => {
          setCategoryToEdit(cat);
          setIsFormModalOpen(true);
        }}
        onArchiveCategory={handleArchive}
        onOpenActivity={setActivityCategory}
      />

      {hasArchivedCategories && (
        <div className="flex justify-center pt-4">
          <a
            href="/dashboard/settings/archived"
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            {t("categories.viewArchived") || "View archived pools →"}
          </a>
        </div>
      )}

      {/* Shared Modals & Drawers */}
      {isMoveMoneyOpen && (
        <QuickActionDrawer
          onClose={() => {
            setIsMoveMoneyOpen(false);
            utils.listCategories.invalidate();
          }}
          initialTab="TRANSFER"
        />
      )}

      <CategoryFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        categoryToEdit={categoryToEdit}
        onSuccess={() => utils.listCategories.invalidate()}
      />

      <CategoryActivityModal
        isOpen={activityCategory !== null}
        onClose={() => setActivityCategory(null)}
        category={activityCategory}
      />

      <CategoryDetailDrawer
        categoryId={selectedCategoryId}
        onClose={() => setSelectedCategoryId(null)}
        onEdit={(cat) => {
          setSelectedCategoryId(null);
          const matched = categories.find((c) => c.id === cat.id);
          if (matched) {
            setCategoryToEdit(matched);
            setIsFormModalOpen(true);
          }
        }}
        onArchive={(cat) => {
          setSelectedCategoryId(null);
          const matched = categories.find((c) => c.id === cat.id);
          if (matched) {
            handleArchive(matched);
          }
        }}
      />
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-zinc-400">{t("categories.loading")}</div>}>
      <CategoriesPageContent />
    </React.Suspense>
  );
}
