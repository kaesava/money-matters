"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSubscriptionStatus } from "../hooks/useSubscriptionStatus";
import { t } from "@money-matters/i18n";
import { Button } from "@money-matters/ui/web";

const STORAGE_KEY = "mm_trial_ended_dismissed";

export function TrialEndedModal() {
  const router = useRouter();
  const { status, isLoading } = useSubscriptionStatus();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isLoading || !status) return;

    if (status.isTrialExpired) {
      setIsOpen(true);
    } else {
      const isDismissed = localStorage.getItem(STORAGE_KEY) === "true";
      if (status.isTrialGrace && !isDismissed) {
        setIsOpen(true);
      }
    }
  }, [status, isLoading]);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-zinc-100 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xl font-bold">
            👋
          </div>
          <button
            onClick={handleDismiss}
            className="text-zinc-400 hover:text-zinc-600 text-lg font-bold"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold text-[#1B2B4B]">{t("subscription.trialEndedModalTitle")}</h2>
          <p className="text-sm text-zinc-600 leading-relaxed">{t("subscription.trialEndedModalBody")}</p>
        </div>

        <div className="flex flex-col gap-2.5 mt-2">
          <Button
            onClick={() => {
              handleDismiss();
              router.push("/subscription/upgrade");
            }}
            className="w-full bg-[#2563eb] hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg"
          >
            {t("subscription.trialEndedModalCta")}
          </Button>
          <button
            onClick={handleDismiss}
            className="w-full py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-700"
          >
            {t("subscription.trialEndedModalDismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}
