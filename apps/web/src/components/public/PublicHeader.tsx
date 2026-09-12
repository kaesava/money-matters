"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { Logo } from "@money-matters/ui/web";
import { authClient } from "../../lib/auth";

interface PublicHeaderProps {
  showSignIn?: boolean;
  backHref?: string;
  backLabel?: string;
}

export function PublicHeader({ showSignIn = true, backHref, backLabel }: PublicHeaderProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
      return;
    }
    if (session?.user) {
      router.push("/dashboard");
    } else {
      router.push("/");
    }
  };

  const defaultLabel = session?.user
    ? t("public.backToDashboard")
    : t("public.backToHome");

  return (
    <header className="w-full bg-[#1B2B4B] border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-md">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <Logo size="md" />
          <span className="text-lg font-extrabold text-white tracking-tight">
            {t("app.title")}
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="text-xs font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
        >
          {backLabel || defaultLabel}
        </button>

        {!session?.user && showSignIn && (
          <Link
            href="/sign-in"
            className="text-xs font-bold text-white bg-[#2563eb] hover:bg-blue-600 px-3.5 py-2 rounded-xl transition-all shadow-xs"
          >
            {t("public.signIn")}
          </Link>
        )}
      </div>
    </header>
  );
}
