"use client";
import React, { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "../../lib/auth";

function AuthCallbackContent() {
  const { data: session, isPending } = authClient.useSession();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isPending) return;

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

    // Standard web browser flow: redirect to requested target or dashboard
    const rawRedirect = searchParams.get("redirect") || searchParams.get("target") || "/dashboard";
    const redirectUrl =
      rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/dashboard";
    window.location.href = redirectUrl;
  }, [session, isPending, searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 gap-4">
      <div className="w-8 h-8 rounded-full border-2 border-[#2563eb] border-t-transparent animate-spin" />
      <p className="text-sm font-medium text-zinc-600">Completing authentication...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-[#2563eb] border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-zinc-600">Completing authentication...</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}

