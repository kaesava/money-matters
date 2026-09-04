import React from "react";
import { t } from "@money-matters/i18n";
import { useRecurrenceBuilder } from "../../hooks/useRecurrenceBuilder.js";
import { Input } from "../Input.js";

interface RecurrenceBuilderProps {
  builder: ReturnType<typeof useRecurrenceBuilder>;
}

export function RecurrenceBuilder({ builder }: RecurrenceBuilderProps) {
  const {
    isRecurring,
    setIsRecurring,
    frequency,
    setFrequency,
    interval,
    setInterval,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
  } = builder;

  return (
    <div className="flex flex-col gap-3 pt-3 border-t border-zinc-100">
      <div className="flex items-center justify-between">
        <label className="text-xs font-extrabold uppercase tracking-wider text-[#1B2B4B]">
          {t("forms.recurrenceSchedule")}
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsRecurring(true)}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              isRecurring ? "bg-[#1B2B4B] text-white shadow-sm" : "bg-zinc-100 text-zinc-600"
            }`}
          >
            {t("forms.recurring")}
          </button>
          <button
            type="button"
            onClick={() => setIsRecurring(false)}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              !isRecurring ? "bg-[#1B2B4B] text-white shadow-sm" : "bg-zinc-100 text-zinc-600"
            }`}
          >
            {t("forms.oneOff")}
          </button>
        </div>
      </div>

      {isRecurring ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              {t("forms.frequency")}
            </label>
            <select
              value={frequency}
              onChange={(e) => {
                setFrequency(e.target.value as any);
                setInterval(1); // Reset interval when changing frequency
              }}
              className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] text-zinc-900 bg-white"
            >
              <option value="WEEKLY">{t("forms.weekly")}</option>
              <option value="FORTNIGHTLY">{t("forms.fortnightly")}</option>
              <option value="MONTHLY">{t("forms.monthly")}</option>
              <option value="ANNUALLY">Annually (Yearly)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              {frequency === "MONTHLY" || frequency === "WEEKLY" ? "Every" : "Interval"}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="99"
                value={interval}
                disabled={frequency === "FORTNIGHTLY" || frequency === "ANNUALLY"}
                onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
                className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] text-zinc-900 w-full disabled:opacity-50 disabled:bg-zinc-50"
              />
              <span className="text-xs font-bold text-zinc-500 w-16">
                {frequency === "WEEKLY" ? "Weeks" : frequency === "MONTHLY" ? "Months" : ""}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              {t("forms.firstDate")}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] text-zinc-900 w-full bg-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              End Date (Optional)
            </label>
            <input
              type="date"
              value={endDate || ""}
              onChange={(e) => setEndDate(e.target.value || null)}
              className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] text-zinc-900 w-full bg-white"
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              {t("forms.eventDate")}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] text-zinc-900 w-full bg-white"
            />
          </div>
          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-[11px] font-semibold leading-relaxed">
            ℹ️ {t("forms.oneOffNotice", { defaultValue: "One-off items do not create a recurring schedule and will appear directly in your Upcoming Timeline." })}
          </div>
        </div>
      )}
    </div>
  );
}
