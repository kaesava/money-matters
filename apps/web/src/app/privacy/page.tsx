import React from "react";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="font-extrabold text-xl text-[#1B2B4B]">
            Money Matters
          </Link>
          <Link href="/" className="text-sm font-semibold text-blue-600 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2B4B]">Privacy Policy</h1>
          <p className="text-xs text-slate-400 mt-1">Last updated: August 1, 2026 • Compliant with Privacy Act 1988 (Cth)</p>
        </div>

        <section className="space-y-4 text-sm leading-relaxed text-slate-700">
          <h2 className="text-lg font-bold text-slate-900">1. Overview</h2>
          <p>
            Money Matters ("we", "our", "us") respects your privacy and is committed to protecting your personal and financial information. This Privacy Policy explains how we collect, use, store, and disclose your personal information in accordance with the Australian Privacy Principles (APPs) under the Privacy Act 1988 (Cth).
          </p>

          <h2 className="text-lg font-bold text-slate-900">2. Collection of Personal Data</h2>
          <p>
            We collect personal information necessary to deliver our forward-looking allocation budget application, including your name, email address, household preferences, budget categories, income schedules, and transaction ledger entries.
          </p>

          <h2 className="text-lg font-bold text-slate-900">3. Data Security & Storage</h2>
          <p>
            All data is encrypted in transit (TLS 1.3) and at rest using enterprise-grade serverless PostgreSQL hosted on Neon DB and edge execution on Cloudflare Workers. We enforce multi-tenant Row Level Security (RLS) ensuring your financial data is strictly isolated to your authorized household scope.
          </p>

          <h2 className="text-lg font-bold text-slate-900">4. Contact Us</h2>
          <p>
            If you have questions, feedback, or data erasure requests under the Australian Privacy Principles, please contact our Data Governance Lead at:
          </p>
          <div className="bg-white p-4 rounded-xl border border-slate-200 inline-block font-mono text-xs text-blue-600 font-bold">
            info@kaesava.au
          </div>
        </section>
      </main>
    </div>
  );
}
