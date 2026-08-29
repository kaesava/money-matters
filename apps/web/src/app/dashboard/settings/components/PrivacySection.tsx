"use client";

import React, { useState } from "react";
import JSZip from "jszip";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../../lib/trpc";
import { Spinner, useToast, InfoTooltip } from "@money-matters/ui/web";

export function PrivacySection() {
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
          if (typeof content === "string") {
            zip.file(fileName, content);
          }
        });
        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const dateStr = new Date().toISOString().slice(0, 10);
        a.download = `money-matters-backup-${dateStr}.zip`;
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

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Aussie Security & Privacy Trust Card */}
      <section className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-extrabold text-[#1B2B4B]">
            Aussie Privacy & Security Guarantee
          </h2>
          <InfoTooltip content="Bank-grade encryption, local Australian hosting compliance, and stealth tenant data isolation." />
        </div>
        <p className="text-xs text-slate-600 leading-relaxed font-medium">
          Your financial data is 100% private to your household. We use bank-grade TLS 1.3 encryption, Neon RLS stealth isolation, and strict Australian Privacy Principles (Privacy Act 1988 Cth). We never rent, sell, or share your financial records with third parties.
        </p>
      </section>

      {/* Data Sovereignty & Zipped CSV Backup Card */}
      <section className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-extrabold text-[#1B2B4B]">
              Data Sovereignty & Zipped CSV Backup
            </h2>
            <p className="text-xs text-slate-500">
              Download a complete zipped CSV archive containing your profile, household details, categories, bank accounts, transactions, and payday allocation plans.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadZippedCsv}
            disabled={exporting}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#00B4A6] hover:bg-[#00B4A6]/90 text-white transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 shrink-0"
          >
            {exporting && <Spinner size="sm" className="text-white" />}
            <span>{exporting ? "Generating Zipped Backup..." : "Download Zipped CSV Backup"}</span>
          </button>
        </div>
      </section>
    </div>
  );
}
