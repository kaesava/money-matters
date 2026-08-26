"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "../lib/auth";
import { trpc } from "../lib/trpc";
import { PaycheckSimulator } from "../components/PaycheckSimulator";

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

import { useToast } from "@money-matters/ui/web";

const ENABLE_AUTH = process.env.NEXT_PUBLIC_ENABLE_AUTH ? process.env.NEXT_PUBLIC_ENABLE_AUTH === "true" : process.env.NODE_ENV === "production" ? true : false;

function EarlyAccessQueryWatcher({ onTrigger }: { onTrigger: () => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("early_access") === "true") {
      onTrigger();
    }
  }, [searchParams, onTrigger]);

  return null;
}

export default function Home() {
  const router = useRouter();
  const toast = useToast();
  const [isClient, setIsClient] = useState(false);
  const [showEarlyAccessModal, setShowEarlyAccessModal] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  const openEarlyAccessModal = useCallback(() => {
    setShowEarlyAccessModal(true);
  }, []);

  const subscribeMut = trpc.subscribeEarlyAccess.useMutation({
    onSuccess: () => {
      setShowEarlyAccessModal(false);
      setEmailInput("");
      toast.success(
        "Thank you! We've registered your email and will notify you as soon as Money Matters goes live.",
        "Early Access Registered",
        6000
      );
    },
  });

  const handleAuthClick = (path: string) => {
    const hasEarlyAccessFlag =
      typeof window !== "undefined" &&
      (window.location.search.includes("early_access=true") || window.location.search.includes("auth_disabled=true"));

    if (!ENABLE_AUTH || hasEarlyAccessFlag) {
      setShowEarlyAccessModal(true);
    } else {
      router.push(path);
    }
  };

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("early_access") === "true" || params.get("auth_disabled") === "true") {
        setShowEarlyAccessModal(true);
      }
    }
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
      <Suspense fallback={null}>
        <EarlyAccessQueryWatcher onTrigger={openEarlyAccessModal} />
      </Suspense>

      <EarlyAccessModal
        isOpen={showEarlyAccessModal}
        onClose={() => setShowEarlyAccessModal(false)}
        emailInput={emailInput}
        setEmailInput={setEmailInput}
        onSubmit={(email) => subscribeMut.mutate({ email })}
        isPending={subscribeMut.isPending}
      />

      <LandingHeader onAuthClick={handleAuthClick} />
      <LandingHero onAuthClick={handleAuthClick} />
      <ProblemSection />
      <HowItWorksSection />

      <div id="simulator">
        <PaycheckSimulator />
      </div>

      <AdvantagesSection />
      <PricingSection onAuthClick={handleAuthClick} />
      <TrustSection />
      <FaqSection />
      <LandingFooter onAuthClick={handleAuthClick} />
    </div>
  );
}
