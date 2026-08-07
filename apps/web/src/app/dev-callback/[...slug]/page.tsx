"use client";
import React, { useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";

export default function DevCallbackPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  useEffect(() => {
    const slug = params?.slug;
    if (Array.isArray(slug) && slug.length >= 2) {
      const proto = decodeURIComponent(slug[0]);
      const host = decodeURIComponent(slug.slice(1).join("/"));
      
      const targetUrl = new URL(`${proto}://${host}/dashboard`);
      searchParams.forEach((value, key) => {
        targetUrl.searchParams.set(key, value);
      });

      console.log(`[Dev Callback] Redirecting to original origin: ${targetUrl.toString()}`);
      window.location.href = targetUrl.toString();
    } else {
      console.log(`[Dev Callback] Invalid slug parameters:`, slug);
      window.location.href = "/dashboard";
    }
  }, [params, searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 gap-4">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin border-[#00B4A6]" />
      <p className="text-sm font-medium text-zinc-600">Redirecting to development server...</p>
    </div>
  );
}
