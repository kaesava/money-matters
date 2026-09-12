"use client";

import React from "react";
import Link from "next/link";
import { t } from "@money-matters/i18n";
import { authClient } from "../../lib/auth";
import { useSubscriptionStatus } from "../../hooks/useSubscriptionStatus";

function AuthenticatedHeroActions({
  isGrace,
  isSubscribed,
}: {
  isGrace?: boolean;
  isSubscribed?: boolean;
}) {
  if (isGrace) {
    return (
      <div className="flex flex-col sm:flex-row items-center gap-3.5 mt-1">
        <Link
          href="/subscription/upgrade"
          className="w-full sm:w-auto bg-[#2563eb] hover:bg-blue-700 text-white font-extrabold px-8 py-4 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-98 text-sm cursor-pointer text-center"
        >
          {t("landing.heroCtaGrace")}
        </Link>
        <Link
          href="/dashboard"
          className="w-full sm:w-auto bg-white border border-slate-200 hover:bg-slate-50 text-[#1B2B4B] font-bold px-7 py-4 rounded-2xl transition-all text-sm shadow-2xs cursor-pointer text-center"
        >
          {t("landing.heroCtaGraceSecondary")}
        </Link>
      </div>
    );
  }

  const label = isSubscribed
    ? t("landing.heroCtaSubscribed")
    : t("landing.heroCtaTrial");

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3.5 mt-1">
      <Link
        href="/dashboard"
        className="w-full sm:w-auto bg-[#2563eb] hover:bg-blue-700 text-white font-extrabold px-8 py-4 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-98 text-sm cursor-pointer text-center"
      >
        {label}
      </Link>
      <button
        type="button"
        onClick={() => {
          const el = document.getElementById("simulator");
          el?.scrollIntoView({ behavior: "smooth" });
        }}
        className="w-full sm:w-auto bg-white border border-slate-200 hover:bg-slate-50 text-[#1B2B4B] font-bold px-7 py-4 rounded-2xl transition-all text-sm shadow-2xs cursor-pointer"
      >
        {t("landing.trySimulator")} ↓
      </button>
    </div>
  );
}

function GuestHeroActions({ onAuthClick }: { onAuthClick: (tab: "signIn" | "signUp") => void }) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-3.5 mt-1">
      <button
        type="button"
        onClick={() => onAuthClick("signUp")}
        className="w-full sm:w-auto bg-[#2563eb] hover:bg-blue-700 text-white font-extrabold px-8 py-4 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-98 text-sm cursor-pointer"
      >
        {t("landing.createAccount")}
      </button>
      <button
        type="button"
        onClick={() => {
          const el = document.getElementById("simulator");
          el?.scrollIntoView({ behavior: "smooth" });
        }}
        className="w-full sm:w-auto bg-white border border-slate-200 hover:bg-slate-50 text-[#1B2B4B] font-bold px-7 py-4 rounded-2xl transition-all text-sm shadow-2xs cursor-pointer"
      >
        {t("landing.trySimulator")} ↓
      </button>
    </div>
  );
}

export function HeroCtaActions({ onAuthClick }: { onAuthClick: (tab: "signIn" | "signUp") => void }) {
  const { data: session } = authClient.useSession();
  const { status } = useSubscriptionStatus();

  if (session?.user) {
    return (
      <AuthenticatedHeroActions
        isGrace={status?.isTrialGrace}
        isSubscribed={status?.isSubscribed}
      />
    );
  }

  return <GuestHeroActions onAuthClick={onAuthClick} />;
}
