"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";

export default function Dashboard() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("session_token");
    if (!token) {
      router.push("/");
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  const handleSignOut = () => {
    localStorage.removeItem("session_token");
    router.push("/");
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50">
        <p className="text-zinc-500 font-medium">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between border-b pb-4 mb-6">
        <h1 className="text-3xl font-bold text-[#1B2B4B]">{t("dashboard.title")}</h1>
        <button 
          onClick={handleSignOut}
          className="border border-zinc-300 text-zinc-700 px-4 py-2 rounded-lg hover:bg-zinc-50 text-sm font-medium transition-colors"
        >
          Sign Out
        </button>
      </div>
      
      <div className="p-6 bg-white rounded-xl border border-zinc-200 shadow-sm">
        <h2 className="text-xl font-semibold mb-2 text-[#1B2B4B]">{t("dashboard.terminal")}</h2>
        <p className="text-zinc-600">{t("dashboard.loading")}</p>
      </div>
    </div>
  );
}
