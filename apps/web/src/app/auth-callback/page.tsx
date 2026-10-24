"use client";
import React, { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "../../lib/auth";
import { trpc } from "../../lib/trpc";
import { t } from "@money-matters/i18n";

function AuthCallbackContent() {
  const { data: session, isPending } = authClient.useSession();
  const searchParams = useSearchParams();

  const tenantStatusQuery = trpc.getTenantStatus.useQuery(undefined, {
    enabled: !!session?.user,
    retry: false,
  });

  useEffect(() => {
    if (isPending || (session?.user && tenantStatusQuery.isLoading)) return;

    const token = session?.session?.token;
    const isMobileClient =
      searchParams.get("platform") === "mobile" ||
      searchParams.get("source") === "mobile" ||
      searchParams.has("native");

    if (isMobileClient) {
      if (token) {
        window.location.href = `moneymatters://home?token=${token}`;
      } else {
        window.location.href = "moneymatters://home";
      }
      return;
    }

    // If setup pending, redirect to /setup; otherwise redirect to requested target or dashboard
    if (session?.user && tenantStatusQuery.data && !tenantStatusQuery.data.setupCompleted) {
      window.location.href = "/setup";
      return;
    }

    // Standard web browser flow: redirect to requested target or dashboard
    const rawRedirect = searchParams.get("redirect") || searchParams.get("target") || "/dashboard";
    const redirectUrl =
      rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/dashboard";
    window.location.href = redirectUrl;
  }, [session, isPending, tenantStatusQuery.isLoading, tenantStatusQuery.data, searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 gap-4">
      <div className="w-8 h-8 rounded-full border-2 border-[#2563eb] border-t-transparent animate-spin" />
      <p className="text-sm font-medium text-zinc-600">{t("common.completingAuth")}</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-[#2563eb] border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-zinc-600">{t("common.completingAuth")}</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}

