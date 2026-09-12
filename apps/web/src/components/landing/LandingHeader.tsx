"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { t } from "@money-matters/i18n";
import { Logo } from "@money-matters/ui/web";
import { authClient } from "../../lib/auth";

export interface LandingHeaderProps {
  onAuthClick: (tab: "signIn" | "signUp") => void;
}

const NAV_ITEMS = [
  { id: "why-us", labelKey: "landing.navWhyUs" as const },
  { id: "how-it-works", labelKey: "landing.navHowItWorks" as const },
  { id: "simulator", labelKey: "landing.navSimulator" as const },
  { id: "advantages", labelKey: "landing.navAdvantages" as const },
  { id: "pricing", labelKey: "landing.navPricing" as const },
  { id: "faq", labelKey: "landing.navFaq" as const },
];

function findActiveSection(): string {
  if (window.scrollY < 180) return "";
  const isBottom =
    window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 60;
  if (isBottom) return "faq";
  const match = [...NAV_ITEMS].reverse().find((item) => {
    const el = document.getElementById(item.id);
    return el && el.getBoundingClientRect().top <= 120;
  });
  return match ? match.id : "";
}

function useScrollspy() {
  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      window.requestAnimationFrame(() => {
        setActiveSection(findActiveSection());
        ticking = false;
      });
      ticking = true;
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return activeSection;
}

function LandingNav({ activeSection }: { activeSection: string }) {
  return (
    <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-xs">
      {NAV_ITEMS.map((item) => {
        const isActive = activeSection === item.id;
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={`px-2.5 py-1.5 lg:px-3 rounded-xl font-bold transition-all duration-200 cursor-pointer ${
              isActive
                ? "text-[#2563eb] bg-blue-50/90 border border-blue-200/60 shadow-2xs"
                : "text-slate-600 hover:text-[#1B2B4B] hover:bg-slate-100/70 border border-transparent"
            }`}
          >
            {t(item.labelKey)}
          </a>
        );
      })}
    </nav>
  );
}

function SignedInActions({ displayName }: { displayName: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/80 border border-slate-200/80 text-xs font-semibold text-slate-700">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="max-w-[130px] truncate">{displayName}</span>
      </div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 bg-[#2563eb] hover:bg-blue-700 text-white text-xs sm:text-sm font-extrabold px-4 py-2 rounded-xl transition-all shadow-xs hover:shadow-md active:scale-98 cursor-pointer"
      >
        <span>{t("landing.goToDashboard")}</span>
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}

function SignedOutActions({
  onAuthClick,
}: {
  onAuthClick: (tab: "signIn" | "signUp") => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onAuthClick("signIn")}
        className="text-xs sm:text-sm font-bold text-slate-600 hover:text-[#1B2B4B] hover:bg-slate-100/80 px-3.5 py-2 rounded-xl transition-colors cursor-pointer active:scale-98"
      >
        {t("auth.signIn")}
      </button>
      <button
        type="button"
        onClick={() => onAuthClick("signUp")}
        className="bg-[#2563eb] hover:bg-blue-700 text-white text-xs sm:text-sm font-extrabold px-4.5 py-2 rounded-xl transition-all shadow-xs hover:shadow-md active:scale-98 cursor-pointer"
      >
        {t("landing.createAccount")}
      </button>
    </div>
  );
}

function LandingAuthActions({
  onAuthClick,
}: {
  onAuthClick: (tab: "signIn" | "signUp") => void;
}) {
  const { data: session } = authClient.useSession();

  if (session?.user) {
    const displayName = session.user.name || session.user.email || "";
    return <SignedInActions displayName={displayName} />;
  }

  return <SignedOutActions onAuthClick={onAuthClick} />;
}

export function LandingHeader({ onAuthClick }: LandingHeaderProps) {
  const activeSection = useScrollspy();

  return (
    <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-40 shadow-2xs">
      <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <Logo size="md" />
          <span className="text-xl font-extrabold tracking-tight text-[#1B2B4B] group-hover:text-[#2563eb] transition-colors">
            {t("app.title")}
          </span>
        </Link>

        <LandingNav activeSection={activeSection} />
        <LandingAuthActions onAuthClick={onAuthClick} />
      </div>
    </header>
  );
}
