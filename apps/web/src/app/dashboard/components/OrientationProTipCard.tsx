"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";

export function OrientationProTipCard() {
  const router = useRouter();

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-between">
      <div className="space-y-1 max-w-xl">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-900">
          {t("dashboard.bankAccountTip.title")}
        </h4>
        <p className="text-xs text-blue-800 leading-relaxed">
          {t("dashboard.bankAccountTip.description")}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => router.push("/dashboard/settings/history")}
          className="px-3 py-2 text-xs font-bold text-blue-900 bg-white border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors cursor-pointer"
        >
          📥 Import Bank CSV
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard/bank-accounts")}
          className="px-3 py-2 text-xs font-bold text-white bg-[#2563eb] rounded-xl hover:bg-blue-700 transition-colors cursor-pointer"
        >
          {t("dashboard.bankAccountTip.action")}
        </button>
      </div>
    </div>
  );
}
