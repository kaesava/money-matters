"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { t } from "@money-matters/i18n";
import { Logo, Spinner } from "@money-matters/ui/web";
import { PublicHeader } from "../../components/public/PublicHeader";
import { PublicFooter } from "../../components/public/PublicFooter";
import { SignInForm } from "../../components/auth/SignInForm";
import { SocialAuthButtons } from "../../components/auth/SocialAuthButtons";
import { OtpVerificationView } from "../../components/auth/OtpVerificationView";

function SignInContent() {
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect") || "/dashboard";
  const redirectUrl =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/dashboard";

  const [error, setError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col font-sans">
      <PublicHeader showSignIn={false} />

      <main className="flex-1 flex items-center justify-center p-6 my-8">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 sm:p-10 flex flex-col gap-6">
          <div className="text-center flex flex-col items-center gap-2">
            <Logo size="lg" />
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1B2B4B]">
              {unverifiedEmail ? t("auth.checkYourEmailTitle") : t("auth.signIn")}
            </h1>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              {unverifiedEmail ? t("auth.otpLabel") : t("app.tagline")}
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl text-center">
              ⚠️ {error}
            </div>
          )}

          {unverifiedEmail ? (
            <OtpVerificationView
              email={unverifiedEmail}
              onSuccess={() => {
                window.location.href = redirectUrl;
              }}
              onCancel={() => setUnverifiedEmail(null)}
            />
          ) : (
            <>
              <SocialAuthButtons
                mode="signIn"
                redirectUrl={redirectUrl}
                onError={(msg) => setError(msg)}
              />

              <div className="relative flex items-center justify-center my-1">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider absolute">
                  {t("landing.authModalOrContinue")}
                </span>
              </div>

              <SignInForm
                redirectUrl={redirectUrl}
                onSuccess={() => {}}
                onNeedOtp={(em) => setUnverifiedEmail(em)}
                onError={(msg) => setError(msg)}
              />

              <div className="pt-2 text-center text-xs text-slate-500 font-medium">
                {t("auth.signUpPrompt")}{" "}
                <Link
                  href={`/sign-up${redirectUrl !== "/dashboard" ? `?redirect=${encodeURIComponent(redirectUrl)}` : ""}`}
                  className="font-bold text-[#2563eb] hover:underline"
                >
                  {t("landing.createAccount")}
                </Link>
              </div>
            </>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
          <Spinner size="lg" className="text-[#2563eb]" />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
