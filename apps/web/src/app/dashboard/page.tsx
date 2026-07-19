"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { useDashboardData } from "../../hooks/useDashboardData";
import { PaycheckReadinessCard } from "../../components/web/PaycheckReadinessCard";
import { CategoryHealthCard } from "../../components/web/CategoryHealthCard";
import { BucketDetailDrawer } from "../../components/web/BucketDetailDrawer";
import { ShortfallResolutionDrawer } from "../../components/web/ShortfallResolutionDrawer";
import { AllocationReviewDrawer } from "../../components/web/AllocationReviewDrawer";
import { DashboardError } from "../../components/web/DashboardError";
import { authClient } from "../../lib/auth";

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

/** Dashboard Home — Premium Multi-Column Bento Grid */
export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { hasTenant, isLoadingTenant, tenantError, categoriesQuery, incomeEventsQuery } = useDashboardData();

  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
  const [reviewEventId, setReviewEventId] = useState<string | null>(null);
  const [shortfallBucketId, setShortfallBucketId] = useState<string | null>(null);

  const categories = (categoriesQuery.data ?? []) as CategoryWithHealth[];
  const incomeEvents = incomeEventsQuery.data ?? [];

  const nextEvent =
    incomeEvents.find((e) => e.status === "DRAFT") ??
    incomeEvents.find((e) => e.status === "UPCOMING") ??
    null;

  const hasDraftPlan = nextEvent?.status === "DRAFT";

  const daysUntil = nextEvent?.expectedDate
    ? Math.max(0, Math.ceil((new Date(nextEvent.expectedDate).getTime() - Date.now()) / 86400000))
    : null;

  const onTrack = categories.filter((c) => c.healthStatus === "GREEN").length;
  const atRisk = categories.filter((c) => c.healthStatus === "AMBER" || c.healthStatus === "RED").length;
  const critical = categories.filter((c) => c.healthStatus === "RED").length;

  const grouped = categories.reduce<Record<string, CategoryWithHealth[]>>((acc, cat) => {
    if (!acc[cat.type]) acc[cat.type] = [];
    acc[cat.type]!.push(cat);
    return acc;
  }, {});

  const firstName = session?.user?.name?.split(" ")[0] ?? null;

  // Show spinner while resolving tenant
  if (isLoadingTenant) {
    return <FullPageSpinner />;
  }

  // Network/API error on the tenant check itself
  if (tenantError) {
    return <DashboardError error={tenantError} onRetry={() => window.location.reload()} />;
  }

  // User is authenticated but hasn't completed setup
  if (!hasTenant) {
    return <SetupRequired onGoToSetup={() => router.push("/setup")} />;
  }

  return (
    <div className="flex flex-col gap-8">
      {/* ── Header Greeting ── */}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">
          {firstName ? `${t("home.greeting")}, ${firstName} 👋` : `${t("home.greeting")} 👋`}
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#1B2B4B]">
          {t("home.title")}
        </h1>
      </div>

      {/* ── Multi-Column Bento Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Side Columns (2/3 width on desktop) */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* Paycheck Readiness panel */}
          {incomeEventsQuery.isLoading ? (
            <div className="h-36 rounded-2xl animate-pulse bg-zinc-200/50" />
          ) : incomeEventsQuery.error ? (
            <DashboardError error={incomeEventsQuery.error} onRetry={() => incomeEventsQuery.refetch()} compact />
          ) : (
            <PaycheckReadinessCard
              daysUntil={daysUntil}
              expectedAmount={nextEvent ? parseInt(nextEvent.expectedAmount ?? "0", 10) : null}
              sourceName={null}
              onTrack={onTrack}
              atRisk={atRisk}
              hasDraftPlan={hasDraftPlan}
              onReview={() => nextEvent && setReviewEventId(nextEvent.id)}
            />
          )}

          {/* Category Health Main Grid */}
          <div className="flex flex-col gap-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#1B2B4B]/70">
              {t("home.categoryHealth")}
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
          </div>
        </div>

        {/* Right Side Column (1/3 width on desktop) */}
        <div className="flex flex-col gap-6">
          {/* Glassmorphic Bento Stats Overview */}
          <div className="p-6 rounded-2xl border bg-white shadow-md border-zinc-100 flex flex-col gap-6 relative overflow-hidden group hover:shadow-lg transition-shadow duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#00B4A6]/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform duration-300" />
            
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-400">
              Overview
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

          {/* Quick Shortcuts / Guide card */}
          <div className="p-6 rounded-2xl border bg-gradient-to-br from-[#1B2B4B] to-[#0f192b] text-white shadow-lg flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-white/5 rounded-full" />
            
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#00B4A6]">
              Keyboard Shortcuts
            </h4>
            
            <div className="flex flex-col gap-3.5 text-xs text-zinc-300">
              <div className="flex items-center justify-between">
                <span>Quick Record Expense</span>
                <kbd className="px-2 py-1 rounded bg-white/10 font-mono text-white text-[10px] font-bold">N</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Focus search bar</span>
                <kbd className="px-2 py-1 rounded bg-white/10 font-mono text-white text-[10px] font-bold">/</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Close modal / drawer</span>
                <kbd className="px-2 py-1 rounded bg-white/10 font-mono text-white text-[10px] font-bold">ESC</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Drawers and Modals ── */}
      {selectedBucketId && (
        <BucketDetailDrawer
          categoryId={selectedBucketId}
          onClose={() => setSelectedBucketId(null)}
          onResolveShortfall={(id) => {
            setSelectedBucketId(null);
            setShortfallBucketId(id);
          }}
        />
      )}

      {shortfallBucketId && (
        <ShortfallResolutionDrawer
          categoryId={shortfallBucketId}
          onClose={() => {
            setShortfallBucketId(null);
            categoriesQuery.refetch();
          }}
        />
      )}

      {reviewEventId && (
        <AllocationReviewDrawer
          incomeEventId={reviewEventId}
          onClose={() => {
            setReviewEventId(null);
            categoriesQuery.refetch();
            incomeEventsQuery.refetch();
          }}
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
