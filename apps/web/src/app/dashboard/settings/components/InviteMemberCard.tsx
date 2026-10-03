"use client";

import React from "react";
import Link from "next/link";
import { t } from "@money-matters/i18n";
import { InfoTooltip, Button } from "@money-matters/ui/web";

interface InviteMemberCardProps {
  isOwner: boolean;
  isTrialExpired: boolean;
  partnerEmail: string;
  setPartnerEmail: (val: string) => void;
  partnerInviting: boolean;
  onInviteMember: (e: React.FormEvent) => void;
  inviteSuccessMsg: string | null;
}

export function InviteMemberCard({
  isOwner,
  isTrialExpired,
  partnerEmail,
  setPartnerEmail,
  partnerInviting,
  onInviteMember,
  inviteSuccessMsg,
}: InviteMemberCardProps) {
  return (
    <section className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-extrabold text-[#1B2B4B]">
            {t("settings.addMemberTitle")}
          </h2>
          <InfoTooltip content={t("settings.members.inviteTooltip")} />
        </div>
        {isTrialExpired && (
          <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 rounded-full">
            {t("settings.members.trialExpiredBadge")}
          </span>
        )}
      </div>

      {!isOwner ? (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-900">
          ℹ️ {t("settings.members.onlyOwnerCanInvite")}
        </div>
      ) : isTrialExpired ? (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900 font-medium">
          <span>🔒 {t("settings.members.trialUpgradeRequired")}</span>
          <Link
            href="/subscription/upgrade"
            className="px-3 py-1 bg-amber-600 text-white rounded-lg font-bold text-xs hover:bg-amber-700 transition-colors shrink-0"
          >
            {t("settings.members.subscribeCta")}
          </Link>
        </div>
      ) : (
        <form onSubmit={onInviteMember} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#1B2B4B]">
              {t("settings.members.emailAddressLabel")}
            </label>
            <input
              type="email"
              required
              value={partnerEmail}
              onChange={(e) => setPartnerEmail(e.target.value)}
              placeholder="housemate@example.com"
              className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              loading={partnerInviting}
              disabled={!partnerEmail.trim()}
            >
              {t("settings.members.sendInvitationCta")}
            </Button>
          </div>
        </form>
      )}

      {inviteSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium break-all mt-2">
          {inviteSuccessMsg}
        </div>
      )}
    </section>
  );
}
