'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '../../../lib/trpc';
import { authClient } from '../../../lib/auth';
import { Spinner } from '@money-matters/ui/web';
import { t } from '@money-matters/i18n';

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const { data: session, isPending } = authClient.useSession();
  const acceptInviteMutation = trpc.acceptInvite.useMutation({
    onSuccess: () => {
      setStatus('success');
      setTimeout(() => router.push('/dashboard'), 2000);
    },
    onError: (err: { message: string }) => {
      setStatus('error');
      setErrorMsg(err.message);
    },
  });

  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      setStatus('loading'); // Just stop loading to show unauth state below
      return;
    }
    if (token && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      acceptInviteMutation.mutate({ inviteToken: token });
    }
  }, [token, acceptInviteMutation, session, isPending]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-sm border border-gray-200 text-center">
        {(status === 'loading' && isPending) && (
          <div className="space-y-4">
            <Spinner size="lg" className="text-[#00B4A6] mx-auto" />
            <h1 className="text-xl font-bold text-gray-900">{t("partner.acceptTitle")}</h1>
            <p className="text-sm text-gray-500">{t("partner.acceptSubtitle")}</p>
          </div>
        )}

        {(status === 'loading' && !isPending && !session?.user) && (
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-gray-900">Join Household</h1>
            <p className="text-sm text-gray-500">Create an account to accept your partner&apos;s invite.</p>
            <div className="flex flex-col gap-3 mt-4">
              <button
                type="button"
                onClick={() => router.push(`/sign-up?redirect=/invite/${token}`)}
                className="bg-[#00B4A6] text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-teal-600 transition-colors w-full"
              >
                Sign Up
              </button>
              <p className="text-xs text-gray-500">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => router.push(`/sign-in?redirect=/invite/${token}`)}
                  className="font-bold text-[#00B4A6] hover:underline"
                >
                  Sign In
                </button>
              </p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-2xl mx-auto">✓</div>
            <h1 className="text-xl font-bold text-gray-900">{t("partner.acceptSuccessTitle")}</h1>
            <p className="text-sm text-gray-500">
              {t("partner.acceptSuccessMessage")}
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-2xl mx-auto">⚠️</div>
            <h1 className="text-xl font-bold text-gray-900">{t("partner.acceptErrorTitle")}</h1>
            <p className="text-sm text-gray-500">{errorMsg || t("partner.invalidToken")}</p>
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
                onClick={() => router.push('/dashboard')}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 px-4 py-2 rounded-xl transition-colors cursor-pointer"
              >
                {t("partner.goToDashboard")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
