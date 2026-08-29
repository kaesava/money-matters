"use client";

import React, { useState, useEffect } from "react";
import { trpc } from "../../../../lib/trpc";
import { Spinner, InfoTooltip, useToast, LocationFields, validateAustralianPostcode } from "@money-matters/ui/web";

export function HouseholdDetailsSection() {
  const toast = useToast();
  const utils = trpc.useUtils();
  
  const govQuery = trpc.getHouseholdGovernanceInfo.useQuery();
  const gov = govQuery.data;
  
  const [householdName, setHouseholdName] = useState("");
  const [country, setCountry] = useState("AU");
  const [state, setState] = useState("");
  const [postcode, setPostcode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (gov) {
      setHouseholdName(gov.householdName || "");
      setCountry(gov.country || "AU");
      setState(gov.state || "");
      setPostcode(gov.postcode || "");
    }
  }, [gov]);

  const updateHouseholdMut = trpc.updateHousehold.useMutation({
    onSuccess: () => {
      utils.getHouseholdGovernanceInfo.invalidate();
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
        state: state.trim(),
        postcode: postcode.trim(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOwner = gov?.isOwner ?? false;

  return (
    <section className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-5">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-extrabold text-[#1B2B4B]">
          Household Profile & Location
        </h2>
        <InfoTooltip content="Update your household name and location details. Location details are shared across household members (family or housemates)." />
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
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-extrabold bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting && <Spinner size="sm" className="text-white" />}
              <span>Save Household Details</span>
            </button>
          </div>
        )}
      </form>
    </section>
  );
}
