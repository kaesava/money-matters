import React from "react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delete Your Account & Data | Money Matters",
  description:
    "Request deletion of your Money Matters account and all associated financial data. Understand what data is deleted, what is retained, and how to contact us.",
};

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#1B2B4B] font-sans selection:bg-[#ba1a1a] selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 font-extrabold text-xl text-[#1B2B4B]">
            <span className="text-[#2563eb]">⬡</span> Money Matters
          </Link>
          <Link href="/privacy" className="text-sm font-semibold text-[#2563eb] hover:underline">
            ← Privacy Policy
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        {/* Title block */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-full mb-3">
            <span>⚠️</span> ACCOUNT & DATA DELETION REQUEST
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#1B2B4B]">
            Delete Your Account & Data
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Money Matters by Kaesava · Effective under the Australian Privacy Act 1988 (Cth)
          </p>
        </div>

        {/* Who is this for */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
          <h2 className="text-lg font-bold text-[#1B2B4B]">About this page</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            This page is for users of the <strong>Money Matters</strong> household budgeting app
            (published on Google Play by Kaesava). You can use the steps below to request complete
            deletion of your account and all personal financial data held by Kaesava. Requests are
            handled manually by our team and fulfilled within <strong>30 calendar days</strong>.
          </p>
        </div>

        {/* Steps */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-[#1B2B4B]">How to Request Account Deletion</h2>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex gap-4 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#2563eb] text-white font-extrabold flex items-center justify-center text-lg">
                1
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[#1B2B4B]">Email us your deletion request</h3>
                <p className="text-sm text-slate-600">
                  Send an email to{" "}
                  <a
                    href="mailto:privacy@kaesava.au?subject=Account%20Deletion%20Request%20%E2%80%94%20Money%20Matters&body=Hi%2C%0A%0AI%20would%20like%20to%20request%20the%20deletion%20of%20my%20Money%20Matters%20account%20and%20all%20associated%20data.%0A%0AEmail%20address%20registered%3A%20%5Byour%20email%5D%0AReason%20(optional)%3A%20%5Byour%20reason%5D%0A%0AThank%20you."
                    className="font-semibold text-[#2563eb] hover:underline"
                  >
                    privacy@kaesava.au
                  </a>{" "}
                  using the subject line{" "}
                  <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">
                    Account Deletion Request — Money Matters
                  </code>
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#2563eb] text-white font-extrabold flex items-center justify-center text-lg">
                2
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[#1B2B4B]">Include your account email address</h3>
                <p className="text-sm text-slate-600">
                  Provide the exact email address you used to register your Money Matters account.
                  This is required so we can locate and verify your account before proceeding.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#2563eb] text-white font-extrabold flex items-center justify-center text-lg">
                3
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[#1B2B4B]">We confirm receipt within 3 business days</h3>
                <p className="text-sm text-slate-600">
                  Our team will send a confirmation reply acknowledging your request. We may ask for
                  identity verification if the request cannot be matched to an active account.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#2563eb] text-white font-extrabold flex items-center justify-center text-lg">
                4
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[#1B2B4B]">Deletion completed within 30 days</h3>
                <p className="text-sm text-slate-600">
                  Your account and associated personal data will be permanently deleted within 30
                  calendar days of verification. You will receive a final confirmation email once
                  the deletion is complete.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What gets deleted */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-[#1B2B4B]">What Data Is Deleted</h2>
          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <ul className="space-y-3 text-sm text-slate-700">
              {[
                "Your name, email address, and authentication credentials",
                "All household and tenant membership records",
                "All budget categories, allocation plans, and spending waterfall configurations",
                "All income and expense events, amounts, and notes",
                "All bank account records and transaction ledger entries",
                "All financial file notes and attachments",
                "All notification preferences and device push tokens",
                "All session tokens and login history",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-[#ba1a1a] font-bold mt-0.5 flex-shrink-0">✗</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* What is retained */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-[#1B2B4B]">What May Be Retained (and Why)</h2>
          <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl shadow-sm space-y-3">
            <p className="text-sm text-amber-800 font-medium">
              In limited circumstances required by Australian law, we may retain de-identified
              records for a retention period:
            </p>
            <ul className="space-y-3 text-sm text-amber-900">
              {[
                {
                  item: "Aggregated, de-identified usage metrics",
                  note: "Retained for up to 7 years for service improvement; cannot be linked back to you",
                },
                {
                  item: "Records required by Australian taxation or financial regulations",
                  note:
                    "May be retained for up to 7 years as required by the Corporations Act 2001 (Cth)",
                },
                {
                  item: "Security audit logs",
                  note: "Retained for 90 days for fraud prevention; automatically purged after",
                },
              ].map(({ item, note }) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold mt-0.5 flex-shrink-0">⚠</span>
                  <span>
                    <strong>{item}:</strong> {note}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Contact section */}
        <section className="p-6 bg-[#1B2B4B] text-white rounded-2xl shadow-md space-y-3">
          <h2 className="text-xl font-bold">Privacy Contact</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            For all data, privacy, or deletion enquiries, contact us at:
          </p>
          <div className="space-y-1 text-sm">
            <div>
              <strong>Email:</strong>{" "}
              <a
                href="mailto:privacy@kaesava.au"
                className="text-[#2563eb] underline hover:text-blue-300"
              >
                privacy@kaesava.au
              </a>
            </div>
            <div>
              <strong>Developer:</strong> Kaesava, Australia
            </div>
            <div>
              <strong>App:</strong> Money Matters — Household Budget Manager
            </div>
          </div>
        </section>

        <p className="text-xs text-slate-400 text-center">
          This page fulfils Google Play Data Safety requirements for account deletion.
          &nbsp;·&nbsp;
          <Link href="/privacy" className="underline hover:text-slate-600">
            Full Privacy Policy
          </Link>
        </p>
      </main>
    </div>
  );
}
