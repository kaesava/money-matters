"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "../lib/auth";
import { trpc } from "../lib/trpc";
import { useToast } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { PaycheckSimulator } from "../components/PaycheckSimulator";

import { AuthModal } from "../components/landing/AuthModal";
import { EarlyAccessModal } from "../components/landing/EarlyAccessModal";
import { LandingHeader } from "../components/landing/LandingHeader";
import { LandingHero } from "../components/landing/LandingHero";
import { ProblemSection } from "../components/landing/ProblemSection";
import { HowItWorksSection } from "../components/landing/HowItWorksSection";
import { AdvantagesSection } from "../components/landing/AdvantagesSection";
import { PricingSection } from "../components/landing/PricingSection";
import { TrustSection } from "../components/landing/TrustSection";
import { FaqSection } from "../components/landing/FaqSection";
import { LandingFooter } from "../components/landing/LandingFooter";

const isAuthEnabled = process.env.NEXT_PUBLIC_ENABLE_AUTH !== "false";

function EarlyAccessQueryWatcher({ onTrigger }: { onTrigger: () => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const earlyAccess = searchParams.get("early_access");
    const authDisabled = searchParams.get("auth_disabled");
    if (earlyAccess === "true" || authDisabled === "true") {
      onTrigger();
    }
  }, [searchParams, onTrigger]);

  return null;
}

export default function Home() {
  const router = useRouter();
  const toast = useToast();
  const [isClient, setIsClient] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"signIn" | "signUp">("signIn");
  const [isEarlyAccessOpen, setIsEarlyAccessOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  const openEarlyAccessModal = useCallback(() => {
    setIsEarlyAccessOpen(true);
  }, []);

  const subscribeMut = trpc.subscribeEarlyAccess.useMutation({
    onSuccess: () => {
      setIsEarlyAccessOpen(false);
      setEmailInput("");
      toast.success(
        t("toasts.earlyAccessRegistered"),
        t("landing.earlyAccess.title"),
        6000
      );
    },
    onError: (err) => {
      toast.error(err.message || t("toasts.error"), t("common.error"));
    },
  });

  const handleOpenAuth = (tab: "signIn" | "signUp") => {
    if (!isAuthEnabled) {
      setIsEarlyAccessOpen(true);
      return;
    }
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  useEffect(() => {
    setIsClient(true);
    if (isAuthEnabled) {
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
      <Suspense fallback={null}>
        <EarlyAccessQueryWatcher onTrigger={openEarlyAccessModal} />
      </Suspense>

      <EarlyAccessModal
        isOpen={isEarlyAccessOpen}
        onClose={() => setIsEarlyAccessOpen(false)}
        emailInput={emailInput}
        setEmailInput={setEmailInput}
        onSubmit={(email) => subscribeMut.mutate({ email })}
        isPending={subscribeMut.isPending}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialTab={authModalTab}
      />

      <LandingHeader onAuthClick={handleOpenAuth} />
      <LandingHero onAuthClick={handleOpenAuth} />
      <ProblemSection />
      <HowItWorksSection />

      <div id="simulator" className="scroll-mt-14">
        <PaycheckSimulator />
      </div>

      <AdvantagesSection />
      <PricingSection onAuthClick={handleOpenAuth} />
      <TrustSection />
      <FaqSection />
      <LandingFooter onAuthClick={handleOpenAuth} />
    </div>
  );
}
