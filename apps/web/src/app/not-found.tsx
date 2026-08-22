import React from "react";
import Link from "next/link";
import { t } from "@money-matters/i18n";
import { Logo } from "@money-matters/ui/web";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#1B2B4B] font-sans selection:bg-[#2563eb] selection:text-white flex flex-col">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center w-full">
          <Link href="/" className="flex items-center gap-2 font-extrabold text-xl text-[#1B2B4B]">
            <Logo size="sm" /> Money Matters
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-6xl font-extrabold text-[#2563eb] mb-4">404</h1>
        <h2 className="text-3xl font-bold text-[#1B2B4B] mb-4">
          {t("notFound.title")}
        </h2>
        <p className="text-slate-600 mb-8 max-w-md mx-auto">
          {t("notFound.message")}
        </p>
        <Link
          href="/dashboard"
          className="bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-sm inline-flex items-center justify-center"
        >
          {t("notFound.backToDashboard")}
        </Link>
      </main>
    </div>
  );
}
