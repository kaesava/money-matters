"use client";

import React, { useState } from "react";
import Link from "next/link";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../../lib/trpc";
import { useSubscriptionStatus } from "../../../../hooks/useSubscriptionStatus";
import { Spinner, InfoTooltip, useToast } from "@money-matters/ui/web";

export function PartnerInviteSection() {
  const toast = useToast();
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerInviting, setPartnerInviting] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);

  const { status } = useSubscriptionStatus();
  const isTrialExpired = status?.isTrialExpired ?? false;

  const govQuery = trpc.getHouseholdGovernanceInfo.useQuery();
  const inviteMutation = trpc.invitePartner.useMutation();

  const gov = govQuery.data;
  const isOwner = gov?.isOwner ?? true;

  const handleInvitePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;
    if (isTrialExpired) return;
    if (!partnerEmail.trim() || !partnerEmail.includes("@")) {
      toast.warning("Please enter a valid email address.");
      return;
    }
    setPartnerInviting(true);
    setInviteSuccessMsg(null);
    try {
      const res = await inviteMutation.mutateAsync({ email: partnerEmail.trim() });
      setInviteSuccessMsg(`Invite link created! Share URL: ${window.location.origin}/invite/${res.inviteToken}`);
      setPartnerEmail("");
      toast.success("Partner invite link generated successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate invite.");
    } finally {
      setPartnerInviting(false);
    }
  };

  return (
    <section className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-extrabold text-[#1B2B4B]">
            {t("partner.inviteTitle")}
          </h2>
          <InfoTooltip content={t("partner.inviteSubtitle")} />
        </div>
        {isTrialExpired && (
          <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 rounded-full">
            Trial Expired
          </span>
        )}
      </div>

      <p className="text-xs text-slate-500">{t("partner.inviteSubtitle")}</p>

      {!isOwner ? (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-900">
          ℹ️ {t("partner.ownerOnlyNotice", { email: gov?.partnerEmail || "the owner" })}
        </div>
      ) : isTrialExpired ? (
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
        <form onSubmit={handleInvitePartner} className="flex items-center gap-2">
          <input
            type="email"
            value={partnerEmail}
            onChange={(e) => setPartnerEmail(e.target.value)}
            placeholder="partner@example.com"
            className="flex-1 px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          />
          <button
            type="submit"
            disabled={partnerInviting}
            className="px-4 py-2 text-xs font-bold bg-[#00B4A6] hover:bg-[#00B4A6]/90 text-white rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            {partnerInviting && <Spinner size="sm" className="text-white" />}
            <span>{t("partner.sendInvite")}</span>
          </button>
        </form>
      )}

      {inviteSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium break-all">
          {inviteSuccessMsg}
        </div>
      )}
    </section>
  );
}
