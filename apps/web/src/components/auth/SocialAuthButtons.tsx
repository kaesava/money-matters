"use client";

import React, { useState } from "react";
import { t } from "@money-matters/i18n";
import { authClient } from "../../lib/auth";

interface SocialAuthButtonsProps {
  mode: "signIn" | "signUp";
  redirectUrl: string;
  onError: (msg: string) => void;
}

export function SocialAuthButtons({ mode, redirectUrl, onError }: SocialAuthButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<"google" | "apple" | null>(null);

  const handleSocialSignIn = async (provider: "google" | "apple") => {
    setLoadingProvider(provider);
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: typeof window !== "undefined" ? window.location.origin + redirectUrl : redirectUrl,
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to connect with provider.");
      setLoadingProvider(null);
    }
  };

  const googleText = mode === "signIn" ? t("auth.signInWithGoogle") : t("auth.signUpWithGoogle");
  const appleText = mode === "signIn" ? t("auth.signInWithApple") : t("auth.signUpWithApple");

  return (
    <div className="flex flex-col gap-2.5 w-full">
      <button
        type="button"
        onClick={() => handleSocialSignIn("google")}
        disabled={loadingProvider !== null}
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-60"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>{loadingProvider === "google" ? t("common.loading") : googleText}</span>
      </button>

      <button
        type="button"
        onClick={() => handleSocialSignIn("apple")}
        disabled={loadingProvider !== null}
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-slate-900 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-60"
      >
        <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170" aria-hidden="true">
          <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.7-7.78-12-14.23-6.52-9.78-11.66-20.87-15.42-33.27-3.76-12.4-5.64-24.03-5.64-34.89 0-14.57 3.59-26.69 10.77-36.37 7.18-9.68 16.3-14.62 27.36-14.83 5.43 0 11.22 1.41 17.38 4.23 6.16 2.82 10.21 4.34 12.16 4.56 1.84-.22 5.98-1.74 12.41-4.56 6.43-2.82 12.01-4.13 16.74-3.92 12.61.65 22.72 5.43 30.33 14.35-11.09 6.74-16.52 16.09-16.3 28.05.22 9.79 3.91 18.05 11.09 24.79 7.17 6.74 15.76 10.66 25.76 11.74-2.17 6.74-4.89 13.48-8.15 20.22zm-35.87-104.9c0-6.74 2.5-13.15 7.5-19.24 5-6.09 11.19-9.9 18.59-11.41.43 2.17.65 4.13.65 5.87 0 6.74-2.61 13.37-7.83 19.89-5.22 6.52-11.52 10.22-18.91 11.09z" />
        </svg>
        <span>{loadingProvider === "apple" ? t("common.loading") : appleText}</span>
      </button>
    </div>
  );
}
