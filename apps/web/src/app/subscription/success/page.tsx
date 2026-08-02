"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@money-matters/ui/web";

export default function SubscriptionSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/dashboard");
    }, 5000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-xl border border-zinc-100 flex flex-col items-center gap-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl font-bold">
          🎉
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-[#1B2B4B]">You&apos;re on Household!</h1>
          <p className="text-sm text-zinc-600">
            Thank you for subscribing. Your account has been upgraded with full access to CSV imports, unlimited goals, and file notes.
          </p>
        </div>

        <p className="text-xs text-zinc-400">
          Redirecting to your dashboard in 5 seconds…
        </p>

        <Button
          onClick={() => router.push("/dashboard")}
          className="w-full bg-[#2563eb] hover:bg-blue-700 text-white font-semibold py-3 rounded-xl"
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
