"use client";

import React from "react";
import Link from "next/link";
import { t } from "@money-matters/i18n";
import { Logo, Button } from "@money-matters/ui/web";
import { authClient } from "../lib/auth";

export default function NotFoundPage() {
  const { data: session } = authClient.useSession();
  const isLoggedIn = !!session?.user;

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#1B2B4B] font-sans selection:bg-[#2563eb] selection:text-white flex flex-col">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center w-full">
          <Link href="/" className="flex items-center gap-2 font-extrabold text-xl text-[#1B2B4B]">
            <Logo size="sm" /> {t("app.title")}
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-6xl font-extrabold text-[#2563eb] mb-4 font-mono">404</h1>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1B2B4B] mb-3">
          {t("notFound.title")}
        </h2>
        <p className="text-slate-600 mb-8 max-w-md mx-auto text-sm sm:text-base">
          {t("notFound.message")}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {isLoggedIn ? (
            <Link href="/dashboard">
              <Button variant="primary" size="md">
                {t("notFound.backToDashboard")}
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/">
                <Button variant="secondary" size="md">
                  {t("notFound.backToHome")}
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button variant="primary" size="md">
                  {t("notFound.signIn")}
                </Button>
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

