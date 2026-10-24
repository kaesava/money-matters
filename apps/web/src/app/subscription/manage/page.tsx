"use client";

import { useEffect, useState } from "react";
import { trpc } from "../../../lib/trpc";
import { Spinner } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";

export default function SubscriptionManagePage() {
  const [error, setError] = useState<string | null>(null);
  const createPortalSession = trpc.createCustomerPortalSession.useMutation();

  useEffect(() => {
    async function redirect() {
      try {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const result = await createPortalSession.mutateAsync({
          returnUrl: `${origin}/dashboard/settings`,
        });

        if (result.url) {
          window.location.href = result.url;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load billing portal.");
      }
    }

    redirect();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot mount effect; adding createPortalSession would re-trigger on every mutation state change
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-md border border-zinc-100 flex flex-col items-center gap-4">
        {error ? (
          <>
            <span className="text-3xl">⚠️</span>
            <h1 className="text-lg font-bold text-rose-800">{t("subscription.portalError")}</h1>
            <p className="text-xs text-zinc-600">{error}</p>
          </>
        ) : (
          <>
            <Spinner size="lg" className="text-[#2563eb]" />
            <p className="text-sm font-semibold text-zinc-700">{t("subscription.openingStripePortal")}</p>
          </>
        )}
      </div>
    </div>
  );
}
