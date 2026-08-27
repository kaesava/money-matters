"use client";

import React, { useState } from "react";
import Link from "next/link";
import JSZip from "jszip";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../../lib/trpc";
import { Spinner, useToast } from "@money-matters/ui/web";

export function PrivacySection({ onOpenBugReport }: { onOpenBugReport?: () => void }) {
  const toast = useToast();
  const [exporting, setExporting] = useState(false);
  const exportQuery = trpc.exportMyData.useQuery(undefined, { enabled: false });

  const handleDownloadZippedCsv = async () => {
    setExporting(true);
    try {
      const { data } = await exportQuery.refetch();
      if (data && data.csvFiles) {
        const zip = new JSZip();
        Object.entries(data.csvFiles).forEach(([fileName, content]) => {
          if (content) {
            zip.file(fileName, content as string);
          }
        });
        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const dateStr = new Date().toISOString().slice(0, 10);
        a.download = `money-matters-export-${dateStr}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(t("toasts.exportSuccess"));
      } else {
        toast.error("No export data returned.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate zip export");
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadJson = async () => {
    setExporting(true);
    try {
      const { data } = await exportQuery.refetch();
      if (data) {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const dateStr = new Date().toISOString().slice(0, 10);
        a.download = `money-matters-export-${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(t("toasts.exportSuccess"));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export JSON data");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Aussie Security & Privacy Card */}
      <section className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
        <h2 className="text-base font-bold text-[#1B2B4B]">
          {t("privacy.aussiePrivacyGuarantee")}
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          {t("privacy.aussiePrivacyDetail")}
        </p>
      </section>

      {/* Data Sovereignty & Zipped CSV Backup Card */}
      <section className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#1B2B4B]">{t("privacy.exportDataTitle")}</h2>
            <p className="text-xs text-slate-500">{t("privacy.exportDataSubtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadZippedCsv}
              disabled={exporting}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#00B4A6] hover:bg-[#00B4A6]/90 text-white transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              {exporting && <Spinner size="sm" />}
              <span>{exporting ? t("privacy.exportingZip") : t("privacy.exportZipButton")}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadJson}
              disabled={exporting}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all disabled:opacity-50"
            >
              JSON
            </button>
          </div>
        </div>
      </section>

      {/* Archived Items & Bug Report Quick Links */}
      <section className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
        <h2 className="text-base font-bold text-[#1B2B4B]">{t("settings.managementTitle")}</h2>
        <div className="flex flex-col gap-2 divide-y divide-slate-100">
          <Link
            href="/dashboard/settings/archived"
            className="pt-2 first:pt-0 flex items-center justify-between text-xs font-bold text-[#2563eb] hover:underline"
          >
            <span>📦 {t("settings.archivedLink")}</span>
            <span>→</span>
          </Link>
          {onOpenBugReport && (
            <button
              type="button"
              onClick={onOpenBugReport}
              className="pt-2.5 flex items-center justify-between text-xs font-bold text-[#2563eb] hover:underline w-full text-left"
            >
              <span>🐛 {t("settings.reportBugLink")}</span>
              <span>→</span>
            </button>
          )}
        </div>
      </section>

      {/* Public Legal & Compliance Info Links (Opened in New Tab) */}
      <section className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
        <h2 className="text-base font-bold text-[#1B2B4B]">Legal & Compliance Documents</h2>
        <div className="flex flex-col gap-2 divide-y divide-slate-100">
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="pt-2 first:pt-0 flex items-center justify-between text-xs font-bold text-[#2563eb] hover:underline"
          >
            <span>{t("privacy.viewPublicPrivacyPolicyLink")}</span>
            <span>↗</span>
          </a>
          <a
            href="/privacy/delete-account"
            target="_blank"
            rel="noopener noreferrer"
            className="pt-2.5 flex items-center justify-between text-xs font-bold text-[#2563eb] hover:underline"
          >
            <span>{t("privacy.viewPublicDeletionInfoLink")}</span>
            <span>↗</span>
          </a>
        </div>
      </section>

      {/* Household Governance & Deletion Link (In-App Action) */}
      <section className="p-6 bg-white border border-red-200 rounded-2xl shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-red-700">{t("privacy.manageGovernance")}</h2>
          <p className="text-xs text-slate-500">{t("privacy.manageGovernanceSub")}</p>
        </div>
        <Link
          href="/dashboard/settings/delete-account"
          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-all shadow-xs"
        >
          Manage Governance
        </Link>
      </section>
    </div>
  );
}
