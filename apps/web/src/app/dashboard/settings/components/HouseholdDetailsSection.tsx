"use client";

import React, { useState, useEffect } from "react";
import { trpc } from "../../../../lib/trpc";
import { Spinner, InfoTooltip, useToast } from "@money-matters/ui/web";

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
    <section className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-extrabold text-[#1B2B4B]">
          Household Details
        </h2>
        <InfoTooltip content="Update your household name and location details." />
      </div>

      <p className="text-xs text-slate-500">
        These details are shared with your partner if they join your household.
      </p>

      <form onSubmit={handleSave} className="flex flex-col gap-4 max-w-md">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
            Household Name
          </label>
          <input
            type="text"
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            disabled={!isOwner}
            className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb] disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
            Country
          </label>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            disabled={!isOwner}
            className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb] disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>

        <div className="flex gap-4">
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              State
            </label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              disabled={!isOwner}
              className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb] disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>

          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              Postcode
            </label>
            <input
              type="text"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              disabled={!isOwner}
              className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb] disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>
        </div>

        {isOwner && (
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold bg-[#1B2B4B] hover:bg-[#1B2B4B]/90 text-white rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting && <Spinner size="sm" className="text-white" />}
              <span>Save Details</span>
            </button>
          </div>
        )}
      </form>
    </section>
  );
}
