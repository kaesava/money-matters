"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { Button, InfoTooltip } from "@money-matters/ui/web";
import { SUPPORTED_CURRENCIES, SUPPORTED_COUNTRIES } from "@money-matters/types";

interface HouseholdReadOnlyViewProps {
  householdName: string;
  currency: string;
  timezone: string;
  country: string;
  state: string;
  postcode: string;
  isOwner: boolean;
  onEdit: () => void;
}

export function HouseholdReadOnlyView({
  householdName,
  currency,
  timezone,
  country,
  state,
  postcode,
  isOwner,
  onEdit,
}: HouseholdReadOnlyViewProps) {
  const currencyConfig = SUPPORTED_CURRENCIES[currency];
  const countryConfig = SUPPORTED_COUNTRIES.find((c) => c.code === country);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-extrabold text-[#1B2B4B]">
            Household Profile & Location
          </h2>
          <InfoTooltip content="Update your household name, base currency, and location details. Shared across household members." />
        </div>

        {isOwner && (
          <Button variant="secondary" onClick={onEdit} className="shrink-0">
            {t("common.edit")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Household Name
          </span>
          <span className="text-xs font-semibold text-[#1B2B4B]">
            {householdName || "—"}
          </span>
        </div>

        <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {t("settings.currency")}
          </span>
          <span className="text-xs font-semibold text-[#1B2B4B]">
            {currencyConfig ? `${currencyConfig.name} (${currencyConfig.symbol})` : currency}
          </span>
        </div>

        <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {t("settings.timezone")}
          </span>
          <span className="text-xs font-semibold text-[#1B2B4B] font-mono">
            {timezone}
          </span>
        </div>

        <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Country
          </span>
          <span className="text-xs font-semibold text-[#1B2B4B]">
            {countryConfig ? `${countryConfig.flag} ${countryConfig.name}` : country}
          </span>
        </div>

        <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            State / Region
          </span>
          <span className="text-xs font-semibold text-[#1B2B4B]">
            {state || "—"}
          </span>
        </div>

        <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Postal / ZIP Code
          </span>
          <span className="text-xs font-semibold text-[#1B2B4B]">
            {postcode || "—"}
          </span>
        </div>
      </div>

      {/* Household Budget Re-calibration Card */}
      <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <span className="text-xs font-black text-[#1B2B4B] flex items-center gap-1.5">
            <span>⚙️</span>
            <span>{t("setup.recalibrateTitle")}</span>
          </span>
          <p className="text-[11px] text-slate-500 max-w-xl leading-relaxed">
            {t("setup.recalibrateSubtitle")}
          </p>
        </div>
        <a
          href="/setup?mode=rerun"
          className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-2xs shrink-0 self-start sm:self-center cursor-pointer"
        >
          {t("setup.recalibrateTitle")}
        </a>
      </div>
    </div>
  );
}
