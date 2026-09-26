"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Spinner } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { IncomeSplitScreen } from "./components/IncomeSplitScreen";
import { IncomeSplitOverview } from "./components/IncomeSplitOverview";

function IncomeSplitPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const returnTo = searchParams.get("returnTo") || "/dashboard";

  if (!id) {
    return <IncomeSplitOverview />;
  }

  return <IncomeSplitScreen incomeEventId={id} returnTo={returnTo} />;
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
