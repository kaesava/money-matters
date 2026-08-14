"use client";

import React, { useState } from "react";
import { trpc } from "../../../../lib/trpc";
import { Spinner } from "@money-matters/ui";

export function PartnerInviteSection() {
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerInviting, setPartnerInviting] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);

  const inviteMutation = trpc.invitePartner.useMutation();

  const handleInvitePartner = async (e: React.FormEvent) => {
    e.preventDefault();
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
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--dash-muted)" }}>
        Invite Household Partner
      </p>
      <form
        onSubmit={handleInvitePartner}
        className="p-4 rounded-xl flex flex-col gap-3"
        style={{ backgroundColor: "var(--dash-surface)", border: "1px solid var(--dash-border)" }}
      >
        <p className="text-xs text-zinc-500">
          Invite your partner or spouse to collaborate on your household budget with shared visibility.
        </p>

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

        {inviteSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium break-all">
            {inviteSuccessMsg}
          </div>
        )}
      </form>
    </section>
  );
}
