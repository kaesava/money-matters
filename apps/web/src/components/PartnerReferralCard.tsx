"use client";

import React, { useState } from "react";
import { trpc } from "../lib/trpc";
import posthog from "../lib/posthog-client";
import { Spinner } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";

export const PartnerReferralCard: React.FC = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"IDLE" | "SENDING" | "SENT" | "ERROR">("IDLE");
  const invitePartnerMut = trpc.invitePartner.useMutation();

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("SENDING");
    try {
      await invitePartnerMut.mutateAsync({ email: email.trim() });
      posthog.capture("partner_invited");
      setStatus("SENT");
      setEmail("");
    } catch (err) {
      console.error(err);
      setStatus("ERROR");
    }
  };

  return (
    <div className="bg-gradient-to-r from-[#1B2B4B] to-blue-900 text-white p-6 rounded-2xl shadow-md flex flex-col sm:flex-row justify-between items-center gap-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤝</span>
          <h3 className="text-base font-extrabold tracking-tight">{t("partner.inviteTitle")}</h3>
        </div>
        <p className="text-xs text-blue-200 max-w-md leading-relaxed">
          {t("partner.inviteSubtitle")}
        </p>
      </div>

      <form onSubmit={handleSendInvite} className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
        {status === "SENT" ? (
          <div className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
            <span>✓ {t("partner.inviteSent")}</span>
          </div>
        ) : (
          <>
            <input
              type="email"
              placeholder={t("partner.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-4 py-2 rounded-xl text-slate-900 text-xs font-medium focus:ring-2 focus:ring-blue-400 outline-none w-full sm:w-64"
              required
            />
            <button
              type="submit"
              disabled={status === "SENDING"}
              className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl transition-all shadow-sm whitespace-nowrap flex items-center justify-center gap-1.5"
            >
              {status === "SENDING" ? (
                <>
                  <Spinner size="sm" />
                  <span>{t("partner.sendingInvite")}</span>
                </>
              ) : (
                <span>{t("partner.sendInvite")}</span>
              )}
            </button>
          </>
        )}
      </form>
    </div>
  );
};
