"use client";

import React from "react";
import Link from "next/link";
import { authClient } from "../../../lib/auth";
import { t } from "@money-matters/i18n";

export function AccountDeletionSection() {
  const { data: session } = authClient.useSession();

  if (!session?.user) {
    return (
      <div className="p-6 bg-blue-50 border border-blue-200 rounded-3xl shadow-xs space-y-3">
        <h2 className="text-base font-extrabold text-[#1B2B4B]">
          {t("privacy.instantSelfServiceTitle")}
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          {t("privacy.instantSelfServiceDesc")}
        </p>
        <Link
          href="/sign-in?redirect=/dashboard/settings/delete-account"
          className="inline-flex items-center px-4 py-2 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
        >
          {t("privacy.signInToDeleteCta")}
        </Link>
      </div>
    );
  }

  return (
    <section className="p-6 bg-white border border-blue-200 rounded-3xl shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-extrabold text-[#1B2B4B]">{t("privacy.instantErasure")}</h2>
        <Link
          href="/dashboard/settings/delete-account"
          className="text-xs font-bold text-[#2563eb] hover:underline"
        >
          {t("privacy.backToSettings")}
        </Link>
      </div>
      <p className="text-xs text-slate-600">
        {t("privacy.signedInAs")}<strong>{session.user.email}</strong>. {t("privacy.signedInSettingsNotice")}
      </p>

      <div className="pt-2">
        <Link
          href="/dashboard/settings/delete-account"
          className="inline-flex items-center px-4 py-2.5 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs gap-1.5"
        >
          <span>{t("privacy.goToDashboardGovernance")}</span>
        </Link>
      </div>
    </section>
  );
}
