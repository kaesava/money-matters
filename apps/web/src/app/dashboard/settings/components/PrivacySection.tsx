"use client";

import React, { useState } from "react";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../../lib/trpc";
import { Spinner } from "@money-matters/ui";

export function PrivacySection() {
  const [exporting, setExporting] = useState(false);
  const exportQuery = trpc.exportMyData.useQuery(undefined, { enabled: false });

  const handleDownloadData = async () => {
    setExporting(true);
    try {
      const { data } = await exportQuery.refetch();
      if (data) {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `money-matters-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="flex flex-col gap-2">
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--dash-muted)" }}>
        {t("privacy.title")}
      </p>
      <div
        className="p-4 rounded-xl flex flex-col gap-3"
        style={{ backgroundColor: "var(--dash-surface)", border: "1px solid var(--dash-border)" }}
      >
        <p className="text-xs text-zinc-500">{t("privacy.dataMinimizationBody")}</p>

        <div className="flex items-center justify-between pt-1">
          <div>
            <p className="text-xs font-bold text-[#1B2B4B]">{t("privacy.exportDataTitle")}</p>
            <p className="text-[11px] text-zinc-500">{t("privacy.exportDataSubtitle")}</p>
          </div>
          <button
            type="button"
            onClick={handleDownloadData}
            disabled={exporting}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-all flex items-center gap-1.5"
          >
            {exporting && <Spinner size="sm" />}
            <span>{t("privacy.exportButton")}</span>
          </button>
        </div>

        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-rose-700">{t("privacy.deleteAccountTitle")}</p>
            <p className="text-[11px] text-zinc-500">{t("privacy.deleteAccountSubtitle")}</p>
          </div>
          <a
            href="/privacy/delete-account"
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all"
          >
            Manage Erasure
          </a>
        </div>
      </div>
    </section>
  );
}
