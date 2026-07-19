"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { useDashboardData } from "../../../hooks/useDashboardData";
import { CategoryHealthCard } from "../../../components/web/CategoryHealthCard";
import { BucketDetailDrawer } from "../../../components/web/BucketDetailDrawer";
import { DashboardError } from "../../../components/web/DashboardError";

const SECTION_ORDER = ["MAJOR", "RECURRING", "EVERYDAY"] as const;
const SECTION_LABELS: Record<string, string> = {
  MAJOR: "buckets.majorSection",
  RECURRING: "buckets.recurringSection",
  EVERYDAY: "buckets.everydaySection",
};

type CategoryWithHealth = {
  id: string;
  name: string;
  type: string;
  currentBalance: string;
  targetAmount: string | null;
  healthStatus: "GREEN" | "AMBER" | "RED";
  nextDueDate: string | null;
  progressPercentage: number;
};

/** Categories page — all categories grouped by type, click → BucketDetailDrawer */
export default function CategoriesPage() {
  const router = useRouter();
  const { hasTenant, isLoadingTenant, tenantError, categoriesQuery } = useDashboardData();
  
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "MAJOR" | "RECURRING" | "EVERYDAY">("ALL");

  const categories = (categoriesQuery.data ?? []) as CategoryWithHealth[];

  const filteredCategories = categories.filter((cat) => {
    const matchesSearch = cat.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "ALL" ? true : cat.type === filterType;
    return matchesSearch && matchesType;
  });

  const grouped = filteredCategories.reduce<Record<string, CategoryWithHealth[]>>((acc, cat) => {
    if (!acc[cat.type]) acc[cat.type] = [];
    acc[cat.type]!.push(cat);
    return acc;
  }, {});

  const totalOnTrack = filteredCategories.filter((c) => c.healthStatus === "GREEN").length;
  const totalAtRisk = filteredCategories.filter((c) => c.healthStatus === "AMBER" || c.healthStatus === "RED").length;

  const isLoading = isLoadingTenant || categoriesQuery.isLoading;
  const error = tenantError ?? categoriesQuery.error;

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--dash-text)" }}>
            {t("nav.categories")}
          </h1>
          {!isLoading && !error && hasTenant && filteredCategories.length > 0 && (
            <p className="text-sm mt-0.5" style={{ color: "var(--dash-muted)" }}>
              {t("home.onTrack", { count: totalOnTrack })} · {t("home.atRisk", { count: totalAtRisk })}
            </p>
          )}
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      {!isLoading && !error && hasTenant && categories.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm">
          {/* Search bar input wrapper */}
          <div className="relative w-full sm:max-w-xs">
            <input
              id="category-search-input"
              type="text"
              placeholder="Search categories... (Press /)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-[#00B4A6] transition-colors"
            />
            <svg
              className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Tag filters selector list */}
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
            {(["ALL", "MAJOR", "RECURRING", "EVERYDAY"] as const).map((tType) => (
              <button
                key={tType}
                onClick={() => setFilterType(tType)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap ${
                  filterType === tType
                    ? "bg-[#00B4A6] border-[#00B4A6] text-white"
                    : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:border-zinc-300"
                }`}
              >
                {tType === "ALL" ? "All" : t(SECTION_LABELS[tType] ?? "")}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse bg-zinc-200/50" />
          ))}
        </div>
      ) : error ? (
        <DashboardError
          error={error}
          onRetry={() => {
            categoriesQuery.refetch();
            window.location.reload();
          }}
        />
      ) : !hasTenant ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center bg-white rounded-2xl border border-zinc-100 shadow-sm">
          <span className="text-3xl">🏠</span>
          <p className="text-sm font-semibold text-zinc-700">{t("setup.title")}</p>
          <button
            onClick={() => router.push("/setup")}
            className="px-5 py-2 rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: "var(--dash-teal)" }}
          >
            {t("setup.complete.goDashboard", { defaultValue: "Complete Setup" })}
          </button>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center bg-white rounded-2xl border border-zinc-100 shadow-sm">
          <span className="text-3xl">📂</span>
          <p className="text-sm font-semibold text-zinc-700">{t("home.noCategories")}</p>
          <p className="text-xs text-zinc-400">{t("home.setupCategories")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {SECTION_ORDER.map((section) => {
            const items = grouped[section] ?? [];
            if (items.length === 0) return null;
            return (
              <div key={section} className="flex flex-col gap-3">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  {t(SECTION_LABELS[section] ?? "")}
                  <span className="ml-2 font-normal normal-case">({items.length})</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((cat) => (
                    <CategoryHealthCard
                      key={cat.id}
                      id={cat.id}
                      name={cat.name}
                      type={cat.type}
                      balance={cat.currentBalance}
                      target={cat.targetAmount}
                      health={cat.healthStatus}
                      nextDueDate={cat.nextDueDate}
                      progressPercentage={cat.progressPercentage}
                      onClick={() => setSelectedBucketId(cat.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedBucketId && (
        <BucketDetailDrawer
          categoryId={selectedBucketId}
          onClose={() => {
            setSelectedBucketId(null);
            categoriesQuery.refetch();
          }}
        />
      )}
    </div>
  );
}
