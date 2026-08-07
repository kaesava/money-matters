"use client";

import React, { useState } from "react";
import { trpc } from "../../../lib/trpc";
import { authClient } from "../../../lib/auth";

export function AccountDeletionSection() {
  const { data: session } = authClient.useSession();
  const [downloaded, setDownloaded] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const exportQuery = trpc.exportMyData.useQuery(undefined, { enabled: false });
  const deleteMutation = trpc.deleteMyAccount.useMutation();

  if (!session?.user) {
    return null;
  }

  const handleDownload = async () => {
    const { data } = await exportQuery.refetch();
    if (data) {
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `money-matters-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloaded(true);
    }
  };

  const handleDelete = async () => {
    if (!confirmed) return;
    setIsDeleting(true);
    setMessage(null);
    try {
      await deleteMutation.mutateAsync();
      setMessage("Your account and all associated data have been permanently deleted.");
      setTimeout(async () => {
        await authClient.signOut();
        window.location.href = "/";
      }, 2000);
    } catch (err: any) {
      setMessage(err?.message || "Failed to delete account. Please try again or contact privacy@kaesava.au.");
      setIsDeleting(false);
    }
  };

  return (
    <section className="p-6 bg-white border border-red-200 rounded-2xl shadow-sm space-y-4">
      <h2 className="text-xl font-bold text-[#ba1a1a]">Instant Self-Service Deletion</h2>
      <p className="text-sm text-slate-600">
        You are currently signed in as <strong>{session.user.email}</strong>. You can download a copy of your financial data and delete your account immediately below.
      </p>

      {/* Step 1: Download data */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
        <h3 className="text-sm font-bold text-[#1B2B4B]">Step 1: Download your financial data (optional)</h3>
        <p className="text-xs text-slate-600">
          Save a complete JSON copy of your budget categories, income, expenses, transactions, and bank accounts to your local device.
        </p>
        <button
          onClick={handleDownload}
          className="px-4 py-2 bg-[#2563eb] text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          {downloaded ? "✓ Data Downloaded (Click to re-download)" : "📥 Download My Data"}
        </button>
      </div>

      {/* Step 2: Confirm & Delete */}
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
        <h3 className="text-sm font-bold text-[#ba1a1a]">Step 2: Confirm Permanent Deletion</h3>
        <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-700 font-medium">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 rounded text-red-600 focus:ring-red-500"
          />
          <span>
            I understand that deleting my account will permanently and irreversibly erase all my household budgets, transactions, income records, and account details.
          </span>
        </label>

        {message && (
          <div className="p-3 bg-white border border-red-300 text-red-800 text-xs font-semibold rounded-lg">
            {message}
          </div>
        )}

        <button
          onClick={handleDelete}
          disabled={!confirmed || isDeleting}
          className="w-full py-2.5 bg-[#ba1a1a] text-white text-xs font-bold rounded-lg hover:bg-red-800 transition-colors disabled:opacity-50 shadow-sm"
        >
          {isDeleting ? "Deleting Account..." : "🗑️ Permanently Delete My Account Now"}
        </button>
      </div>
    </section>
  );
}
