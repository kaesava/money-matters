"use client";

import React, { useState } from "react";
import Link from "next/link";
import { trpc } from "../../../../lib/trpc";
import { useSubscriptionStatus } from "../../../../hooks/useSubscriptionStatus";
import { Spinner, InfoTooltip } from "@money-matters/ui/web";

export function PartnerInviteSection() {
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerInviting, setPartnerInviting] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);

  const { status } = useSubscriptionStatus();
  const isTrialExpired = status?.isTrialExpired ?? false;
  const inviteMutation = trpc.invitePartner.useMutation();

  const handleInvitePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTrialExpired) return;
    if (!partnerEmail.trim() || !partnerEmail.includes("@")) {
      alert("Please enter a valid email address.");
      return;
    }
    setPartnerInviting(true);
    setInviteSuccessMsg(null);
    try {
      const res = await inviteMutation.mutateAsync({ email: partnerEmail.trim() });
      setInviteSuccessMsg(`Invite link created! Share URL: ${window.location.origin}/invite/${res.inviteToken}`);
      setPartnerEmail("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to generate invite.");
    } finally {
      setPartnerInviting(false);
    }
  };

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--dash-muted)" }}>
          Invite Household Partner
        </p>
        <InfoTooltip content="Invite your partner or spouse to collaborate on your household budget with shared visibility." />
        {isTrialExpired && (
          <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 rounded-full">
            Trial Expired
          </span>
        )}
      </div>
      <form
        onSubmit={handleInvitePartner}
        className="p-4 rounded-xl flex flex-col gap-3"
        style={{ backgroundColor: "var(--dash-surface)", border: "1px solid var(--dash-border)" }}
      >
        {isTrialExpired ? (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900 font-medium">
            <span>🔒 Partner invitations require an active subscription ($9.95/mo).</span>
            <Link
              href="/subscription/upgrade"
              className="px-3 py-1 bg-amber-600 text-white rounded-lg font-bold text-xs hover:bg-amber-700 transition-colors shrink-0"
            >
              Subscribe
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={partnerEmail}
              onChange={(e) => setPartnerEmail(e.target.value)}
              placeholder="partner@example.com"
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-white"
            />
            <button
              type="submit"
              disabled={partnerInviting}
              className="px-4 py-2 text-xs font-bold bg-[#00B4A6] text-white rounded-xl hover:opacity-90 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {partnerInviting && <Spinner size="sm" className="text-white" />}
              <span>Send Invite</span>
            </button>
          </div>
        )}

        {inviteSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium break-all">
            {inviteSuccessMsg}
          </div>
        )}
      </form>
    </section>
  );
}
