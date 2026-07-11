"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation.js";
import { t } from "@money-matters/i18n";

export default function Home() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // If user has a valid mock token, push them straight to the logged-in dashboard
    const token = localStorage.getItem("session_token");
    if (token === "mock-valid-token") {
      router.push("/dashboard");
    }
  }, [router]);

  const handleSignIn = () => {
    // Write mock credential to store matching JWT mock resolver in packages/core auth.ts
    localStorage.setItem("session_token", "mock-valid-token");
    router.push("/dashboard");
  };

  const handleSignUp = () => {
    localStorage.setItem("session_token", "mock-valid-token");
    router.push("/dashboard");
  };

  if (!isClient) return null;

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 min-h-screen p-8">
      <main className="max-w-2xl bg-white p-12 rounded-xl shadow-lg border border-zinc-100 flex flex-col gap-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900">{t("app.title")}</h1>
        <p className="text-xl text-zinc-600">{t("app.description")}</p>
        
        <div className="flex flex-col gap-4 max-w-sm mx-auto w-full pt-4">
          <button 
            onClick={handleSignIn} 
            className="w-full bg-[#1B2B4B] text-white rounded-lg py-3 px-4 font-medium hover:opacity-90 transition-opacity"
          >
            {t("auth.cta")}
          </button>
          
          <button 
            onClick={handleSignUp} 
            className="w-full border border-zinc-300 text-zinc-700 rounded-lg py-3 px-4 font-medium hover:bg-zinc-50 transition-colors"
          >
            Create New Account
          </button>

          <p className="text-sm text-zinc-500">{t("auth.hint")}</p>
        </div>
      </main>
    </div>
  );
}
