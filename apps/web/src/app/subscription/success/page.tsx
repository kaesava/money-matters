"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { t } from "@money-matters/i18n";
import { Button, Spinner } from "@money-matters/ui/web";
import { trpc } from "../../../lib/trpc";

function SubscriptionSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(Boolean(sessionId));
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const verifyMutation = trpc.verifyCheckoutSession.useMutation();

  useEffect(() => {
    let isMounted = true;

    async function verify() {
      if (!sessionId) {
        setVerifying(false);
        setVerified(true);
        return;
      }

      try {
        const res = await verifyMutation.mutateAsync({ sessionId });
        if (isMounted) {
          if (res.verified) {
            setVerified(true);
            await utils.getSubscriptionStatus.invalidate();
          } else {
            setVerified(true); // Webhook backstop will finalize
          }
        }
      } catch (err) {
        if (isMounted) {
          setVerificationError(err instanceof Error ? err.message : null);
          setVerified(true); // Still allow proceeding to dashboard
        }
      } finally {
        if (isMounted) {
          setVerifying(false);
        }
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount with sessionId
  }, [sessionId]);

  useEffect(() => {
    if (verified && !verifying) {
      const timer = setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [verified, verifying, router]);

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-slate-100 flex flex-col items-center gap-6">
        {verifying ? (
          <>
            <div className="w-16 h-16 rounded-full bg-blue-50 text-[#2563eb] flex items-center justify-center">
              <Spinner size="lg" />
            </div>
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-extrabold text-[#1B2B4B]">
                {t("subscription.verifyingTitle")}
              </h1>
              <p className="text-sm text-slate-600">
                {t("subscription.verifyingSubtitle")}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl font-bold">
              🎉
            </div>

            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-extrabold text-[#1B2B4B]">
                {t("subscription.verifiedSuccessTitle")}
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                {verificationError
                  ? t("subscription.verifyingDelayedNotice")
                  : t("subscription.verifiedSuccessSubtitle")}
              </p>
            </div>

            <Button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-[#2563eb] hover:bg-blue-700 text-white font-extrabold py-3.5 rounded-xl shadow-md text-sm transition-all"
            >
              {t("subscription.goToDashboardCta")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
          <Spinner size="lg" className="text-[#2563eb]" />
        </div>
      }
    >
      <SubscriptionSuccessContent />
    </Suspense>
  );
}
