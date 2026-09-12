"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../lib/auth";
import { PaycheckSimulator } from "../components/PaycheckSimulator";

import { AuthModal } from "../components/landing/AuthModal";
import { LandingHeader } from "../components/landing/LandingHeader";
import { LandingHero } from "../components/landing/LandingHero";
import { ProblemSection } from "../components/landing/ProblemSection";
import { HowItWorksSection } from "../components/landing/HowItWorksSection";
import { AdvantagesSection } from "../components/landing/AdvantagesSection";
import { PricingSection } from "../components/landing/PricingSection";
import { TrustSection } from "../components/landing/TrustSection";
import { FaqSection } from "../components/landing/FaqSection";
import { LandingFooter } from "../components/landing/LandingFooter";

export default function Home() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"signIn" | "signUp">("signIn");

  const handleOpenAuth = (tab: "signIn" | "signUp") => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

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
    <div className="min-h-screen flex flex-col bg-[#F7F8FA] text-[#1B2B4B] font-sans selection:bg-[#2563eb] selection:text-white relative">
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
