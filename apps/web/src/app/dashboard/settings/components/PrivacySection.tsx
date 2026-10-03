"use client";

import React, { useState } from "react";
import JSZip from "jszip";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../../lib/trpc";
import { useToast, InfoTooltip, Button, fmtDateIso } from "@money-matters/ui/web";
import { useLocale } from "../../../../providers/LocaleProvider";
import { buildExportFileName } from "@money-matters/types";

export function PrivacySection() {
  const toast = useToast();
  const { userTimezone } = useLocale();
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
        const dateStr = fmtDateIso(undefined, userTimezone);
        a.download = buildExportFileName(dateStr);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(t("toasts.exportSuccess"));
      } else {
        toast.error(t("common.errorTryAgain"));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.errorTryAgain"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <section className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-[#1B2B4B]">
                {t("privacy.title")}
              </h2>
              <InfoTooltip content={t("privacy.aussiePrivacyGuarantee")} />
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {t("privacy.aussiePrivacyDetail")}
            </p>
            <div>
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-[#2563eb] hover:underline inline-flex items-center gap-1"
              >
                <span>{t("privacy.viewPublicPrivacyPolicyLink")}</span>
                <span className="text-[10px] text-blue-400">↗</span>
              </a>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleDownloadZippedCsv}
            loading={exporting}
            className="shrink-0"
          >
            {t("privacy.exportZipButton")}
          </Button>
        </div>
      </section>
    </div>
  );
}
