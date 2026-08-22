"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { monthProgress } from "@money-matters/ui";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../lib/trpc";
import posthog from "../../../lib/posthog-client";
import { CategoryDetailDrawer } from "../../../components/web/CategoryDetailDrawer";
import { MoveMoneyModal } from "../../../components/web/MoveMoneyModal";
import { FilterBar } from "../../../components/web/FilterBar";
import { CategoryFormModal } from "../../../components/web/CategoryFormModal";
import { EverydayPoolSection, CategorySummaryItem } from "./components/EverydayPoolSection";
import { RegularBillsSection } from "./components/RegularBillsSection";
import { SavingsGoalsSection } from "./components/SavingsGoalsSection";

function CategoriesPageContent() {
  const utils = trpc.useUtils();
  const searchParams = useSearchParams();
  const paramSearch = searchParams.get("search") || searchParams.get("name") || "";
  const paramHealth = searchParams.get("health") || searchParams.get("status") || "ALL";

  const categoriesQuery = trpc.listCategories.useQuery();
  const categories = (categoriesQuery.data ?? []) as CategorySummaryItem[];

  const archivedQuery = trpc.listArchivedItems.useQuery();
  const hasArchivedCategories = archivedQuery.data?.some(i => i.itemType === 'CATEGORY') ?? false;

  // Filter States
  const [searchQuery, setSearchQuery] = useState(paramSearch);
  const [healthFilter, setHealthFilter] = useState(paramHealth);

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
  const [isMoveMoneyOpen, setIsMoveMoneyOpen] = useState(false);

  // Month progress
  const { elapsedPct } = monthProgress();

  // Mutations
  const archiveCategoryMut = trpc.archiveCategory.useMutation({
    onSuccess: () => {
      utils.listCategories.invalidate();
    },
  });

  const handleArchive = async (cat: CategorySummaryItem) => {
    if (cat.type === "EVERYDAY") {
      alert("The Everyday category cannot be archived or deleted.");
      return;
    }
    if (confirm(`Are you sure you want to archive "${cat.name}"?`)) {
      try {
        await archiveCategoryMut.mutateAsync({ categoryId: cat.id });
        posthog.capture("category_archived", { category_type: cat.type });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to archive category.";
        alert(message);
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
          <h1 className="text-2xl font-black text-[#1B2B4B] tracking-tight">{t("categories.title")}</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-0.5">
            {t("categories.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMoveMoneyOpen(true)}
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-teal-50 text-[#00B4A6] hover:bg-teal-100 border border-teal-200 transition-all flex items-center gap-2 shadow-sm"
          >
            <span>↔️</span>
            <span>Move Money</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setCategoryToEdit(null);
              setIsFormModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-[#00B4A6] hover:opacity-90 transition-all shadow-md flex items-center gap-2"
          >
            <span>➕</span>
            <span>{t("categories.addCategory")}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search pool name..."
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
      />

      {/* SECTION 2: REGULAR BILLS */}
      <RegularBillsSection
        categories={filterFn(regularCategories)}
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
      <MoveMoneyModal
        isOpen={isMoveMoneyOpen}
        onClose={() => setIsMoveMoneyOpen(false)}
        onSuccess={() => utils.listCategories.invalidate()}
      />

      <CategoryFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        categoryToEdit={categoryToEdit}
        onSuccess={() => utils.listCategories.invalidate()}
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
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-zinc-400">Loading categories...</div>}>
      <CategoriesPageContent />
    </React.Suspense>
  );
}
