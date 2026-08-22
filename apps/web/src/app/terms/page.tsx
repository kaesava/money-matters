import React from "react";
import Link from "next/link";
import { t } from "@money-matters/i18n";
import { Logo } from "@money-matters/ui/web";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#1B2B4B] font-sans selection:bg-[#2563eb] selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 font-extrabold text-xl text-[#1B2B4B]">
            <Logo size="sm" /> Money Matters
          </Link>
          <Link href="/" className="text-sm font-semibold text-[#2563eb] hover:underline">
            {t("privacy.backToHome")}
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#1B2B4B]">{t("terms.title")}</h1>
          <p className="text-sm text-slate-500 mt-2">
            {t("terms.lastUpdated")}
          </p>
        </div>

        <section className="space-y-8 text-sm leading-relaxed text-slate-700">
          <div className="space-y-3">
            <p>{t("terms.content")}</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500 mt-12">
        <div className="max-w-4xl mx-auto px-6 flex justify-between items-center">
          <span>© 2026 Kaesava. All rights reserved.</span>
          <Link href="/" className="text-[#2563eb] font-semibold hover:underline">
            {t("privacy.returnToApp")}
          </Link>
        </div>
      </footer>
    </div>
  );
}
