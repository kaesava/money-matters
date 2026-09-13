"use client";

import React from "react";
import { Button, InfoTooltip, LocationFields } from "@money-matters/ui/web";
import { SUPPORTED_CURRENCIES } from "@money-matters/types";
import { t } from "@money-matters/i18n";

interface HouseholdEditFormProps {
  householdName: string;
  setHouseholdName: (v: string) => void;
  currency: string;
  setCurrency: (v: string) => void;
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
  setPendingCurrency: (v: string | null) => void;
  govCurrency?: string;
}

export function HouseholdEditForm({
  householdName,
  setHouseholdName,
  currency,
  setCurrency,
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
  setPendingCurrency,
  govCurrency,
}: HouseholdEditFormProps) {
  return (
    <form onSubmit={onSave} className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-[#1B2B4B]">
            {t("settings.editHouseholdTitle", { defaultValue: "Edit Household Details" })}
          </h2>
          <InfoTooltip content="Update your household name, base currency, and location details. Shared across household members." />
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={isSubmitting || !isDirty}
          >
            {t("common.save")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="edit-household-name" className="text-xs font-bold text-[#1B2B4B]">
          Household Name <span className="text-red-500">*</span>
        </label>
        <input
          id="edit-household-name"
          type="text"
          required
          autoFocus
          value={householdName}
          onChange={(e) => setHouseholdName(e.target.value)}
          placeholder="e.g. Smith Household"
          className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-household-currency" className="text-xs font-bold text-[#1B2B4B]">
            {t("settings.currency")} <span className="text-red-500">*</span>
          </label>
          <select
            id="edit-household-currency"
            value={currency}
            onChange={(e) => {
              const nextCurr = e.target.value;
              if (nextCurr !== (govCurrency || "AUD")) {
                setPendingCurrency(nextCurr);
              } else {
                setCurrency(nextCurr);
              }
            }}
            className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
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
            <option value="Australia/Sydney">Sydney / Melbourne (AEST/AEDT)</option>
            <option value="Australia/Brisbane">Brisbane (AEST)</option>
            <option value="Australia/Adelaide">Adelaide (ACST/ACDT)</option>
            <option value="Australia/Perth">Perth (AWST)</option>
            <option value="Pacific/Auckland">Auckland / Wellington (NZST/NZDT)</option>
            <option value="Europe/London">London (GMT/BST)</option>
            <option value="America/New_York">New York (EST/EDT)</option>
            <option value="America/Chicago">Chicago (CST/CDT)</option>
            <option value="America/Denver">Denver (MST/MDT)</option>
            <option value="America/Los_Angeles">Los Angeles (PST/PDT)</option>
            <option value="Asia/Tokyo">Tokyo (JST)</option>
            <option value="Asia/Singapore">Singapore (SGT)</option>
            <option value="UTC">UTC (Universal Coordinated Time)</option>
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
          Save Household Details
        </Button>
      </div>
    </form>
  );
}
