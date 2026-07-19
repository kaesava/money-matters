"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { useDashboardData } from "../../hooks/useDashboardData";
import { CategoryHealthCard } from "../../components/web/CategoryHealthCard";
import { BucketDetailDrawer } from "../../components/web/BucketDetailDrawer";
import { CanWeAffordCard } from "../../components/web/CanWeAffordCard";
import { DashboardError } from "../../components/web/DashboardError";
import { authClient } from "../../lib/auth";

const SECTION_ORDER = ["REGULAR", "SAVINGS", "EVERYDAY"] as const;
const SECTION_LABELS: Record<string, string> = {
  REGULAR: "buckets.recurringSection", // mapping to 'Regular Bills' in i18n
  SAVINGS: "buckets.majorSection",     // mapping to 'Save Toward' in i18n
  EVERYDAY: "buckets.everydaySection", // mapping to 'Day-to-Day' in i18n
};

type CategoryWithHealth = {
  id: string;
  name: string;
  type: "REGULAR" | "SAVINGS" | "EVERYDAY";
  currentBalance: string;
  targetAmount: string | null;
  healthStatus: "GREEN" | "AMBER" | "RED";
  targetDate: string | null;
  progressPercentage: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { hasTenant, isLoadingTenant, tenantError, categoriesQuery, incomeEventsQuery } = useDashboardData();

  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);

  const categories = (categoriesQuery.data ?? []) as CategoryWithHealth[];
  const incomeEvents = incomeEventsQuery.data ?? [];

  const onTrack = categories.filter((c) => c.healthStatus === "GREEN").length;
  const atRisk = categories.filter((c) => c.healthStatus === "AMBER" || c.healthStatus === "RED").length;
  const critical = categories.filter((c) => c.healthStatus === "RED").length;

  const grouped = categories.reduce<Record<string, CategoryWithHealth[]>>((acc, cat) => {
    if (!acc[cat.type]) acc[cat.type] = [];
    acc[cat.type]!.push(cat);
    return acc;
  }, {});

  const firstName = session?.user?.name?.split(" ")[0] ?? null;

  if (isLoadingTenant) {
    return <FullPageSpinner />;
  }

  if (tenantError) {
    return <DashboardError error={tenantError} onRetry={() => window.location.reload()} />;
  }

  if (!hasTenant) {
    return <SetupRequired onGoToSetup={() => router.push("/setup")} />;
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Greeting Header */}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">
          {firstName ? `${t("home.greeting")}, ${firstName} 👋` : `${t("home.greeting")} 👋`}
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#1B2B4B]">
          {t("home.title")}
        </h1>
      </div>

      {/* Bento Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left column (2/3 width on desktop) - Bucket list health grid */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <div className="flex flex-col gap-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#1B2B4B]/70">
              Bucket Allocation Health
            </h2>

            {categoriesQuery.isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-24 rounded-2xl animate-pulse bg-zinc-200/50" />
                ))}
              </div>
            ) : categoriesQuery.error ? (
              <DashboardError error={categoriesQuery.error} onRetry={() => categoriesQuery.refetch()} compact />
            ) : categories.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center bg-white rounded-2xl border border-zinc-100 shadow-sm">
                <span className="text-4xl">📂</span>
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
                      <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                        {t(SECTION_LABELS[section] ?? "")}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {items.map((cat) => (
                          <CategoryHealthCard
                            key={cat.id}
                            id={cat.id}
                            name={cat.name}
                            type={cat.type}
                            balance={cat.currentBalance}
                            target={cat.targetAmount}
                            health={cat.healthStatus}
                            nextDueDate={cat.targetDate}
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
          </div>
        </div>

        {/* Right column (1/3 width on desktop) - Overview & Affordability calculator */}
        <div className="flex flex-col gap-6">
          {/* Can We Afford This calculator widget */}
          <CanWeAffordCard />

          {/* Quick status summary widget */}
          <div className="p-6 rounded-2xl border bg-white shadow-md border-zinc-100 flex flex-col gap-6 relative overflow-hidden group hover:shadow-lg transition-shadow duration-300">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-400">
              Summary
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#22C55E]/5 border border-[#22C55E]/10 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-emerald-600 uppercase">On Track</span>
                <span className="text-2xl font-extrabold text-emerald-700">{onTrack}</span>
              </div>
              <div className="p-4 rounded-xl bg-[#EF4444]/5 border border-[#EF4444]/10 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-rose-600 uppercase">At Risk</span>
                <span className="text-2xl font-extrabold text-rose-700">{atRisk}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2 border-t border-zinc-100">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 font-semibold">Total Categories</span>
                <span className="font-extrabold text-[#1B2B4B]">{categories.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 font-semibold">Critical (Red)</span>
                <span className="font-extrabold text-rose-600">{critical}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Slide-Over Drawer */}
      {selectedBucketId && (
        <BucketDetailDrawer
          categoryId={selectedBucketId}
          onClose={() => setSelectedBucketId(null)}
        />
      )}
    </div>
  );
}

function FullPageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div
        className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "var(--dash-teal)" }}
      />
    </div>
  );
}

function SetupRequired({ onGoToSetup }: { onGoToSetup: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <span className="text-4xl">🏠</span>
      <h2 className="text-xl font-bold" style={{ color: "var(--dash-text)" }}>
        {t("setup.title")}
      </h2>
      <p className="text-sm max-w-xs" style={{ color: "var(--dash-muted)" }}>
        {t("setup.complete.subtitle")}
      </p>
      <button
        onClick={onGoToSetup}
        className="px-6 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
        style={{ backgroundColor: "var(--dash-teal)" }}
      >
        {t("setup.complete.goDashboard", { defaultValue: "Complete Setup" })}
      </button>
    </div>
  );
}
