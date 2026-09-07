"use client";

import React, { useState, useEffect } from "react";
import { trpc } from "../../../../lib/trpc";
import { Spinner, InfoTooltip, useToast, LocationFields, validateAustralianPostcode, isFormDirty, ConfirmDialog } from "@money-matters/ui/web";
import { SUPPORTED_CURRENCIES } from "@money-matters/types";
import { t } from "@money-matters/i18n";

export function HouseholdDetailsSection() {
  const toast = useToast();
  const utils = trpc.useUtils();
  
  const govQuery = trpc.getHouseholdGovernanceInfo.useQuery();
  const gov = govQuery.data;
  
  const [householdName, setHouseholdName] = useState("");
  const [country, setCountry] = useState("AU");
  const [currency, setCurrency] = useState("AUD");
  const [timezone, setTimezone] = useState("Australia/Sydney");
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null);
  const [state, setState] = useState("");
  const [postcode, setPostcode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (gov) {
      setHouseholdName(gov.householdName || "");
      setCountry(gov.country || "AU");
      setCurrency(gov.currency || "AUD");
      setTimezone(gov.timezone || "Australia/Sydney");
      setState(gov.state || "");
      setPostcode(gov.postcode || "");
    }
  }, [gov]);

  const updateHouseholdMut = trpc.updateHousehold.useMutation({
    onSuccess: () => {
      utils.getHouseholdGovernanceInfo.invalidate();
      utils.getUserPreferences.invalidate();
      toast.success("Household details updated successfully");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update household details");
    },
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gov?.isOwner) return;

    if (!householdName.trim()) {
      toast.error("Household name cannot be blank.");
      return;
    }

    if (country === "AU" && postcode.trim() && !validateAustralianPostcode(postcode)) {
      toast.error("Australian postcode must be exactly 4 digits.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await updateHouseholdMut.mutateAsync({
        name: householdName.trim(),
        country: country.trim(),
        currency: currency.trim(),
        timezone: timezone.trim(),
        state: state.trim(),
        postcode: postcode.trim(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOwner = gov?.isOwner ?? false;
  const initialState = gov ? {
    householdName: gov.householdName || "",
    country: gov.country || "AU",
    currency: gov.currency || "AUD",
    timezone: gov.timezone || "Australia/Sydney",
    state: gov.state || "",
    postcode: gov.postcode || "",
  } : null;
  const currentState = {
    householdName,
    country,
    currency,
    timezone,
    state,
    postcode,
  };
  const isDirty = isFormDirty(initialState, currentState);

  return (
    <section className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-5">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-extrabold text-[#1B2B4B]">
          Household Profile & Location
        </h2>
        <InfoTooltip content="Update your household name, base currency, and location details. Shared across household members." />
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-5 w-full">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#1B2B4B]">
            Household Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            disabled={!isOwner}
            placeholder="e.g. Smith Household"
            className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb] disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#1B2B4B]">
              {t("settings.currency")} <span className="text-red-500">*</span>
            </label>
            <select
              value={currency}
              disabled={!isOwner}
              onChange={(e) => {
                const nextCurr = e.target.value;
                if (nextCurr !== (gov?.currency || "AUD")) {
                  setPendingCurrency(nextCurr);
                } else {
                  setCurrency(nextCurr);
                }
              }}
              className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb] disabled:bg-slate-50 disabled:text-slate-400"
            >
              {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.symbol})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#1B2B4B]">
              {t("settings.timezone")} <span className="text-red-500">*</span>
            </label>
            <select
              value={timezone}
              disabled={!isOwner}
              onChange={(e) => setTimezone(e.target.value)}
              className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb] disabled:bg-slate-50 disabled:text-slate-400"
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
          disabled={!isOwner}
        />

        {isOwner && (
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !isDirty}
              onClick={(e) => {
                if (!isDirty && !isSubmitting) {
                  e.preventDefault();
                  toast.info("No changes to save.");
                }
              }}
              className={`px-5 py-2.5 text-xs font-extrabold text-white rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer ${
                !isDirty ? "bg-zinc-300 opacity-60 cursor-not-allowed" : "bg-[#2563eb] hover:bg-blue-700"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" className="text-white" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Save Household Details</span>
              )}
            </button>
          </div>
        )}
      </form>

      {pendingCurrency && (
        <ConfirmDialog
          isOpen={!!pendingCurrency}
          title={t("settings.currencyConfirmTitle")}
          description={t("settings.currencyConfirmBody", {
            oldCurrency: gov?.currency || "AUD",
            newCurrency: pendingCurrency,
          })}
          confirmLabel={t("common.confirm")}
          cancelLabel={t("common.cancel")}
          variant="warning"
          onConfirm={() => {
            setCurrency(pendingCurrency);
            setPendingCurrency(null);
          }}
          onClose={() => {
            setPendingCurrency(null);
          }}
        />
      )}
    </section>
  );
}
