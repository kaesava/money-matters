"use client";
import React, { useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { logger } from "@/lib/logger";

function isAllowedHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".kaesava.au")
  );
}

export default function DevCallbackPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      window.location.href = "/dashboard";
      return;
    }

    const slug = params?.slug;
    if (Array.isArray(slug) && slug.length >= 2) {
      const proto = decodeURIComponent(slug[0]);
      const host = decodeURIComponent(slug.slice(1).join("/"));
      
      try {
        const targetUrl = new URL(`${proto}://${host}/dashboard`);
        if (!isAllowedHost(targetUrl.hostname)) {
          logger.warn("[Dev Callback] Blocked unallowed redirect hostname", { hostname: targetUrl.hostname });
          window.location.href = "/dashboard";
          return;
        }

        searchParams.forEach((value, key) => {
          targetUrl.searchParams.set(key, value);
        });

        logger.info("[Dev Callback] Redirecting to target origin", { target: targetUrl.origin });
        window.location.href = targetUrl.toString();
      } catch {
        window.location.href = "/dashboard";
      }
    } else {
      window.location.href = "/dashboard";
    }
  }, [params, searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 gap-4">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin border-[#2563eb]" />
      <p className="text-sm font-medium text-zinc-600">Redirecting to development server...</p>
    </div>
  );
}
