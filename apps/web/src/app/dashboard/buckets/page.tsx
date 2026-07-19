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

  const categories = (categoriesQuery.data ?? []) as CategoryWithHealth[];

  const grouped = categories.reduce<Record<string, CategoryWithHealth[]>>((acc, cat) => {
    if (!acc[cat.type]) acc[cat.type] = [];
    acc[cat.type]!.push(cat);
    return acc;
  }, {});

  const totalOnTrack = categories.filter((c) => c.healthStatus === "GREEN").length;
  const totalAtRisk = categories.filter((c) => c.healthStatus === "AMBER" || c.healthStatus === "RED").length;

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
          {!isLoading && !error && hasTenant && categories.length > 0 && (
            <p className="text-sm mt-0.5" style={{ color: "var(--dash-muted)" }}>
              {t("home.onTrack", { count: totalOnTrack })} · {t("home.atRisk", { count: totalAtRisk })}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ backgroundColor: "var(--dash-border)" }} />
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
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="text-3xl">🏠</span>
          <p className="text-sm font-semibold" style={{ color: "var(--dash-text)" }}>{t("setup.title")}</p>
          <button
            onClick={() => router.push("/setup")}
            className="px-5 py-2 rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: "var(--dash-teal)" }}
          >
            {t("setup.complete.goDashboard", { defaultValue: "Complete Setup" })}
          </button>
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="text-3xl">📂</span>
          <p className="text-sm font-semibold" style={{ color: "var(--dash-text)" }}>{t("home.noCategories")}</p>
          <p className="text-xs" style={{ color: "var(--dash-muted)" }}>{t("home.setupCategories")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {SECTION_ORDER.map((section) => {
            const items = grouped[section] ?? [];
            if (items.length === 0) return null;
            return (
              <div key={section} className="flex flex-col gap-2.5">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--dash-muted)" }}>
                  {t(SECTION_LABELS[section] ?? "")}
                  <span className="ml-2 font-normal normal-case">({items.length})</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
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
