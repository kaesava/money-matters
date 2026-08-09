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

function DualPoolBar({ elapsedPct, consumedPct }: { elapsedPct: number; consumedPct: number }) {
  let consumedColor = "bg-emerald-500";
  if (consumedPct > elapsedPct + 15) consumedColor = "bg-rose-500";
  else if (consumedPct > elapsedPct + 5) consumedColor = "bg-amber-500";

  return (
    <div className="w-full mt-3 space-y-1">
      <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500">
        <span>Pacing Progress</span>
        <span>Spent: {consumedPct}% | Month: {elapsedPct}%</span>
      </div>
      <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden flex flex-col gap-0.5">
        <div className="h-0.5 bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${elapsedPct}%` }} title={`Month elapsed: ${elapsedPct}%`} />
        <div className={`h-1 ${consumedColor} rounded-full transition-all duration-300`} style={{ width: `${consumedPct}%` }} title={`Pool spent: ${consumedPct}%`} />
      </div>
    </div>
  );
}

function fmt(val: string | number | null | undefined) {
  if (val === null || val === undefined) return "—";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "—";
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function CategoriesPageContent() {
  const utils = trpc.useUtils();
  const searchParams = useSearchParams();
  const paramSearch = searchParams.get("search") || searchParams.get("name") || "";
  const paramHealth = searchParams.get("health") || searchParams.get("status") || "ALL";

  const categoriesQuery = trpc.listCategories.useQuery();
  const categories = categoriesQuery.data ?? [];

  // Filter States
  const [searchQuery, setSearchQuery] = useState(paramSearch);
  const [healthFilter, setHealthFilter] = useState(paramHealth);

  useEffect(() => {
    if (paramSearch) setSearchQuery(paramSearch);
    if (paramHealth) setHealthFilter(paramHealth);
  }, [paramSearch, paramHealth]);

  // Section Collapse States
  const [isEverydayCollapsed, setIsEverydayCollapsed] = useState(true);
  const [isRegularCollapsed, setIsRegularCollapsed] = useState(true);

  // Selection & Modals
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  type CategoryItem = NonNullable<typeof categories>[number];
  const [categoryToEdit, setCategoryToEdit] = useState<CategoryItem | null>(null);
  const [isMoveMoneyOpen, setIsMoveMoneyOpen] = useState(false);

  // Month progress
  const { elapsedPct } = monthProgress();

  // Mutations
  const archiveCategoryMut = trpc.archiveCategory.useMutation({
    onSuccess: () => {
      utils.listCategories.invalidate();
    },
  });

  const handleArchive = async (cat: CategoryItem) => {
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
  const filterFn = (catList: CategoryItem[]) =>
    catList.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      if (q && !c.name.toLowerCase().includes(q)) return false;
      if (healthFilter !== "ALL" && c.healthStatus !== healthFilter) return false;
      return true;
    });

  const filteredEveryday = filterFn(everydayCategories);
  const filteredRegular = filterFn(regularCategories);
  const filteredGoal = filterFn(goalCategories);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Header & Main Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1B2B4B] tracking-tight">{t("categories.title")}</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-0.5">
            Everyday & Bills are managed as overall pools. Save Toward pools are tracked individually.
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
            <span>New Category</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search category name..."
        filterGroups={[]}
        onClearAll={() => {
          setSearchQuery("");
          setHealthFilter("ALL");
        }}
      />

      {/* ========================================================================= */}
      {/* SECTION 1: EVERYDAY SPENDING (COLLAPSABLE) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden flex flex-col">
        {/* Header Summary Banner */}
        <div className="p-5 bg-gradient-to-r from-teal-50/60 to-white border-b border-zinc-100 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00B4A6]/10 text-[#00B4A6] flex items-center justify-center text-xl font-bold">
                💳
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-[#1B2B4B]">{t("categories.sections.everydayTitle")}</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#00B4A6]/10 text-[#00B4A6] uppercase tracking-wider">
                    Overall Pool
                  </span>
                </div>
                <p className="text-xs text-zinc-500 font-medium">
                  Discretionary funds. Budgets set overall target; spent directly from overall Everyday pool.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Overall Pool Balance</p>
                <p className="text-xl font-mono font-black text-[#1B2B4B]">{fmt(everydayBalance)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Monthly Budget Target</p>
                <p className="text-sm font-mono font-bold text-zinc-600">{fmt(everydayMonthlyBudget)}</p>
              </div>

              <button
                type="button"
                onClick={() => setIsEverydayCollapsed(!isEverydayCollapsed)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-sm transition-all flex items-center gap-1.5"
              >
                <span>
                  {isEverydayCollapsed
                    ? `${filteredEveryday.length} categor${filteredEveryday.length === 1 ? "y" : "ies"} ▼`
                    : "Collapse ▲"}
                </span>
              </button>
            </div>
          </div>
          <DualPoolBar elapsedPct={elapsedPct} consumedPct={everydayConsumedPct} />
        </div>

        {/* Collapsable Table Content */}
        {!isEverydayCollapsed && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/60 text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">
                <th className="px-6 py-3">Category Name</th>
                <th className="px-6 py-3">Monthly Target Budget</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredEveryday.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-6 text-center text-xs text-zinc-400 font-medium">
                    No everyday categories matched filters.
                  </td>
                </tr>
              ) : (
                filteredEveryday.map((cat) => (
                  <tr key={cat.id} className="hover:bg-zinc-50/50 transition-colors text-xs font-semibold">
                    <td className="px-6 py-3.5">
                      <button
                        type="button"
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className="text-[#00B4A6] hover:underline font-bold text-left"
                      >
                        {cat.name}
                      </button>
                    </td>
                    <td className="px-6 py-3.5 font-mono font-bold text-zinc-700">
                      {fmt(cat.everydayAllowanceAmount || cat.monthlyAmount)}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryToEdit(cat);
                          setIsFormModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 transition-all"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: REGULAR BILLS (COLLAPSABLE) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden flex flex-col">
        {/* Header Summary Banner */}
        <div className="p-5 bg-gradient-to-r from-blue-50/60 to-white border-b border-zinc-100 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2563eb]/10 text-[#2563eb] flex items-center justify-center text-xl font-bold">
                🧾
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-[#1B2B4B]">{t("categories.sections.regularTitle")}</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#2563eb]/10 text-[#2563eb] uppercase tracking-wider">
                    Overall Pool
                  </span>
                </div>
                <p className="text-xs text-zinc-500 font-medium">
                  Recurring bill obligations. Individual categories set bill targets; managed at overall Bills pool level.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Overall Bills Pool Balance</p>
                <p className="text-xl font-mono font-black text-[#1B2B4B]">{fmt(regularBalance)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Monthly Bills Target</p>
                <p className="text-sm font-mono font-bold text-zinc-600">{fmt(regularMonthlyBudget)}</p>
              </div>

              <button
                type="button"
                onClick={() => setIsRegularCollapsed(!isRegularCollapsed)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-sm transition-all flex items-center gap-1.5"
              >
                <span>
                  {isRegularCollapsed
                    ? `${filteredRegular.length} categor${filteredRegular.length === 1 ? "y" : "ies"} ▼`
                    : "Collapse ▲"}
                </span>
              </button>
            </div>
          </div>
          <DualPoolBar elapsedPct={elapsedPct} consumedPct={regularConsumedPct} />
        </div>

        {/* Collapsable Table Content */}
        {!isRegularCollapsed && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/60 text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">
                <th className="px-6 py-3">Bill Name</th>
                <th className="px-6 py-3">Monthly Bill Target</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredRegular.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-6 text-center text-xs text-zinc-400 font-medium">
                    No regular bills matched filters.
                  </td>
                </tr>
              ) : (
                filteredRegular.map((cat) => (
                  <tr key={cat.id} className="hover:bg-zinc-50/50 transition-colors text-xs font-semibold">
                    <td className="px-6 py-3.5">
                      <button
                        type="button"
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className="text-[#2563eb] hover:underline font-bold text-left"
                      >
                        {cat.name}
                      </button>
                    </td>
                    <td className="px-6 py-3.5 font-mono font-bold text-zinc-700">{fmt(cat.monthlyAmount)}</td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryToEdit(cat);
                            setIsFormModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 transition-all"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleArchive(cat)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all"
                        >
                          Archive
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: SAVE TOWARD (GOALS) (ALWAYS OPEN / DEDICATED INDIVIDUAL POOLS) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden flex flex-col">
          {/* Header Summary Banner */}
          <div className="p-5 bg-gradient-to-r from-purple-50/60 to-white border-b border-zinc-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600/10 text-purple-600 flex items-center justify-center text-xl font-bold">
                🎯
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-[#1B2B4B]">{t("categories.sections.goalTitle")}</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-600/10 text-purple-600 uppercase tracking-wider">
                    Per-Category Target Pools
                  </span>
                </div>
                <p className="text-xs text-zinc-500 font-medium">
                  Target savings goals managed individually per category with dedicated balances and progress tracking.
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Total Goal Pools</p>
              <p className="text-xl font-mono font-black text-[#1B2B4B]">{goalCategories.length}</p>
            </div>
          </div>

          {/* Goal Categories Table */}
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/60 text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">
                <th className="px-6 py-4">Goal Name</th>
                <th className="px-6 py-4">Current Pool Balance</th>
                <th className="px-6 py-4">Target Amount</th>
                <th className="px-6 py-4">Target Date</th>
                <th className="px-6 py-4">Savings Progress</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredGoal.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-xs text-zinc-400 font-medium">
                    No savings goals matched filters.
                  </td>
                </tr>
              ) : (
                filteredGoal.map((cat) => {
                  const balanceVal = parseFloat(cat.currentBalance);
                  const targetVal = cat.targetAmount ? parseFloat(cat.targetAmount) : 0;
                  const pct = targetVal > 0 ? Math.min(100, Math.round((balanceVal / targetVal) * 100)) : 100;
                  const healthColor =
                    cat.healthStatus === "GREEN" ? "#22C55E" : cat.healthStatus === "AMBER" ? "#F59E0B" : "#EF4444";

                  let daysLeftText = null;
                  let reqMonthlyText = null;
                  if (cat.targetDate) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const tDate = new Date(cat.targetDate);
                    tDate.setHours(0, 0, 0, 0);
                    const diffDays = Math.ceil((tDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    daysLeftText = diffDays > 0 ? `${diffDays} days left` : diffDays === 0 ? "Due today!" : `${Math.abs(diffDays)} days past due`;

                    const monthsLeft = Math.max(1, Math.ceil(diffDays / 30.44));
                    const remainingToSave = Math.max(0, targetVal - balanceVal);
                    reqMonthlyText = `${fmt(remainingToSave / monthsLeft)}/mo needed`;
                  }

                  return (
                    <tr key={cat.id} className="hover:bg-zinc-50/50 transition-colors text-xs font-semibold">
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedCategoryId(cat.id)}
                          className="text-purple-600 hover:underline font-bold text-left"
                        >
                          {cat.name}
                        </button>
                      </td>
                      <td className="px-6 py-4 font-mono font-extrabold text-[#1B2B4B]">{fmt(balanceVal)}</td>
                      <td className="px-6 py-4 font-mono text-zinc-700">{fmt(cat.targetAmount)}</td>
                      <td className="px-6 py-4 text-zinc-500 font-medium">
                        <div>
                          {cat.targetDate ? cat.targetDate : "—"}
                          {daysLeftText && (
                            <span className="block text-[10px] font-bold text-purple-600 mt-0.5">{daysLeftText}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 w-36">
                          <div className="h-2.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: healthColor }} />
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-extrabold text-zinc-500">
                            <span>{pct}% ({cat.healthStatus === "GREEN" ? "On Track" : cat.healthStatus === "AMBER" ? "Attention" : "Behind"})</span>
                          </div>
                          {reqMonthlyText && (
                            <span className="text-[10px] font-bold text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded w-max">{reqMonthlyText}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setCategoryToEdit(cat);
                              setIsFormModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 transition-all"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleArchive(cat)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all"
                          >
                            Archive
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      {/* Shared Move Money Modal */}
      <MoveMoneyModal
        isOpen={isMoveMoneyOpen}
        onClose={() => setIsMoveMoneyOpen(false)}
        onSuccess={() => {
          utils.listCategories.invalidate();
        }}
      />

      {/* Unified Add/Edit Category Modal */}
      <CategoryFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        categoryToEdit={categoryToEdit}
        onSuccess={() => {
          utils.listCategories.invalidate();
        }}
      />

      {/* Category Detail Drawer */}
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
