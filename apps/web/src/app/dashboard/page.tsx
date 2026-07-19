"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { useDashboardData } from "../../hooks/useDashboardData";
import { PaycheckReadinessCard } from "../../components/web/PaycheckReadinessCard";
import { CategoryHealthCard } from "../../components/web/CategoryHealthCard";
import { BucketDetailDrawer } from "../../components/web/BucketDetailDrawer";
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

/** Dashboard Home — Paycheck Readiness panel + full Category Health grid */
export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { hasTenant, isLoadingTenant, tenantError, categoriesQuery, incomeEventsQuery } = useDashboardData();

  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
  const [reviewEventId, setReviewEventId] = useState<string | null>(null);

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
    <div className="flex flex-col gap-6">
      {/* Greeting */}
      <div>
        <p className="text-sm font-medium" style={{ color: "var(--dash-muted)" }}>
          {firstName
            ? `${t("home.greeting")}, ${firstName} 👋`
            : `${t("home.greeting")} 👋`}
        </p>
        <h1 className="text-2xl font-bold mt-0.5" style={{ color: "var(--dash-text)" }}>
          {t("home.title")}
        </h1>
      </div>

      {/* Paycheck Readiness Card */}
      {incomeEventsQuery.isLoading ? (
        <div className="h-36 rounded-2xl animate-pulse" style={{ backgroundColor: "var(--dash-navy)", opacity: 0.3 }} />
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

      {/* Category Health */}
      <div className="flex flex-col gap-4">
        <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--dash-muted)" }}>
          {t("home.categoryHealth")}
        </h2>

        {categoriesQuery.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl animate-pulse" style={{ backgroundColor: "var(--dash-border)" }} />
            ))}
          </div>
        ) : categoriesQuery.error ? (
          <DashboardError error={categoriesQuery.error} onRetry={() => categoriesQuery.refetch()} compact />
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <span className="text-3xl">📂</span>
            <p className="text-sm font-semibold" style={{ color: "var(--dash-text)" }}>{t("home.noCategories")}</p>
            <p className="text-xs" style={{ color: "var(--dash-muted)" }}>{t("home.setupCategories")}</p>
          </div>
        ) : (
          SECTION_ORDER.map((section) => {
            const items = grouped[section] ?? [];
            if (items.length === 0) return null;
            return (
              <div key={section} className="flex flex-col gap-2">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--dash-muted)" }}>
                  {t(SECTION_LABELS[section] ?? "")}
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
          })
        )}
      </div>

      {selectedBucketId && (
        <BucketDetailDrawer
          categoryId={selectedBucketId}
          onClose={() => setSelectedBucketId(null)}
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
