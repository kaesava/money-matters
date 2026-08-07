"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { authClient } from "../lib/auth";
import { PaycheckSimulator } from "../components/PaycheckSimulator";

export default function Home() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    authClient.getSession().then(({ data }) => {
      if (data?.session) {
        router.push("/dashboard");
      }
    });
  }, [router]);

  if (!isClient) return null;

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf9f1] text-[#1a1c1e] font-sans selection:bg-[#8a9a5b] selection:text-white">
      {/* Header Navigation */}
      <header className="border-b border-[#e2e4e0] bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl text-[#8a9a5b] font-bold">⬡</span>
            <span className="text-xl font-bold tracking-tight text-[#1B2B4B]">{t("app.title")}</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/sign-in")}
              className="text-sm font-semibold text-zinc-600 hover:text-[#1B2B4B] transition-colors"
            >
              {t("auth.signInCta")}
            </button>
            <button
              onClick={() => router.push("/sign-up")}
              className="bg-[#8a9a5b] hover:bg-[#738349] text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              {t("landing.getStartedFree")}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 text-center flex flex-col items-center gap-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f1f4e8] border border-[#e2e4e0] text-xs font-bold text-[#8a9a5b] tracking-wider uppercase">
          {t("landing.badge")}
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold text-[#1B2B4B] tracking-tight max-w-3xl leading-[1.15]">
          {t("landing.heroTitlePart1")}
          <span className="text-[#8a9a5b]">{t("landing.heroTitleSpan")}</span>
          {t("landing.heroTitlePart2")}
        </h1>
        <p className="text-lg md:text-xl text-zinc-500 max-w-2xl leading-relaxed">
          {t("landing.descriptionExtra")}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-2">
          <button
            onClick={() => router.push("/sign-up")}
            className="bg-[#1B2B4B] hover:opacity-90 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-md text-base"
          >
            {t("landing.createAccount")}
          </button>
          <button
            onClick={() => {
              const element = document.getElementById("simulator");
              element?.scrollIntoView({ behavior: "smooth" });
            }}
            className="bg-white border border-[#e2e4e0] hover:bg-zinc-50 text-zinc-700 font-semibold px-8 py-4 rounded-xl transition-all text-base"
          >
            {t("landing.trySimulator")}
          </button>
        </div>
      </section>

      {/* Simulator Section */}
      <PaycheckSimulator />

      {/* Feature Section Grid */}
      <section className="max-w-6xl mx-auto px-6 py-24 flex flex-col gap-16">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight text-[#1B2B4B] mb-4">
            {t("landing.featuresHeading")}
          </h2>
          <p className="text-zinc-500">
            {t("landing.featuresSubheading")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-white border border-[#e2e4e0] shadow-sm flex flex-col gap-4">
            <div className="w-12 h-12 bg-[#f1f4e8] border border-[#e2e4e0] rounded-xl flex items-center justify-center text-xl text-[#8a9a5b]">
              📊
            </div>
            <h3 className="text-lg font-bold text-[#1B2B4B]">{t("landing.feature1Title")}</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              {t("landing.feature1Desc")}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#e2e4e0] shadow-sm flex flex-col gap-4">
            <div className="w-12 h-12 bg-[#f1f4e8] border border-[#e2e4e0] rounded-xl flex items-center justify-center text-xl text-[#8a9a5b]">
              🚦
            </div>
            <h3 className="text-lg font-bold text-[#1B2B4B]">{t("landing.feature2Title")}</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              {t("landing.feature2Desc")}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#e2e4e0] shadow-sm flex flex-col gap-4">
            <div className="w-12 h-12 bg-[#f1f4e8] border border-[#e2e4e0] rounded-xl flex items-center justify-center text-xl text-[#8a9a5b]">
              🚨
            </div>
            <h3 className="text-lg font-bold text-[#1B2B4B]">{t("landing.feature3Title")}</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              {t("landing.feature3Desc")}
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="bg-zinc-100/70 border-t border-[#e2e4e0] py-20">
        <div className="max-w-5xl mx-auto px-6 flex flex-col items-center gap-12">
          <div className="text-center max-w-xl">
            <h2 className="text-3xl font-bold tracking-tight text-[#1B2B4B] mb-3">
              Simple, transparent pricing
            </h2>
            <p className="text-zinc-600 text-sm leading-relaxed">
              Start with a 30-day full Household trial — no credit card required. Continue on the Free plan or upgrade anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 w-full max-w-3xl">
            {/* Free Tier */}
            <div className="bg-white rounded-2xl p-8 border border-[#e2e4e0] shadow-sm flex flex-col justify-between">
              <div className="flex flex-col gap-4">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Free Plan</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-[#1B2B4B]">$0</span>
                  <span className="text-sm text-zinc-500">/ forever</span>
                </div>
                <ul className="flex flex-col gap-3 text-sm text-zinc-600 mt-4">
                  <li className="flex items-center gap-2">✓ Full 5-step waterfall engine</li>
                  <li className="flex items-center gap-2">✓ 90 days transaction history</li>
                  <li className="flex items-center gap-2">✓ Up to 3 savings goals</li>
                  <li className="flex items-center gap-2">✓ Smart notifications & due alerts</li>
                  <li className="flex items-center gap-2 text-zinc-400 line-through">
                    ✗ CSV bank import (CBA, Westpac, ANZ, NAB, ING, Macq)
                  </li>
                  <li className="flex items-center gap-2 text-zinc-400 line-through">
                    ✗ File notes & attachments
                  </li>
                </ul>
              </div>
              <button
                onClick={() => router.push("/sign-up")}
                className="w-full mt-8 py-3 rounded-xl border border-zinc-300 font-bold text-zinc-700 hover:bg-zinc-50 text-sm transition-colors"
              >
                Get Started Free
              </button>
            </div>

            {/* Household Tier */}
            <div className="bg-white rounded-2xl p-8 border-2 border-[#2563eb] shadow-lg flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#2563eb] text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                POPULAR
              </div>
              <div className="flex flex-col gap-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#2563eb]">Household Plan</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-[#1B2B4B]">$9.99</span>
                  <span className="text-sm text-zinc-500">AUD / mo  or  $89 / yr</span>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 font-semibold">
                  🏷️ Founding member: $69/year locked for life (first 100 users)
                </div>

                <ul className="flex flex-col gap-3 text-sm text-zinc-700 font-medium mt-2">
                  <li className="flex items-center gap-2 text-[#2563eb]">✓ Full transaction history</li>
                  <li className="flex items-center gap-2 text-[#2563eb]">✓ Unlimited savings goals</li>
                  <li className="flex items-center gap-2 text-[#2563eb]">✓ CSV bank statement import</li>
                  <li className="flex items-center gap-2 text-[#2563eb]">✓ File notes & receipt attachments</li>
                  <li className="flex items-center gap-2">✓ Full 5-step waterfall engine</li>
                  <li className="flex items-center gap-2">✓ Smart notifications & due alerts</li>
                </ul>
              </div>
              <button
                onClick={() => router.push("/sign-up")}
                className="w-full mt-8 bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md text-sm transition-colors"
              >
                Start 30-Day Free Trial
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Privacy Assurance Banner */}
      <section className="bg-white border-y border-[#e2e4e0] py-16">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-[#2563eb] flex items-center justify-center text-xl shrink-0">
              🔒
            </div>
            <div>
              <h4 className="font-bold text-[#1B2B4B] mb-1">PostgreSQL Row Level Security</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Database-kernel RLS enforces absolute multi-tenant household isolation. Your ledger data is strictly restricted to your authenticated household.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-[#22c55e] flex items-center justify-center text-xl shrink-0">
              🛡️
            </div>
            <div>
              <h4 className="font-bold text-[#1B2B4B] mb-1">Australian Privacy Act (Cth)</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Compliant with the Australian Privacy Principles (APPs). We never sell your data or deploy third-party advertising pixels.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-xl shrink-0">
              📜
            </div>
            <div>
              <h4 className="font-bold text-[#1B2B4B] mb-1">Full Data Sovereignty</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Complete data portability and erasure upon request. You own your household financial history — export or purge anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Conversion Banner */}
      <section className="bg-[#1B2B4B] text-white py-16 text-center">
        <div className="max-w-3xl mx-auto px-6 flex flex-col items-center gap-6">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            {t("landing.conversionTitle")}
          </h2>
          <p className="text-zinc-400 text-sm md:text-base max-w-xl leading-relaxed">
            {t("landing.conversionDesc")}
          </p>
          <button
            onClick={() => router.push("/sign-up")}
            className="bg-[#8a9a5b] hover:bg-[#738349] text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-md text-base mt-2"
          >
            {t("landing.createFreeAccount")}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e2e4e0] bg-[#f5f4eb] py-8 text-center text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="font-semibold">{t("landing.copyright", { appName: t("app.title") })} • Contact: <a href="mailto:info@kaesava.au" className="text-blue-600 hover:underline">info@kaesava.au</a></span>
          <div className="flex gap-4 font-semibold">
            <a href="/privacy" className="hover:underline text-blue-600">{t("landing.privacyPolicy")}</a>
            <a href="mailto:info@kaesava.au" className="hover:underline text-blue-600">Support (info@kaesava.au)</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
