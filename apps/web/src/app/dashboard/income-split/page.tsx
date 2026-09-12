"use client";

import React, { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Spinner } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { IncomeSplitScreen } from "./components/IncomeSplitScreen";

function IncomeSplitPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const returnTo = searchParams.get("returnTo") || "/dashboard";

  useEffect(() => {
    if (!id) {
      router.replace("/dashboard/income-and-bills");
    }
  }, [id, router]);

  if (!id) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Spinner size="lg" label={t("common.loading", { defaultValue: "Redirecting..." })} direction="col" />
      </div>
    );
  }

  return <IncomeSplitScreen incomeEventId={id} returnTo={returnTo} />;
}

export default function IncomeSplitPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <Spinner size="lg" label={t("common.loading", { defaultValue: "Loading..." })} direction="col" />
        </div>
      }
    >
      <IncomeSplitPageContent />
    </Suspense>
  );
}
