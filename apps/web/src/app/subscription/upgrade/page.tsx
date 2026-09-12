"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { Button } from "@money-matters/ui/web";
import { authClient } from "../../../lib/auth";
import { trpc } from "../../../lib/trpc";
import posthog from "../../../lib/posthog-client";
import { PublicHeader } from "../../../components/public/PublicHeader";
import { PublicFooter } from "../../../components/public/PublicFooter";
import { ActiveSubscriptionCard } from "./ActiveSubscriptionCard";

export default function UpgradePage() {
  const router = useRouter();
  const { data: session, isPending: isAuthPending } = authClient.useSession();
  const [billingCycle, setBillingCycle] = useState<"annual" | "monthly">("annual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthPending && !session?.user) {
      router.replace("/sign-in?redirect=/subscription/upgrade");
    }
  }, [isAuthPending, session, router]);

  const isFoundingOfferActive = true;

  const subStatusQuery = trpc.getSubscriptionStatus.useQuery();
  const subStatus = subStatusQuery.data;
  const isSubscribed = subStatus?.status === "SUBSCRIBED";

  const portalMut = trpc.createCustomerPortalSession.useMutation();
  const createCheckoutSession = trpc.createCheckoutSession.useMutation();
  const [loadingPortal, setLoadingPortal] = useState(false);

  const handleOpenStripePortal = async () => {
    setLoadingPortal(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const res = await portalMut.mutateAsync({
        returnUrl: `${origin}/dashboard/settings`,
      });
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("subscription.portalError"));
    } finally {
      setLoadingPortal(false);
    }
  };

  const handleCheckout = async (selectedCycle: "annual" | "monthly") => {
    setLoading(true);
    setError(null);

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
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col font-sans justify-between">
      <PublicHeader backHref={session?.user ? "/dashboard" : "/"} />

      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-12 flex flex-col gap-10">
        {isSubscribed ? (
          <ActiveSubscriptionCard
            subStatus={subStatus}
            onOpenPortal={handleOpenStripePortal}
            loadingPortal={loadingPortal}
          />
        ) : (
          <>
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

              <div className="flex items-center gap-1.5 bg-slate-200/80 p-1.5 rounded-2xl mt-4 border border-slate-300/50 shadow-inner">
                <button
                  type="button"
                  onClick={() => setBillingCycle("annual")}
                  className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    billingCycle === "annual"
                      ? "bg-[#2563eb] text-white shadow-md"
                      : "text-slate-700 hover:text-slate-900"
                  }`}
                >
                  {isFoundingOfferActive ? t("subscription.annualTabFounding") : t("subscription.annualTabStandard")}
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("monthly")}
                  className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    billingCycle === "monthly"
                      ? "bg-[#2563eb] text-white shadow-md"
                      : "text-slate-700 hover:text-slate-900"
                  }`}
                >
                  {t("subscription.monthlyTab")}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-sm font-semibold text-center shadow-sm">
                ⚠️ {error}
              </div>
            )}

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
                      <span>{t("subscription.foundingMemberBadge")}</span>
                    </div>
                  )}

                  <div className="space-y-3 pt-2">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      {t("subscription.includedFeaturesTitle")}
                    </p>
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
                  className="w-full mt-8 bg-[#2563eb] hover:bg-blue-700 text-white font-extrabold py-4 rounded-2xl shadow-lg text-base transition-all active:scale-[0.99] cursor-pointer"
                >
                  {billingCycle === "annual"
                    ? isFoundingOfferActive
                      ? t("subscription.claimFoundingRate")
                      : t("subscription.subscribeAnnualCta")
                    : t("subscription.subscribeMonthlyCta")}
                </Button>

                <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-500 text-center">
                  <span>🔒 {t("subscription.guaranteeCancel")}</span>
                  <span>•</span>
                  <span>🇦🇺 {t("subscription.guaranteePrivacy")}</span>
                  <span>•</span>
                  <span>⚡ {t("subscription.guaranteeInstant")}</span>
                </div>

                <div className="mt-4 text-center text-xs text-slate-400 font-medium">
                  {t("subscription.supportHelpText", { email: "support@moneymatters.kaesava.au" })}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
