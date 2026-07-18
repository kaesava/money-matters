"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../lib/trpc";
import { CategoryHealthCard } from "../../../components/web/CategoryHealthCard";
import { BucketDetailDrawer } from "../../../components/web/BucketDetailDrawer";

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

/** Buckets page — all categories grouped by type, click → BucketDetailDrawer */
export default function BucketsPage() {
  const categoriesQuery = trpc.listCategories.useQuery();
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);

  const categories = (categoriesQuery.data ?? []) as CategoryWithHealth[];

  const grouped = categories.reduce<Record<string, CategoryWithHealth[]>>((acc, cat) => {
    if (!acc[cat.type]) acc[cat.type] = [];
    acc[cat.type]!.push(cat);
    return acc;
  }, {});

  const totalOnTrack = categories.filter((c) => c.healthStatus === "GREEN").length;
  const totalAtRisk = categories.filter((c) => c.healthStatus === "AMBER" || c.healthStatus === "RED").length;

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--dash-text)" }}>
            {t("buckets.title")}
          </h1>
          {!categoriesQuery.isLoading && categories.length > 0 && (
            <p className="text-sm mt-0.5" style={{ color: "var(--dash-muted)" }}>
              {t("home.onTrack", { count: totalOnTrack })} · {t("home.atRisk", { count: totalAtRisk })}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      {categoriesQuery.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ backgroundColor: "var(--dash-border)" }} />
          ))}
        </div>
      ) : categoriesQuery.error ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="text-3xl">⚠️</span>
          <p className="text-sm font-semibold" style={{ color: "var(--dash-text)" }}>{t("common.error")}</p>
          <p className="text-xs" style={{ color: "var(--dash-muted)" }}>{categoriesQuery.error.message}</p>
          <button
            onClick={() => categoriesQuery.refetch()}
            className="mt-2 px-4 py-2 rounded-lg text-xs font-bold text-white"
            style={{ backgroundColor: "var(--dash-teal)" }}
          >
            {t("common.retry")}
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
                  <span className="ml-2 font-normal normal-case" style={{ color: "var(--dash-muted)" }}>
                    ({items.length})
                  </span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {items.map((cat) => (
                    <CategoryHealthCard
                      key={cat.id}
                      {...cat}
                      balance={cat.currentBalance}
                      health={cat.healthStatus}
                      onClick={() => setSelectedBucketId(cat.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bucket Detail Drawer */}
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
