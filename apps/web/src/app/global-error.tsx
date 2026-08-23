'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import posthog from '../lib/posthog-client';
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    posthog.captureException(error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-[#F7F8FA] flex items-center justify-center p-4 font-sans text-[#1B2B4B]">
        <div className="w-full max-w-md bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-xl font-bold">
            ⚠️
          </div>

          <h1 className="text-xl font-bold tracking-tight">
            Something Went Wrong
          </h1>

          <p className="text-xs text-zinc-600 leading-relaxed">
            An unexpected application error occurred. Our team has been notified automatically.
          </p>

          {error.digest && (
            <code className="text-[10px] font-mono text-zinc-400 bg-zinc-50 px-2 py-1 rounded-md border border-zinc-200">
              Error Digest: {error.digest}
            </code>
          )}

          <div className="flex items-center gap-3 mt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="px-4 py-2 text-xs font-bold text-white bg-[#2563eb] hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="px-4 py-2 text-xs font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors"
            >
              Go to Home Page
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
