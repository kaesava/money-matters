"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { InfoTooltip } from "@money-matters/ui/web";
import { COMMON_TIMEZONES } from "@money-matters/types";

interface ProfilePreferencesFieldsProps {
  language: "en";
  setLanguageState: (val: "en") => void;
  timezone: string;
  setTimezone: (val: string) => void;
  showIcons: boolean;
  setShowIcons: (val: boolean) => void;
}

export function ProfilePreferencesFields({
  language,
  setLanguageState,
  timezone,
  setTimezone,
  showIcons,
  setShowIcons,
}: ProfilePreferencesFieldsProps) {
  return (
    <>
      {/* Language */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="edit-language" className="text-xs font-bold text-[#1B2B4B]">
          {t("settings.language")}
        </label>
        <select
          id="edit-language"
          value={language}
          onChange={(e) => setLanguageState(e.target.value as "en")}
          className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
        >
          <option value="en">English (en)</option>
        </select>
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
      <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl bg-slate-50/50">
        <input
          id="toggle-show-icons"
          type="checkbox"
          checked={showIcons}
          onChange={(e) => setShowIcons(e.target.checked)}
          className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#2563eb] cursor-pointer"
        />
        <label htmlFor="toggle-show-icons" className="flex items-center gap-1.5 cursor-pointer select-none flex-1">
          <span className="text-xs font-bold text-[#1B2B4B]">{t("settings.items.showIcons")}</span>
          <InfoTooltip
            title={t("settings.items.showIcons")}
            content={t("settings.items.showIconsHint")}
          />
        </label>
      </div>
    </>
  );
}
