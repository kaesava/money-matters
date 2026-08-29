import React from "react";
import { t } from "@money-matters/i18n";

interface SeriesNoticeBannerProps {
  eventType: "INCOME" | "EXPENSE";
  eventName: string;
}

export function SeriesNoticeBanner({ eventType, eventName }: SeriesNoticeBannerProps) {
  const targetHref =
    eventType === "INCOME"
      ? `/dashboard/income-and-bills?search=${encodeURIComponent(eventName)}`
      : `/dashboard/settings/income-expenses?search=${encodeURIComponent(eventName)}`;

  return (
    <div className="p-3 rounded-xl bg-teal-50/80 border border-teal-200 flex items-center justify-between text-xs">
      <div className="flex flex-col gap-0.5">
        <span className="font-extrabold text-[#1B2B4B]">{t("upcoming.singleOccurrenceEdit")}</span>
        <span className="text-[11px] text-zinc-600">
          Editing this specific {eventType === "INCOME" ? "income" : "expense"} date or amount.
        </span>
      </div>
      <a
        href={targetHref}
        onClick={(e) => {
          e.preventDefault();
          window.location.href = targetHref;
        }}
        className="text-xs font-black text-[#00B4A6] hover:underline flex items-center gap-1 shrink-0 ml-2"
      >
        <span>{t("upcoming.editMasterSeries")}</span>
        <span>→</span>
      </a>
    </div>
  );
}
