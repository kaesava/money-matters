"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "../../../lib/trpc";
import { authClient } from "../../../lib/auth";
import { Spinner } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { PublicHeader } from "../../../components/public/PublicHeader";
import { PublicFooter } from "../../../components/public/PublicFooter";

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const { data: session, isPending } = authClient.useSession();
  const acceptInviteMutation = trpc.acceptInvite.useMutation({
    onSuccess: () => {
      setStatus("success");
      setTimeout(() => router.push("/dashboard"), 2000);
    },
    onError: (err: { message: string }) => {
      setStatus("error");
      setErrorMsg(err.message);
    },
  });

  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      setStatus("loading");
      return;
    }
    if (token && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      acceptInviteMutation.mutate({ inviteToken: token });
    }
  }, [token, acceptInviteMutation, session, isPending]);

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col font-sans justify-between">
      <PublicHeader showSignIn={!session?.user} />

      <main className="flex-1 flex items-center justify-center p-6 my-8">
        <div className="bg-white rounded-3xl p-8 sm:p-10 max-w-md w-full shadow-xl border border-slate-200/80 text-center flex flex-col gap-5">
          {status === "loading" && isPending && (
            <div className="space-y-4">
              <Spinner size="lg" className="text-[#2563eb] mx-auto" />
              <h1 className="text-xl font-extrabold text-[#1B2B4B]">{t("partner.acceptTitle")}</h1>
              <p className="text-xs text-slate-500">{t("partner.acceptSubtitle")}</p>
            </div>
          )}

          {status === "loading" && !isPending && !session?.user && (
            <div className="space-y-4">
              <h1 className="text-2xl font-extrabold text-[#1B2B4B]">
                {t("partner.joinHouseholdTitle")}
              </h1>
              <p className="text-xs text-slate-500">
                {t("partner.joinHouseholdSubtitle")}
              </p>
              <div className="flex flex-col gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => router.push(`/sign-up?redirect=/invite/${token}`)}
                  className="bg-[#2563eb] text-white text-xs font-bold px-4 py-3 rounded-xl hover:bg-blue-700 transition-colors w-full cursor-pointer shadow-xs"
                >
                  {t("auth.signUp")}
                </button>
                <p className="text-xs text-slate-500">
                  {t("partner.alreadyHaveAccountPrompt")}{" "}
                  <button
                    type="button"
                    onClick={() => router.push(`/sign-in?redirect=/invite/${token}`)}
                    className="font-bold text-[#2563eb] hover:underline cursor-pointer"
                  >
                    {t("auth.signIn")}
                  </button>
                </p>
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-2xl mx-auto font-bold">
                ✓
              </div>
              <h1 className="text-xl font-extrabold text-[#1B2B4B]">{t("partner.acceptSuccessTitle")}</h1>
              <p className="text-xs text-slate-500">{t("partner.acceptSuccessMessage")}</p>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-2xl mx-auto font-bold">
                ⚠️
              </div>
              <h1 className="text-xl font-extrabold text-[#1B2B4B]">{t("partner.acceptErrorTitle")}</h1>
              <p className="text-xs text-slate-500">{errorMsg || t("partner.invalidToken")}</p>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    await authClient.signOut();
                    router.push(`/sign-in?redirect=/invite/${token}`);
                  }}
                  className="bg-[#2563eb] text-white text-xs font-extrabold px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors w-full cursor-pointer"
                >
                  {t("partner.signOutSwitchAccount")}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 px-4 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  {t("partner.goToDashboard")}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
