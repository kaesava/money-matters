"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { Button } from "@money-matters/ui/web";
import { trpc } from "../../../lib/trpc";
import posthog from "../../../lib/posthog-client";

export default function UpgradePage() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<"annual" | "monthly">("annual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCheckoutSession = trpc.createCheckoutSession.useMutation();

  const handleCheckout = async (priceType: "monthly" | "annual" | "founding") => {
    setLoading(true);
    setError(null);

    try {
      // In development / test environment, price IDs are mapped via environment variables
      const priceId = "price_mock_household";

      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const result = await createCheckoutSession.mutateAsync({
        priceId,
        successUrl: `${origin}/subscription/success`,
        cancelUrl: `${origin}/subscription/upgrade`,
      });

      if (result.url) {
        posthog.capture("subscription_checkout_started", { billing_cycle: priceType });
        window.location.href = result.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create checkout session.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 md:p-12">
      <main className="w-full max-w-4xl flex flex-col gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-blue-100 text-[#2563eb] flex items-center justify-center text-2xl font-bold">
            ✨
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1B2B4B]">
            {t("subscription.upgradePageTitle")}
          </h1>
          <p className="text-base text-zinc-600 max-w-md">
            {t("subscription.upgradePageSubtitle")}
          </p>

          {/* Monthly / Annual Toggle */}
          <div className="flex items-center gap-2 bg-zinc-200 p-1 rounded-xl mt-4">
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                billingCycle === "annual"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Annual ({t("subscription.householdPlanAnnualSaving")})
            </button>
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                billingCycle === "monthly"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-sm font-semibold text-center">
            ⚠️ {error}
          </div>
        )}

        <div className="w-full max-w-xl mx-auto">
          {/* Household Card */}
          <div className="bg-white rounded-2xl p-8 border-2 border-[#2563eb] flex flex-col justify-between shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#2563eb] text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
              100% FULL ACCESS
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#2563eb]">
                  {t("subscription.householdPlanName")}
                </span>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb] w-fit mt-1">
                  {t("landing.pricingTrialBadge")}
                </div>
              </div>

              <div className="flex items-baseline gap-2 font-mono">
                <span className="text-4xl font-extrabold text-[#1B2B4B]">
                  {billingCycle === "annual" ? "$89" : "$9.95"}
                </span>
                <span className="text-sm font-sans text-zinc-500">
                  {billingCycle === "annual" ? "AUD / year ($7.42/mo)" : "AUD / month"}
                </span>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 font-semibold">
                {t("subscription.foundingMemberBadge")}
              </div>

              <ul className="flex flex-col gap-3 text-sm text-zinc-700 mt-2 font-medium">
                <li className="flex items-center gap-2 text-[#2563eb]">✓ {t("subscription.featureBudgeting")}</li>
                <li className="flex items-center gap-2 text-[#2563eb]">✓ {t("subscription.featureHistoryPaid")}</li>
                <li className="flex items-center gap-2 text-[#2563eb]">✓ {t("subscription.featureGoalsPaid")}</li>
                <li className="flex items-center gap-2 text-[#2563eb]">✓ {t("subscription.featureCsvImportPaid")}</li>
                <li className="flex items-center gap-2 text-[#2563eb]">✓ {t("subscription.featureFileNotesPaid")}</li>
                <li className="flex items-center gap-2 text-[#2563eb]">✓ {t("subscription.featureNotifications")}</li>
                <li className="flex items-center gap-2 text-[#2563eb]">✓ {t("subscription.featurePartner")}</li>
              </ul>
            </div>

            <Button
              onClick={() => handleCheckout(billingCycle)}
              loading={loading}
              className="w-full mt-8 bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-md text-sm transition-all"
            >
              {t("subscription.foundingMemberCta")}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
