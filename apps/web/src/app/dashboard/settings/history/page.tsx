"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@money-matters/ui/web";

function HistoryRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const search = searchParams.get("search") || searchParams.get("q") || "";
    const categoryId = searchParams.get("categoryId") || "";
    const params = new URLSearchParams();
    params.set("tab", "transactions");
    if (search) params.set("search", search);
    if (categoryId && categoryId !== "ALL") params.set("categoryId", categoryId);

    router.replace(`/dashboard/history?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <div className="flex h-64 items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <HistoryRedirectContent />
    </Suspense>
  );
}
