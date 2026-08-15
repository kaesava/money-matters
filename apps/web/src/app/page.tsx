"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { authClient } from "../lib/auth";
import { trpc } from "../lib/trpc";
import { PaycheckSimulator } from "../components/PaycheckSimulator";

import { DonutRing } from "../components/web/DonutRing";

import { Logo } from "@money-matters/ui/web";

const ENABLE_AUTH = process.env.NEXT_PUBLIC_ENABLE_AUTH !== "false";

export default function Home() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [showEarlyAccessModal, setShowEarlyAccessModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const subscribeMut = trpc.subscribeEarlyAccess.useMutation({
    onSuccess: () => {
      setShowEarlyAccessModal(false);
      setEmailInput("");
      setToastMessage("✓ Thank you! We've registered your email and will notify you as soon as Money Matters goes live.");
      setTimeout(() => setToastMessage(null), 6000);
    },
  });

  const handleAuthClick = (path: string) => {
    if (ENABLE_AUTH) {
      router.push(path);
    } else {
      setShowEarlyAccessModal(true);
    }
  };

  useEffect(() => {
    setIsClient(true);
    if (ENABLE_AUTH) {
      authClient.getSession().then(({ data }) => {
        if (data?.session) {
          router.push("/dashboard");
        }
      });
    }
  }, [router]);

  if (!isClient) return null;

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA] text-[#1B2B4B] font-sans selection:bg-[#2563eb] selection:text-white relative">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-[120] bg-[#1B2B4B] text-white border border-blue-400 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 max-w-md animate-in slide-in-from-top-4 duration-200">
          <span className="text-emerald-400 text-lg">🎉</span>
          <p className="text-xs font-semibold leading-relaxed flex-1">{toastMessage}</p>
          <button
            onClick={() => setToastMessage(null)}
            className="text-zinc-400 hover:text-white font-bold text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Early Access Modal when NEXT_PUBLIC_ENABLE_AUTH is false */}
      {showEarlyAccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full border border-[#e2e4e0] shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowEarlyAccessModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 text-lg font-bold"
            >
              ✕
            </button>
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-[#2563eb] flex items-center justify-center text-2xl">
              🚀
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-[#1B2B4B]">Money Matters is Almost Ready!</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                We&apos;re currently performing final testing and polish to ensure your household budgeting experience is flawless. Sign-ups will open very soon.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (emailInput.trim()) {
                  subscribeMut.mutate({ email: emailInput.trim() });
                }
              }}
              className="space-y-3 pt-2"
            >
              <label className="text-xs font-bold text-zinc-700 block">
                Get notified when we launch:
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="you@example.com"
                  className="flex-1 px-3 py-2.5 text-xs font-medium rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                />
                <button
                  type="submit"
                  disabled={subscribeMut.isPending}
                  className="bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm shrink-0"
                >
                  {subscribeMut.isPending ? "Submitting..." : "Notify Me"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              onClick={() => handleAuthClick("/sign-in")}
              className="text-sm font-semibold text-zinc-600 hover:text-[#1B2B4B] transition-colors"
            >
              {t("auth.signInCta")}
            </button>
            <button
              onClick={() => handleAuthClick("/sign-up")}
              className="bg-[#2563eb] hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm"
            >
              {t("landing.heroCtaPrimary")}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 text-center flex flex-col items-center gap-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb] tracking-wider uppercase shadow-2xs">
          {t("landing.badge")}
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold text-[#1B2B4B] tracking-tight max-w-4xl leading-[1.15]">
          {t("landing.heroTagline")}
        </h1>
        <p className="text-lg md:text-xl text-zinc-600 max-w-2xl leading-relaxed">
          {t("landing.heroSubtitle")}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-2">
          <button
            onClick={() => handleAuthClick("/sign-up")}
            className="bg-[#1B2B4B] hover:bg-slate-800 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-md text-base"
          >
            {t("landing.heroCtaPrimary")}
          </button>
          <button
            onClick={() => {
              const element = document.getElementById("simulator");
              element?.scrollIntoView({ behavior: "smooth" });
            }}
            className="bg-white border border-[#e2e4e0] hover:bg-zinc-50 text-[#1B2B4B] font-semibold px-8 py-4 rounded-xl transition-all text-base shadow-2xs"
          >
            {t("landing.heroCtaSecondary")}
          </button>
        </div>

        {/* Hero Interactive UI Preview Mock */}
        <div className="w-full max-w-4xl mt-6 rounded-2xl bg-white border border-[#e2e4e0] p-6 shadow-xl text-left grid md:grid-cols-3 gap-6 items-center">
          <div className="bg-[#F7F8FA] p-5 rounded-xl border border-zinc-200 flex flex-col items-center text-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Everyday Discretionary</span>
            <DonutRing
              size={130}
              strokeWidth={10}
              timeElapsedPct={45}
              consumedPct={32}
              centerLabel="$485.50"
              subLabel="Everyday"
            />
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full w-fit">
              🟢 SAFE YES ($34.60/day)
            </div>
          </div>
          <div className="bg-[#F7F8FA] p-5 rounded-xl border border-zinc-200 flex flex-col gap-2 h-full justify-center">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Unified Bills Pool</span>
            <div className="text-2xl font-extrabold font-mono text-[#2563eb]">$1,840.00</div>
            <div className="text-xs text-zinc-500 font-medium">All upcoming bills fully funded ✓</div>
            <div className="w-full bg-blue-100 h-2 rounded-full overflow-hidden mt-1">
              <div className="bg-[#2563eb] h-full w-full rounded-full" />
            </div>
          </div>
          <div className="bg-[#F7F8FA] p-5 rounded-xl border border-zinc-200 flex flex-col gap-2 h-full justify-center">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Surplus Sweep Target</span>
            <div className="text-2xl font-extrabold font-mono text-emerald-700">$3,250.00</div>
            <div className="text-xs text-zinc-500 font-medium">Offset Reserve growing automatically</div>
            <div className="w-full bg-emerald-100 h-2 rounded-full overflow-hidden mt-1">
              <div className="bg-emerald-600 h-full w-[78%] rounded-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Founder's Story Section */}
      <section className="bg-white border-y border-[#e2e4e0] py-20">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-12 gap-12 items-start">
          <div className="md:col-span-5 flex flex-col gap-6 sticky top-28">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb] uppercase tracking-wider w-fit">
              {t("landing.founderSectionBadge")}
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#1B2B4B] leading-tight">
              {t("landing.founderSectionHeading")}
            </h2>
            <p className="text-zinc-600 text-base leading-relaxed">
              {t("landing.founderSectionIntro")}
            </p>
            <div className="p-6 bg-[#F7F8FA] border-l-4 border-[#2563eb] rounded-r-2xl space-y-3">
              <p className="text-lg font-bold text-[#1B2B4B] italic">
                {t("landing.founderQuote")}
              </p>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#1B2B4B] text-white flex items-center justify-center font-bold text-xs font-mono shadow-xs">
                  K
                </div>
                <div>
                  <p className="text-xs font-bold text-[#1B2B4B]">Kesh</p>
                  <p className="text-[10px] text-zinc-500">Founder & Principal Architect, Money Matters</p>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-7 flex flex-col gap-8">
            <div className="p-6 rounded-2xl bg-[#F7F8FA] border border-zinc-200 space-y-2">
              <span className="text-xs font-bold text-[#2563eb] uppercase tracking-wider">{t("landing.founderOriginLabel")}</span>
              <p className="text-sm text-zinc-700 leading-relaxed">{t("landing.founderOriginBody")}</p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F7F8FA] border border-zinc-200 space-y-2">
              <span className="text-xs font-bold font-mono text-[#ba1a1a] uppercase tracking-wider">{t("landing.founderTrapLabel")}</span>
              <p className="text-sm text-zinc-700 leading-relaxed">{t("landing.founderTrapBody")}</p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F7F8FA] border border-zinc-200 space-y-2">
              <span className="text-xs font-bold text-[#2563eb] uppercase tracking-wider">{t("landing.founderSolutionLabel")}</span>
              <p className="text-sm text-zinc-700 leading-relaxed">{t("landing.founderSolutionBody")}</p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F7F8FA] border border-zinc-200 space-y-2">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">{t("landing.founderPayoffLabel")}</span>
              <p className="text-sm text-zinc-700 leading-relaxed">{t("landing.founderPayoffBody")}</p>
            </div>

            <div className="p-6 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-2">
              <span className="text-xs font-bold text-[#2563eb] uppercase tracking-wider">{t("landing.founderCatalystLabel")}</span>
              <p className="text-sm text-zinc-700 leading-relaxed">{t("landing.founderCatalystBody")}</p>
            </div>

            <div className="pt-4">
              <button
                onClick={() => handleAuthClick("/sign-up")}
                className="w-full sm:w-auto bg-[#2563eb] hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-md text-base"
              >
                {t("landing.heroCtaPrimary")}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Simulator Section */}
      <PaycheckSimulator />

      {/* Unfair Advantages Section */}
      <section className="max-w-6xl mx-auto px-6 py-24 flex flex-col gap-16">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb] uppercase tracking-wider">
            {t("landing.advantagesSectionBadge")}
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1B2B4B]">
            {t("landing.advantagesSectionHeading")}
          </h2>
          <p className="text-zinc-600 text-base leading-relaxed">
            {t("landing.advantagesSectionSubheading")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Advantage 1 */}
          <div className="p-6 rounded-2xl bg-white border border-[#e2e4e0] shadow-2xs flex flex-col justify-between gap-6 hover:shadow-md transition-shadow">
            <div className="space-y-4">
              <span className="text-xs font-bold font-mono text-[#2563eb] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                {t("landing.advantage1Label")}
              </span>
              <h3 className="text-xl font-bold text-[#1B2B4B]">{t("landing.advantage1Title")}</h3>
              <p className="text-zinc-600 text-sm leading-relaxed">{t("landing.advantage1Body")}</p>
            </div>
            <div className="p-4 bg-[#F7F8FA] rounded-xl border border-zinc-200 space-y-2 text-xs text-zinc-600">
              <p>• {t("landing.advantage1Detail1")}</p>
              <p>• {t("landing.advantage1Detail2")}</p>
              <p>• {t("landing.advantage1Detail3")}</p>
              <p>• {t("landing.advantage1Detail4")}</p>
            </div>
          </div>

          {/* Advantage 2 */}
          <div className="p-6 rounded-2xl bg-white border border-[#e2e4e0] shadow-2xs flex flex-col justify-between gap-6 hover:shadow-md transition-shadow">
            <div className="space-y-4">
              <span className="text-xs font-bold font-mono text-[#2563eb] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                {t("landing.advantage2Label")}
              </span>
              <h3 className="text-xl font-bold text-[#1B2B4B]">{t("landing.advantage2Title")}</h3>
              <p className="text-zinc-600 text-sm leading-relaxed">{t("landing.advantage2Body")}</p>
            </div>
            <div className="p-4 bg-[#F7F8FA] rounded-xl border border-zinc-200 space-y-1.5 text-xs font-medium">
              <div className="text-emerald-700">{t("landing.advantage2Verdict1")}</div>
              <div className="text-amber-700">{t("landing.advantage2Verdict2")}</div>
              <div className="text-orange-700">{t("landing.advantage2Verdict3")}</div>
              <div className="text-blue-700">{t("landing.advantage2Verdict4")}</div>
              <div className="text-[#ba1a1a]">{t("landing.advantage2Verdict5")}</div>
            </div>
          </div>

          {/* Advantage 3 */}
          <div className="p-6 rounded-2xl bg-white border border-[#e2e4e0] shadow-2xs flex flex-col justify-between gap-6 hover:shadow-md transition-shadow">
            <div className="space-y-4">
              <span className="text-xs font-bold font-mono text-[#2563eb] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                {t("landing.advantage3Label")}
              </span>
              <h3 className="text-xl font-bold text-[#1B2B4B]">{t("landing.advantage3Title")}</h3>
              <p className="text-zinc-600 text-sm leading-relaxed">{t("landing.advantage3Body")}</p>
            </div>
            <div className="p-4 bg-slate-900 text-slate-200 rounded-xl font-mono text-xs leading-relaxed overflow-x-auto">
              <code>{t("landing.advantage3Detail")}</code>
            </div>
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

          <div className="w-full max-w-xl">
            {/* Single Unified Household Tier */}
            <div className="bg-white rounded-2xl p-8 border-2 border-[#2563eb] shadow-xl flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#2563eb] text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                FULL ACCESS
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#2563eb]">
                    {t("landing.pricingHouseholdTitle")}
                  </span>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb] w-fit mt-1">
                    {t("landing.pricingTrialBadge")}
                  </div>
                </div>

                <div className="flex items-baseline gap-2 font-mono mt-1">
                  <span className="text-4xl font-extrabold text-[#1B2B4B]">
                    {t("landing.pricingHouseholdPrice")}
                  </span>
                  <span className="text-xs font-sans text-zinc-500">
                    {t("landing.pricingHouseholdSub")}
                  </span>
                </div>

                <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 font-semibold">
                  {t("landing.pricingFoundingBadge")}
                </div>

                <ul className="flex flex-col gap-3 text-sm text-zinc-700 font-medium mt-2">
                  <li className="flex items-center gap-2 text-[#2563eb]">✓ {t("landing.pricingHouseholdFeature1")}</li>
                  <li className="flex items-center gap-2 text-[#2563eb]">✓ {t("landing.pricingHouseholdFeature2")}</li>
                  <li className="flex items-center gap-2 text-[#2563eb]">✓ {t("landing.pricingHouseholdFeature3")}</li>
                  <li className="flex items-center gap-2 text-[#2563eb]">✓ {t("landing.pricingHouseholdFeature4")}</li>
                  <li className="flex items-center gap-2 text-[#2563eb]">✓ {t("landing.pricingHouseholdFeature5")}</li>
                  <li className="flex items-center gap-2 text-[#2563eb]">✓ {t("landing.pricingHouseholdFeature6")}</li>
                </ul>

                <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    🛡️ {t("landing.pricingDataSovereigntyBadge")}
                  </div>
                  <p className="leading-relaxed text-emerald-800">
                    {t("landing.pricingDataSovereigntyNote")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleAuthClick("/sign-up")}
                className="w-full mt-8 bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-md text-sm transition-colors"
              >
                {t("landing.heroCtaPrimary")}
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
            onClick={() => handleAuthClick("/sign-up")}
            className="bg-[#2563eb] hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-md text-base mt-2"
          >
            {t("landing.heroCtaPrimary")}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e2e4e0] bg-[#F7F8FA] py-8 text-center text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="font-semibold">
            {t("landing.copyright", { appName: t("app.title") })} • Contact: <a href="mailto:info@moneymatters.kaesava.au" className="text-[#2563eb] hover:underline">info@moneymatters.kaesava.au</a>
          </span>
          <div className="flex gap-4 font-semibold">
            <a href="/privacy" className="hover:underline text-[#2563eb]">{t("landing.privacyPolicy")}</a>
            <a href="mailto:info@moneymatters.kaesava.au" className="hover:underline text-[#2563eb]">Support (info@moneymatters.kaesava.au)</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
