"use client";

import React from "react";
import Link from "next/link";
import { authClient } from "../../../lib/auth";
import { t } from "@money-matters/i18n";

export function AccountDeletionSection() {
  const { data: session } = authClient.useSession();

  if (!session?.user) {
    return (
      <div className="p-6 bg-blue-50 border border-blue-200 rounded-2xl shadow-xs space-y-3">
        <h2 className="text-base font-extrabold text-[#1B2B4B]">Instant Self-Service Account & Household Erasure</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          If you currently have access to your Money Matters account, you can sign in to execute instant account deletion and data erasure without waiting for manual processing.
        </p>
        <Link
          href="/sign-in?redirect=/dashboard/settings/delete-account"
          className="inline-flex items-center px-4 py-2 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
        >
          Sign In to Delete Household
        </Link>
      </div>
    );
  }

  return (
    <section className="p-6 bg-white border border-blue-200 rounded-2xl shadow-xs space-y-4">
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
        {t("privacy.signedInAs")}<strong>{session.user.email}</strong>. You can export your data and manage household deletion directly inside your signed-in Settings area.
      </p>

      <div className="pt-2">
        <Link
          href="/dashboard/settings/delete-account"
          className="inline-flex items-center px-4 py-2.5 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs gap-1.5"
        >
          <span>Go to Dashboard Governance Settings →</span>
        </Link>
      </div>
    </section>
  );
}
