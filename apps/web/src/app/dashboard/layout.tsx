"use client";
import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { authClient } from "../../lib/auth";
import { AppHeader } from "../../components/web/AppHeader";
import { DashboardTabNav } from "../../components/web/DashboardTabNav";
import { QuickExpenseDrawer } from "../../components/web/QuickExpenseDrawer";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [quickExpenseOpen, setQuickExpenseOpen] = useState(false);

  const handleSignOut = useCallback(async () => {
    await authClient.signOut();
    if (typeof window !== "undefined") {
      localStorage.removeItem("session_token");
    }
    router.push("/sign-in");
  }, [router]);

  // Redirect unauthenticated users
  if (!isPending && !session?.user) {
    if (typeof window !== "undefined") router.replace("/sign-in");
    return null;
  }

  // Loading state while session is resolving
  if (isPending) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ backgroundColor: "var(--dash-bg)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "var(--dash-teal)" }}
          />
          <p className="text-sm font-medium" style={{ color: "var(--dash-muted)" }}>
            {t("common.loading")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: "var(--dash-bg)" }}>
      <AppHeader
        user={session?.user}
        onQuickExpense={() => setQuickExpenseOpen(true)}
        onSignOut={handleSignOut}
      />
      <DashboardTabNav />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-6 py-6">
        {children}
      </main>

      {quickExpenseOpen && (
        <QuickExpenseDrawer
          onClose={() => setQuickExpenseOpen(false)}
        />
      )}
    </div>
  );
}
