"use client";
import React, { useEffect } from "react";
import { authClient } from "../../lib/auth";

export default function AuthCallbackPage() {
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending) return;
    
    // Extract the JWT session token
    const token = session?.session?.token;
    if (token) {
      if (process.env.NODE_ENV === "development") console.log("Redirecting back to mobile app with token...");
      window.location.href = `moneymatters://home?token=${token}`;
    } else {
      if (process.env.NODE_ENV === "development") console.log("No token found, redirecting back to mobile app home...");
      window.location.href = "moneymatters://home";
    }
  }, [session, isPending]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 gap-4">
      <div
        className="w-8 h-8 rounded-full border-2 border-[#2563eb] border-t-transparent animate-spin"
      />
      <p className="text-sm font-medium text-zinc-600">Authenticating mobile application...</p>
    </div>
  );
}
