"use client";

import React, { useState } from "react";
import { trpc } from "../../../../lib/trpc";
import { Spinner } from "@money-matters/ui";

interface SubscriptionSectionProps {
  isTrialOrActive: boolean;
}

export function SubscriptionSection({ isTrialOrActive }: SubscriptionSectionProps) {
  const [loadingPortal, setLoadingPortal] = useState(false);
  const portalMut = trpc.createCustomerPortalSession.useMutation();

  const handleOpenStripePortal = async () => {
    setLoadingPortal(true);
    try {
      const res = await portalMut.mutateAsync({
        returnUrl: window.location.href,
      });
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to launch billing portal");
    } finally {
      setLoadingPortal(false);
    }
  };

  return (
    <section className="flex flex-col gap-2">
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--dash-muted)" }}>
        Subscription & Plan
      </p>
      <div
        className="p-4 rounded-xl flex flex-col gap-3"
        style={{ backgroundColor: "var(--dash-surface)", border: "1px solid var(--dash-border)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-zinc-500">Current Plan</p>
            <p className="text-base font-extrabold text-[#1B2B4B] mt-0.5">
              {isTrialOrActive ? "Household Plan (Trial / Active)" : "Free Plan"}
            </p>
          </div>
          <a
            href="/subscription/upgrade"
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#2563eb] text-white hover:bg-blue-700 transition-all shadow-xs"
          >
            Upgrade / Change
          </a>
        </div>

        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
          <p className="text-xs text-zinc-500">Manage billing, card details, or invoices via Stripe.</p>
          <button
            type="button"
            onClick={handleOpenStripePortal}
            disabled={loadingPortal}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 transition-all flex items-center gap-1.5"
          >
            {loadingPortal && <Spinner size="sm" />}
            <span>Billing Portal</span>
          </button>
        </div>
      </div>
    </section>
  );
}
