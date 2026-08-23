"use client";

import React from "react";
import { t } from "@money-matters/i18n";

export function TrustSection() {
  return (
    <section className="bg-white border-y border-[#e2e4e0] py-16" aria-label="Trust and Security">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12 max-w-xl mx-auto">
          <h3 className="text-2xl font-extrabold text-[#1B2B4B] mb-2">{t("landing.trustTitle")}</h3>
          <p className="text-zinc-500 text-sm">{t("landing.trustSubtitle")}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-[#2563eb] flex items-center justify-center text-xl shrink-0 shadow-2xs">
              🔒
            </div>
            <div>
              <h4 className="font-bold text-[#1B2B4B] mb-1 text-sm">{t("landing.trust1Title")}</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {t("landing.trust1Desc")}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-[#22c55e] flex items-center justify-center text-xl shrink-0 shadow-2xs">
              🛡️
            </div>
            <div>
              <h4 className="font-bold text-[#1B2B4B] mb-1 text-sm">{t("landing.trust2Title")}</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {t("landing.trust2Desc")}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-xl shrink-0 shadow-2xs">
              📜
            </div>
            <div>
              <h4 className="font-bold text-[#1B2B4B] mb-1 text-sm">{t("landing.trust3Title")}</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {t("landing.trust3Desc")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
