import React from "react";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#1B2B4B] font-sans selection:bg-[#2563eb] selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 font-extrabold text-xl text-[#1B2B4B]">
            <span className="text-[#2563eb]">⬡</span> Money Matters
          </Link>
          <Link href="/" className="text-sm font-semibold text-[#2563eb] hover:underline">
            ← Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        <div>
          <div className="inline-block px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold rounded-full mb-3">
            AUSTRALIAN PRIVACY ACT 1988 (CTH) & APP COMPLIANT
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#1B2B4B]">Privacy Policy & Data Security Standard</h1>
          <p className="text-sm text-slate-500 mt-2">
            Effective Date: August 1, 2026 • Last Reviewed: August 2026 • Kaesava Platform Privacy Standard v2.0
          </p>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
          <h3 className="text-base font-bold text-[#1B2B4B]">🔒 Our Core Privacy Commitment</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Money Matters is built for household financial sovereignty. We apply **Bank-Grade Data Isolation (Row Level Security)** to guarantee that your household data is never visible to or mixed with any other user or household. We **do not sell, rent, or monetise** your personal or financial information.
          </p>
        </div>

        <section className="space-y-8 text-sm leading-relaxed text-slate-700">
          {/* Section 1 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">1. Scope & Responsible Entity</h2>
            <p>
              This Privacy Policy applies to the <strong>Money Matters</strong> application (available via Web at <code>moneymatters.kaesava.au</code> and Android/iOS mobile targets), operated under the <strong>Kaesava</strong> software brand (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;).
            </p>
            <p>
              We comply strictly with the <strong>Australian Privacy Principles (APPs)</strong> contained in the <em>Privacy Act 1988 (Cth)</em> and the Notifiable Data Breaches (NDB) scheme.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">2. Personal & Financial Information We Collect</h2>
            <p>We collect only information necessary to deliver our forward-looking income allocation budgeting system:</p>
            <ul className="list-disc pl-6 space-y-2 text-slate-600">
              <li><strong>Account & Profile Data:</strong> Full Name, Email Address, Profile Avatar, Account ID issued by Neon Auth.</li>
              <li><strong>Household Configuration:</strong> Housing status, vehicle count, family size, school stage, pet count, and expense benchmark sliders (collected during setup to calculate baseline target caps).</li>
              <li><strong>Financial & Budgeting Data:</strong> Income amounts, payday frequencies, bank account titles/balances, expense categories, sinking fund targets, and transaction ledger notes.</li>
              <li><strong>CSV Bank Statements (User Provided):</strong> Transaction dates, descriptions, and amounts imported via bank CSV upload.</li>
              <li><strong>Device & Notification Data:</strong> Platform OS, device push tokens (Expo Push), and timezone settings.</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">3. How We Collect Data</h2>
            <p>Data is collected via:</p>
            <ul className="list-disc pl-6 space-y-1 text-slate-600">
              <li>Direct input during onboarding quiz and settings setup</li>
              <li>User-initiated CSV bank statement uploads</li>
              <li>Partner invitation workflows</li>
              <li>Automated server logs (IP address, user-agent for authentication security and rate-limiting)</li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">4. Purpose & Automated Allocation Engine</h2>
            <p>
              Your data is processed strictly to calculate your **5-Step Waterfall Cascade** (Deficit Repair → Bills Pool Top-up → Goal Savings → Discretionary Everyday Top-up → Surplus Sweep) and to deliver proactive due-date guardrail notifications. We do not perform automated credit scoring, profiling, or algorithmic lending assessments.
            </p>
          </div>

          {/* Section 5 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">5. Data Security, Isolation & Multi-Tenancy</h2>
            <p>
              We protect your data using industry-standard measures:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-600">
              <li><strong>Row Level Security (RLS):</strong> Database tables enforce PostgreSQL RLS policies at the database kernel level, strictly scoped to your household <code>tenantId</code>.</li>
              <li><strong>Encryption:</strong> Data in transit is protected using TLS 1.3. Data at rest is encrypted using standard AES-256 serverless database storage (Neon DB).</li>
              <li><strong>Zero PII Logging:</strong> Our universal logger automatically redacts emails, tokens, secrets, display names, and notes before writing logs.</li>
            </ul>
          </div>

          {/* Section 6 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">6. Sub-processors & Third-Party Service Providers</h2>
            <p>
              To operate the platform, we engage trusted infrastructure sub-processors under strict data protection terms:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg">
                <thead className="bg-slate-100 text-[#1B2B4B] font-bold">
                  <tr>
                    <th className="p-3 border-b border-slate-200">Sub-processor</th>
                    <th className="p-3 border-b border-slate-200">Purpose</th>
                    <th className="p-3 border-b border-slate-200">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-600">
                  <tr>
                    <td className="p-3 font-semibold">Neon DB</td>
                    <td className="p-3">Primary database host (PostgreSQL serverless with RLS)</td>
                    <td className="p-3">Asia-Pacific (Sydney) / AWS</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">Cloudflare Workers / OpenNext</td>
                    <td className="p-3">Edge compute, API execution & R2 file storage</td>
                    <td className="p-3">Global Edge Network</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">Resend API</td>
                    <td className="p-3">Transactional emails & partner invites</td>
                    <td className="p-3">United States</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">Inngest Cloud</td>
                    <td className="p-3">Scheduled notification workflows</td>
                    <td className="p-3">United States</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">Expo Push Service</td>
                    <td className="p-3">Mobile push notification delivery</td>
                    <td className="p-3">United States</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 7 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">7. Retention & Account Deletion (APP 12 & 13)</h2>
            <p>
              You maintain full sovereignty over your data under APPs 12 and 13:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-600">
              <li><strong>Data Access & Export:</strong> You may request a complete export of your household categories, transaction ledgers, and allocation history.</li>
              <li><strong>Right to Erasure (Account Deletion):</strong> Upon requesting account deletion via <code>info@kaesava.au</code>, all personal profiles, bank credentials, categories, and ledger entries associated with your household tenant are permanently purged within 30 days.</li>
              <li><strong>Retention:</strong> Active data is retained for the lifetime of your account. Inactive soft-deleted ledger entries are permanently purged after 90 days.</li>
            </ul>
          </div>

          {/* Section 8 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">8. Cookies & Local Storage</h2>
            <p>
              We use <code>localStorage</code> solely for managing session tokens and user preference states in the browser. We do not use third-party tracking cookies or advertising pixels.
            </p>
          </div>

          {/* Section 9 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">9. Notifiable Data Breaches (NDB Scheme)</h2>
            <p>
              In the event of an eligible data breach likely to result in serious harm, we will notify affected individuals and the Office of the Australian Information Commissioner (OAIC) in accordance with Part IIIC of the <em>Privacy Act 1988 (Cth)</em>.
            </p>
          </div>

          {/* Section 10 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">10. Inquiries, Data Governance & Complaints</h2>
            <p>
              If you have any questions, wish to exercise your privacy rights, or wish to lodge a privacy complaint, please contact our Data Governance Officer at:
            </p>
            <div className="bg-white p-4 rounded-xl border border-slate-200 inline-block font-mono text-xs text-[#2563eb] font-bold">
              info@kaesava.au
            </div>
            <p className="text-xs text-slate-500 mt-2">
              If you are dissatisfied with our response, you may lodge a complaint directly with the Office of the Australian Information Commissioner (OAIC) at <a href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer" className="text-[#2563eb] underline">www.oaic.gov.au</a>.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500 mt-12">
        <div className="max-w-4xl mx-auto px-6 flex justify-between items-center">
          <span>© 2026 Kaesava. All rights reserved.</span>
          <Link href="/" className="text-[#2563eb] font-semibold hover:underline">
            Return to Money Matters
          </Link>
        </div>
      </footer>
    </div>
  );
}
