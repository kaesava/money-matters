"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { Logo, Button } from "@money-matters/ui/web";
import { trpc } from "../../../lib/trpc";
import posthog from "../../../lib/posthog-client";

export default function UpgradePage() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<"annual" | "monthly">("annual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Toggle switch for special $69 founding offer on annual plan
  const isFoundingOfferActive = true;

  const createCheckoutSession = trpc.createCheckoutSession.useMutation();

  const handleCheckout = async (selectedCycle: "annual" | "monthly") => {
    setLoading(true);
    setError(null);

    // Map annual cycle to 'founding' when the special offer switch is active
    const planType = selectedCycle === "annual" && isFoundingOfferActive ? "founding" : selectedCycle;

    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const result = await createCheckoutSession.mutateAsync({
        planType,
        successUrl: `${origin}/subscription/success`,
        cancelUrl: `${origin}/subscription/upgrade`,
      });

      if (result.url) {
        posthog.capture("subscription_checkout_started", { billing_cycle: planType });
        window.location.href = result.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create checkout session.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col font-sans">
      {/* Product & Pricing Offer JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "Money Matters Household Subscription",
            "description": "Unlimited household access to automated 5-step waterfall budgeting, mortgage offset optimizer, and bank CSV imports.",
            "brand": {
              "@type": "Brand",
              "name": "Money Matters",
            },
            "offers": [
              {
                "@type": "Offer",
                "name": "Annual Plan (Special Founding Member)",
                "price": "69.00",
                "priceCurrency": "AUD",
                "priceValidUntil": "2027-12-31",
                "url": "https://moneymatters.kaesava.au/subscription/upgrade",
                "availability": "https://schema.org/InStock",
              },
              {
                "@type": "Offer",
                "name": "Monthly Plan",
                "price": "9.95",
                "priceCurrency": "AUD",
                "url": "https://moneymatters.kaesava.au/subscription/upgrade",
                "availability": "https://schema.org/InStock",
              },
            ],
          }),
        }}
      />
      {/* Top Brand Navigation Bar */}
      <header className="w-full bg-[#1B2B4B] border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-3">
          <Logo size="md" />
          <span className="text-lg font-extrabold text-white tracking-tight">
            {t("app.title")}
          </span>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="text-xs font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-xl transition-all"
        >
          ← {t("dashboard.title")}
        </button>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-12 flex flex-col gap-10">
        {/* Page Hero Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 border border-blue-200 text-xs font-extrabold text-[#2563eb]">
            ✨ {t("landing.pricingTrialBadge")}
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#1B2B4B]">
            {t("subscription.upgradePageTitle")}
          </h1>
          <p className="text-sm md:text-base text-slate-600 max-w-lg leading-relaxed">
            {t("subscription.upgradePageSubtitle")}
          </p>

          {/* Billing Selector Tabs (Two Tabs: Annual & Monthly) */}
          <div className="flex items-center gap-1.5 bg-slate-200/80 p-1.5 rounded-2xl mt-4 border border-slate-300/50 shadow-inner">
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                billingCycle === "annual"
                  ? "bg-[#2563eb] text-white shadow-md"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              Annual {isFoundingOfferActive ? "(🔥 Special $69/yr)" : "($89/yr)"}
            </button>
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                billingCycle === "monthly"
                  ? "bg-[#2563eb] text-white shadow-md"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              Monthly ($9.95/mo)
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-sm font-semibold text-center shadow-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Plan Pricing Card */}
        <div className="w-full max-w-xl mx-auto">
          <div className="bg-white rounded-3xl p-8 md:p-10 border-2 border-[#2563eb] flex flex-col justify-between shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#2563eb] text-white text-[10px] font-black px-4 py-1.5 rounded-bl-xl uppercase tracking-widest shadow-sm">
              100% UNLIMITED HOUSEHOLD ACCESS
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#2563eb]">
                  {t("subscription.householdPlanName")}
                </span>
              </div>

              {/* Price display */}
              <div className="flex items-baseline gap-2 font-mono">
                {billingCycle === "annual" ? (
                  isFoundingOfferActive ? (
                    <div className="flex items-baseline gap-2">
                      <span className="line-through text-slate-400 text-3xl font-bold">$89</span>
                      <span className="text-5xl font-black text-[#1B2B4B]">$69</span>
                      <span className="text-sm font-sans text-slate-500 font-semibold ml-1">
                        AUD / year ($5.75/mo)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-[#1B2B4B]">$89</span>
                      <span className="text-sm font-sans text-slate-500 font-semibold ml-1">
                        AUD / year ($7.42/mo)
                      </span>
                    </div>
                  )
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-[#1B2B4B]">$9.95</span>
                    <span className="text-sm font-sans text-slate-500 font-semibold ml-1">
                      AUD / month
                    </span>
                  </div>
                )}
              </div>

              {billingCycle === "annual" && isFoundingOfferActive && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900 font-bold flex items-center gap-2">
                  <span className="text-base">🏷️</span>
                  <span>Special Founding Member Rate: $69 AUD/year locked for life!</span>
                </div>
              )}

              {/* Feature Highlights */}
              <div className="space-y-3 pt-2">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Included Features</p>
                <ul className="grid grid-cols-1 gap-3 text-sm text-slate-700 font-semibold">
                  <li className="flex items-center gap-2.5 text-slate-800">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-[#2563eb] flex items-center justify-center text-xs font-black shrink-0">✓</span>
                    {t("subscription.featureBudgeting")}
                  </li>
                  <li className="flex items-center gap-2.5 text-slate-800">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-[#2563eb] flex items-center justify-center text-xs font-black shrink-0">✓</span>
                    {t("subscription.featureHistoryPaid")}
                  </li>
                  <li className="flex items-center gap-2.5 text-slate-800">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-[#2563eb] flex items-center justify-center text-xs font-black shrink-0">✓</span>
                    {t("subscription.featureGoalsPaid")}
                  </li>
                  <li className="flex items-center gap-2.5 text-slate-800">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-[#2563eb] flex items-center justify-center text-xs font-black shrink-0">✓</span>
                    {t("subscription.featureCsvImportPaid")}
                  </li>
                  <li className="flex items-center gap-2.5 text-slate-800">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-[#2563eb] flex items-center justify-center text-xs font-black shrink-0">✓</span>
                    {t("subscription.featureFileNotesPaid")}
                  </li>
                  <li className="flex items-center gap-2.5 text-slate-800">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-[#2563eb] flex items-center justify-center text-xs font-black shrink-0">✓</span>
                    {t("subscription.featureNotifications")}
                  </li>
                  <li className="flex items-center gap-2.5 text-slate-800">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-[#2563eb] flex items-center justify-center text-xs font-black shrink-0">✓</span>
                    {t("subscription.featurePartner")}
                  </li>
                </ul>
              </div>
            </div>

            <Button
              onClick={() => handleCheckout(billingCycle)}
              loading={loading}
              className="w-full mt-8 bg-[#2563eb] hover:bg-blue-700 text-white font-extrabold py-4 rounded-2xl shadow-lg text-base transition-all active:scale-[0.99]"
            >
              {billingCycle === "annual"
                ? isFoundingOfferActive
                  ? "Claim $69/yr Special Rate →"
                  : "Subscribe Annual ($89/yr) →"
                : "Subscribe Monthly ($9.95/mo) →"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
