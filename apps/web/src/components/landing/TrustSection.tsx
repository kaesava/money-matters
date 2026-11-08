"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { Lock, ShieldCheck, Scale } from "lucide-react";

export function TrustSection() {
  return (
    <section className="bg-white border-y border-slate-200/90 py-20" aria-label="Trust and Security">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14 max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb] tracking-wider uppercase shadow-2xs">
            {t("landing.trustBadge")}
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-[#1B2B4B]">{t("landing.trustTitle")}</h3>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">{t("landing.trustSubtitle")}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-[#F7F8FA] border border-slate-200/80 flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 text-[#2563eb] flex items-center justify-center shrink-0 shadow-2xs">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-[#1B2B4B] mb-1.5 text-sm">{t("landing.trust1Title")}</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                {t("landing.trust1Desc")}
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#F7F8FA] border border-slate-200/80 flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-[#22c55e] flex items-center justify-center shrink-0 shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-[#1B2B4B] mb-1.5 text-sm">{t("landing.trust2Title")}</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                {t("landing.trust2Desc")}
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#F7F8FA] border border-slate-200/80 flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-[#1B2B4B] mb-1.5 text-sm">{t("landing.trust3Title")}</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                {t("landing.trust3Desc")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

