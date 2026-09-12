"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import { t } from "@money-matters/i18n";
import { Logo, Button, Spinner } from "@money-matters/ui/web";
import { authClient } from "../../../lib/auth";
import { trpc } from "../../../lib/trpc";
import posthog from "../../../lib/posthog-client";

export default function SubscriptionExpiredPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/settings?tab=account-data");
  }, [router]);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportQuery = trpc.exportMyData.useQuery(undefined, { enabled: false });

  const handleSignOut = async () => {
    await authClient.signOut();
    posthog.reset();
    router.push("/sign-in");
  };

  const handleDownloadBackup = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const { data } = await exportQuery.refetch();
      if (data && data.csvFiles) {
        const zip = new JSZip();
        Object.entries(data.csvFiles).forEach(([fileName, content]) => {
          if (typeof content === "string") {
            zip.file(fileName, content);
          }
        });
        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date());
        a.download = `money-matters-backup-${dateStr}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        setExportError("No export data available.");
      }
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Failed to export data.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col font-sans">
      {/* Top Header */}
      <header className="w-full bg-[#1B2B4B] border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-3">
          <Logo size="md" />
          <span className="text-lg font-extrabold text-white tracking-tight">
            {t("app.title")}
          </span>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="text-xs font-bold text-rose-300 hover:text-white bg-rose-500/20 hover:bg-rose-500/30 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
        >
          {t("subscription.signOutCta")}
        </button>
      </header>

      {/* Main Expired Content */}
      <main className="flex-1 w-full max-w-xl mx-auto px-6 py-16 flex flex-col items-center justify-center">
        <div className="w-full bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-slate-200 flex flex-col items-center text-center gap-6">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-3xl">
            👋
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#1B2B4B] tracking-tight">
              {t("subscription.expiredPageTitle")}
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed max-w-md">
              {t("subscription.expiredPageSubtitle")}
            </p>
          </div>

          {exportError && (
            <div className="w-full bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-semibold">
              ⚠️ {exportError}
            </div>
          )}

          <div className="w-full flex flex-col gap-3 pt-4 border-t border-slate-100">
            <Button
              onClick={() => router.push("/subscription/upgrade")}
              className="w-full bg-[#2563eb] hover:bg-blue-700 text-white font-extrabold py-3.5 rounded-xl shadow-md text-sm transition-all cursor-pointer"
            >
              {t("subscription.upgradeNowCta")} →
            </Button>

            <button
              type="button"
              onClick={handleDownloadBackup}
              disabled={exporting}
              className="w-full bg-slate-100 hover:bg-slate-200 text-[#1B2B4B] font-bold py-3.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
            >
              {exporting && <Spinner size="sm" />}
              <span>
                {exporting ? t("subscription.exportingData") : t("subscription.exportDataCta")}
              </span>
            </button>
          </div>

          <div className="pt-2 text-center text-[11px] text-slate-400 font-medium">
            {t("subscription.supportHelpText", { email: "support@moneymatters.kaesava.au" })}
          </div>
        </div>
      </main>
    </div>
  );
}
