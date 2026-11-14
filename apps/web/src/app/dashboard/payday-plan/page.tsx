"use client";

import React, { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { PaydayPlanScreen } from "./components/PaydayPlanScreen";

function IncomeSplitPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const returnTo = searchParams.get("returnTo") || "/dashboard";

  useEffect(() => {
    if (!id) {
      router.replace("/dashboard/plan?tab=matrix");
    }
  }, [id, router]);

  if (!id) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Spinner size="lg" label={t("common.loading")} direction="col" />
      </div>
    );
  }

  return <PaydayPlanScreen incomeEventId={id} returnTo={returnTo} />;
}

export default function IncomeSplitPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <Spinner size="lg" label={t("common.loading")} direction="col" />
        </div>
      }
    >
      <IncomeSplitPageContent />
    </Suspense>
  );
}
