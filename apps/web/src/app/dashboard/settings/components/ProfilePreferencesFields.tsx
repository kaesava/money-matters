"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { InfoTooltip } from "@money-matters/ui/web";
import { SUPPORTED_LOCALES } from "@money-matters/types";
import { COMMON_TIMEZONES } from "./timezones";

interface ProfilePreferencesFieldsProps {
  language: "en" | "ja";
  setLanguageState: (val: "en" | "ja") => void;
  locale: string;
  setLocale: (val: string) => void;
  timezone: string;
  setTimezone: (val: string) => void;
  showIcons: boolean;
  setShowIcons: (val: boolean) => void;
}

export function ProfilePreferencesFields({
  language,
  setLanguageState,
  locale,
  setLocale,
  timezone,
  setTimezone,
  showIcons,
  setShowIcons,
}: ProfilePreferencesFieldsProps) {
  return (
    <>
      {/* Language & Date Format */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-language" className="text-xs font-bold text-[#1B2B4B]">
            {t("settings.language")}
          </label>
          <select
            id="edit-language"
            value={language}
            onChange={(e) => setLanguageState(e.target.value as "en" | "ja")}
            className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          >
            <option value="en">English (en)</option>
            <option value="ja">日本語 (ja)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-date-format" className="text-xs font-bold text-[#1B2B4B]">
            {t("settings.dateFormat")}
          </label>
          <select
            id="edit-date-format"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          >
            {SUPPORTED_LOCALES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label} ({l.dateFormatExample})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timezone */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="edit-timezone" className="text-xs font-bold text-[#1B2B4B]">
          {t("settings.items.timezone")}
        </label>
        <select
          id="edit-timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
        >
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>

      {/* Show Icons Toggle */}
      <div className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-slate-50/50">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-bold text-[#1B2B4B]">{t("settings.items.showIcons")}</p>
          <InfoTooltip
            title={t("settings.items.showIcons")}
            content={t("settings.items.showIconsHint")}
          />
        </div>
        <input
          type="checkbox"
          checked={showIcons}
          onChange={(e) => setShowIcons(e.target.checked)}
          className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#2563eb]"
        />
      </div>
    </>
  );
}
