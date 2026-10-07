"use client";

import React from "react";
import { Button, InfoTooltip, LocationFields } from "@money-matters/ui/web";
import { SUPPORTED_CURRENCIES, COMMON_TIMEZONES } from "@money-matters/types";
import { t } from "@money-matters/i18n";

interface HouseholdEditFormProps {
  householdName: string;
  setHouseholdName: (v: string) => void;
  currency: string;
  timezone: string;
  setTimezone: (v: string) => void;
  country: string;
  setCountry: (v: string) => void;
  state: string;
  setState: (v: string) => void;
  postcode: string;
  setPostcode: (v: string) => void;
  isDirty: boolean;
  isSubmitting: boolean;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function HouseholdEditForm({
  householdName,
  setHouseholdName,
  currency,
  timezone,
  setTimezone,
  country,
  setCountry,
  state,
  setState,
  postcode,
  setPostcode,
  isDirty,
  isSubmitting,
  onSave,
  onCancel,
}: HouseholdEditFormProps) {
  return (
    <form onSubmit={onSave} className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-[#1B2B4B]">
            {t("settings.editHouseholdTitle")}
          </h2>
          <InfoTooltip content={t("settings.householdTooltip")} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="edit-household-name" className="text-xs font-bold text-[#1B2B4B]">
          {t("auth.householdNameLabel")} <span className="text-red-500">*</span>
        </label>
        <input
          id="edit-household-name"
          type="text"
          required
          autoFocus
          value={householdName}
          onChange={(e) => setHouseholdName(e.target.value)}
          placeholder={t("auth.householdNamePlaceholder")}
          className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <label htmlFor="edit-household-currency" className="text-xs font-bold text-[#1B2B4B]">
              {t("settings.currency")} <span className="text-red-500">*</span>
            </label>
            <InfoTooltip content={t("settings.currencyLockedTooltip")} />
          </div>
          <select
            id="edit-household-currency"
            value={currency}
            disabled={true}
            className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed focus:outline-none"
          >
            {Object.values(SUPPORTED_CURRENCIES).map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.symbol})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-household-timezone" className="text-xs font-bold text-[#1B2B4B]">
            {t("settings.timezone")} <span className="text-red-500">*</span>
          </label>
          <select
            id="edit-household-timezone"
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
      </div>

      <LocationFields
        country={country}
        onCountryChange={setCountry}
        state={state}
        onStateChange={setState}
        postcode={postcode}
        onPostcodeChange={setPostcode}
      />

      <div className="pt-2 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button
          type="submit"
          loading={isSubmitting}
          disabled={isSubmitting || !isDirty}
        >
          {t("settings.saveHouseholdCta")}
        </Button>
      </div>
    </form>
  );
}
