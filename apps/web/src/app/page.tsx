"use client";
import { useRouter } from 'next/navigation';
import { t } from "@money-matters/i18n";

export default function Home() {
  const router = useRouter();

  const handleSignIn = () => {
    // Inject secure header identity traces into the local session storage context
    localStorage.setItem("session_token", "secure-household-boundary-token");
    router.push('/dashboard');
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 min-h-screen p-8">
      <main className="max-w-2xl bg-white p-12 rounded-xl shadow-lg border border-zinc-100 flex flex-col gap-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900">{t("app.title")}</h1>
        <p className="text-xl text-zinc-600">{t("app.description")}</p>
        <div className="flex flex-col gap-4 max-w-sm mx-auto w-full pt-4">
           <button onClick={handleSignIn} className="w-full bg-zinc-900 text-white rounded-lg py-3 px-4 font-medium hover:bg-zinc-800 transition-colors">
             {t("auth.cta")}
           </button>
           <p className="text-sm text-zinc-500">{t("auth.hint")}</p>
        </div>
      </main>
    </div>
  );
}
