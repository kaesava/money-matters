"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { authClient } from "../lib/auth";
import { PaycheckSimulator } from "../components/PaycheckSimulator";

import { Logo } from "@money-matters/ui/web";

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
    <div className="min-h-screen flex flex-col bg-[#F7F8FA] text-[#1a1c1e] font-sans selection:bg-[#2563eb] selection:text-white">
      {/* Header Navigation */}
      <header className="border-b border-[#e2e4e0] bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-2xs">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <span className="text-xl font-extrabold tracking-tight text-[#1B2B4B] hidden sm:inline">
              {t("app.title")}
            </span>
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
              className="bg-[#2563eb] hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm"
            >
              {t("landing.getStartedFree")}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 text-center flex flex-col items-center gap-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb] tracking-wider uppercase shadow-2xs">
          {t("landing.badge")}
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold text-[#1B2B4B] tracking-tight max-w-3xl leading-[1.15]">
          {t("landing.heroTitlePart1")}
          <span className="text-[#2563eb] underline decoration-blue-200 decoration-wavy underline-offset-8">
            {t("landing.heroTitleSpan")}
          </span>
          {t("landing.heroTitlePart2")}
        </h1>
        <p className="text-lg md:text-xl text-zinc-600 max-w-2xl leading-relaxed">
          {t("landing.descriptionExtra")}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-2">
          <button
            onClick={() => router.push("/sign-up")}
            className="bg-[#1B2B4B] hover:bg-slate-800 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-md text-base"
          >
            {t("landing.createAccount")}
          </button>
          <button
            onClick={() => {
              const element = document.getElementById("simulator");
              element?.scrollIntoView({ behavior: "smooth" });
            }}
            className="bg-white border border-[#e2e4e0] hover:bg-zinc-50 text-[#1B2B4B] font-semibold px-8 py-4 rounded-xl transition-all text-base shadow-2xs"
          >
            {t("landing.trySimulator")}
          </button>
        </div>

        {/* Hero Interactive UI Preview Mock */}
        <div className="w-full max-w-4xl mt-6 rounded-2xl bg-white border border-[#e2e4e0] p-6 shadow-xl text-left grid md:grid-cols-3 gap-6">
          <div className="bg-[#F7F8FA] p-5 rounded-xl border border-zinc-200 flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Everyday Discretionary</span>
            <div className="text-2xl font-extrabold font-mono text-[#1B2B4B]">$485.50</div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full w-fit">
              🟢 SAFE YES ($34.60/day)
            </div>
          </div>
          <div className="bg-[#F7F8FA] p-5 rounded-xl border border-zinc-200 flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Unified Bills Pool</span>
            <div className="text-2xl font-extrabold font-mono text-[#2563eb]">$1,840.00</div>
            <div className="text-xs text-zinc-500 font-medium">All upcoming bills fully funded ✓</div>
          </div>
          <div className="bg-[#F7F8FA] p-5 rounded-xl border border-zinc-200 flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Surplus Sweep Target</span>
            <div className="text-2xl font-extrabold font-mono text-emerald-700">$3,250.00</div>
            <div className="text-xs text-zinc-500 font-medium">Offset Reserve growing automatically</div>
          </div>
        </div>
      </section>

      {/* Simulator Section */}
      <PaycheckSimulator />

      {/* Feature Capabilities Grid */}
      <section className="max-w-6xl mx-auto px-6 py-24 flex flex-col gap-16">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1B2B4B] mb-4">
            {t("landing.featuresHeading")}
          </h2>
          <p className="text-zinc-600 text-base">
            {t("landing.featuresSubheading")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-white border border-[#e2e4e0] shadow-2xs flex flex-col gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-xl text-[#2563eb]">
              💧
            </div>
            <h3 className="text-lg font-bold text-[#1B2B4B]">{t("landing.feature1Title")}</h3>
            <p className="text-zinc-600 text-sm leading-relaxed">
              {t("landing.feature1Desc")}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#e2e4e0] shadow-2xs flex flex-col gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-xl text-[#22c55e]">
              🚦
            </div>
            <h3 className="text-lg font-bold text-[#1B2B4B]">{t("landing.feature2Title")}</h3>
            <p className="text-zinc-600 text-sm leading-relaxed">
              {t("landing.feature2Desc")}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#e2e4e0] shadow-2xs flex flex-col gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-xl text-indigo-600">
              🏦
            </div>
            <h3 className="text-lg font-bold text-[#1B2B4B]">{t("landing.feature3Title")}</h3>
            <p className="text-zinc-600 text-sm leading-relaxed">
              {t("landing.feature3Desc")}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#e2e4e0] shadow-2xs flex flex-col gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center text-xl text-amber-600">
              ⏱️
            </div>
            <h3 className="text-lg font-bold text-[#1B2B4B]">{t("landing.feature4Title")}</h3>
            <p className="text-zinc-600 text-sm leading-relaxed">
              {t("landing.feature4Desc")}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#e2e4e0] shadow-2xs flex flex-col gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-50 border border-purple-100 rounded-xl flex items-center justify-center text-xl text-purple-600">
              🔔
            </div>
            <h3 className="text-lg font-bold text-[#1B2B4B]">{t("landing.feature5Title")}</h3>
            <p className="text-zinc-600 text-sm leading-relaxed">
              {t("landing.feature5Desc")}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#e2e4e0] shadow-2xs flex flex-col gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-sky-50 border border-sky-100 rounded-xl flex items-center justify-center text-xl text-sky-600">
              🤝
            </div>
            <h3 className="text-lg font-bold text-[#1B2B4B]">{t("landing.feature6Title")}</h3>
            <p className="text-zinc-600 text-sm leading-relaxed">
              {t("landing.feature6Desc")}
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="bg-zinc-100/70 border-t border-[#e2e4e0] py-20">
        <div className="max-w-5xl mx-auto px-6 flex flex-col items-center gap-12">
          <div className="text-center max-w-xl">
            <h2 className="text-3xl font-extrabold tracking-tight text-[#1B2B4B] mb-3">
              {t("landing.pricingTitle")}
            </h2>
            <p className="text-zinc-600 text-sm leading-relaxed">
              {t("landing.pricingSubtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 w-full max-w-3xl">
            {/* Free Tier */}
            <div className="bg-white rounded-2xl p-8 border border-[#e2e4e0] shadow-sm flex flex-col justify-between">
              <div className="flex flex-col gap-4">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  {t("landing.pricingFreeTitle")}
                </span>
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-4xl font-extrabold text-[#1B2B4B]">
                    {t("landing.pricingFreePrice")}
                  </span>
                  <span className="text-sm font-sans text-zinc-500">
                    {t("landing.pricingFreeSub")}
                  </span>
                </div>
                <ul className="flex flex-col gap-3 text-sm text-zinc-600 mt-4">
                  <li className="flex items-center gap-2">✓ {t("landing.pricingFreeFeature1")}</li>
                  <li className="flex items-center gap-2">✓ {t("landing.pricingFreeFeature2")}</li>
                  <li className="flex items-center gap-2">✓ {t("landing.pricingFreeFeature3")}</li>
                  <li className="flex items-center gap-2">✓ {t("landing.pricingFreeFeature4")}</li>
                  <li className="flex items-center gap-2 text-zinc-400 line-through">
                    ✗ {t("landing.pricingFreeFeature5Disabled")}
                  </li>
                  <li className="flex items-center gap-2 text-zinc-400 line-through">
                    ✗ {t("landing.pricingFreeFeature6Disabled")}
                  </li>
                </ul>
              </div>
              <button
                onClick={() => router.push("/sign-up")}
                className="w-full mt-8 py-3.5 rounded-xl border border-zinc-300 font-bold text-zinc-700 hover:bg-zinc-50 text-sm transition-colors"
              >
                {t("landing.pricingFreeCta")}
              </button>
            </div>

            {/* Household Tier */}
            <div className="bg-white rounded-2xl p-8 border-2 border-[#2563eb] shadow-xl flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#2563eb] text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                POPULAR
              </div>
              <div className="flex flex-col gap-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#2563eb]">
                  {t("landing.pricingHouseholdTitle")}
                </span>
                <div className="flex items-baseline gap-2 font-mono">
                  <span className="text-4xl font-extrabold text-[#1B2B4B]">
                    {t("landing.pricingHouseholdPrice")}
                  </span>
                  <span className="text-xs font-sans text-zinc-500">
                    {t("landing.pricingHouseholdSub")}
                  </span>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 font-semibold">
                  {t("landing.pricingFoundingBadge")}
                </div>

                <ul className="flex flex-col gap-3 text-sm text-zinc-700 font-medium mt-2">
                  <li className="flex items-center gap-2 text-[#2563eb]">✓ {t("landing.pricingHouseholdFeature1")}</li>
                  <li className="flex items-center gap-2 text-[#2563eb]">✓ {t("landing.pricingHouseholdFeature2")}</li>
                  <li className="flex items-center gap-2 text-[#2563eb]">✓ {t("landing.pricingHouseholdFeature3")}</li>
                  <li className="flex items-center gap-2 text-[#2563eb]">✓ {t("landing.pricingHouseholdFeature4")}</li>
                  <li className="flex items-center gap-2">✓ {t("landing.pricingHouseholdFeature5")}</li>
                  <li className="flex items-center gap-2">✓ {t("landing.pricingHouseholdFeature6")}</li>
                </ul>
              </div>
              <button
                onClick={() => router.push("/sign-up")}
                className="w-full mt-8 bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-md text-sm transition-colors"
              >
                {t("landing.pricingHouseholdCta")}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Governance Trust Grid */}
      <section className="bg-white border-y border-[#e2e4e0] py-16">
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

      {/* Conversion Banner */}
      <section className="bg-[#1B2B4B] text-white py-16 text-center">
        <div className="max-w-3xl mx-auto px-6 flex flex-col items-center gap-6">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            {t("landing.conversionTitle")}
          </h2>
          <p className="text-zinc-300 text-sm md:text-base max-w-xl leading-relaxed">
            {t("landing.conversionDesc")}
          </p>
          <button
            onClick={() => router.push("/sign-up")}
            className="bg-[#2563eb] hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-md text-base mt-2"
          >
            {t("landing.createFreeAccount")}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e2e4e0] bg-[#F7F8FA] py-8 text-center text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="font-semibold">
            {t("landing.copyright", { appName: t("app.title") })} • Contact: <a href="mailto:info@kaesava.au" className="text-[#2563eb] hover:underline">info@kaesava.au</a>
          </span>
          <div className="flex gap-4 font-semibold">
            <a href="/privacy" className="hover:underline text-[#2563eb]">{t("landing.privacyPolicy")}</a>
            <a href="mailto:info@kaesava.au" className="hover:underline text-[#2563eb]">Support (info@kaesava.au)</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
