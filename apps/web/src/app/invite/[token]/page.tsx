'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const acceptInviteMutation = trpc.acceptInvite.useMutation({
    onSuccess: () => {
      setStatus('success');
      setTimeout(() => router.push('/dashboard'), 2000);
    },
    onError: (err) => {
      setStatus('error');
      setErrorMsg(err.message);
    },
  });

  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (token && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      acceptInviteMutation.mutate({ inviteToken: token });
    }
  }, [token, acceptInviteMutation]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-sm border border-gray-200 text-center">
        {status === 'loading' && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin mx-auto" />
            <h1 className="text-xl font-bold text-gray-900">Joining Household...</h1>
            <p className="text-sm text-gray-500">Validating your invitation token.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-2xl mx-auto">✓</div>
            <h1 className="text-xl font-bold text-gray-900">Welcome to the Household! 🎉</h1>
            <p className="text-sm text-gray-500">
              Your account has been linked to the household budget. Redirecting to dashboard...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-2xl mx-auto">⚠️</div>
            <h1 className="text-xl font-bold text-gray-900">Invitation Invalid</h1>
            <p className="text-sm text-gray-500">{errorMsg || 'This invite token is invalid or expired.'}</p>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="mt-2 bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
