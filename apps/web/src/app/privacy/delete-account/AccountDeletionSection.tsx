"use client";

import React, { useState } from "react";
import Link from "next/link";
import { trpc } from "../../../lib/trpc";
import { authClient } from "../../../lib/auth";
import { Spinner } from "@money-matters/ui/web";

export function AccountDeletionSection() {
  const { data: session } = authClient.useSession();
  const [downloaded, setDownloaded] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [typedConfirmation, setTypedConfirmation] = useState("");
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

  const isInputValid = confirmed && typedConfirmation.trim().toUpperCase() === "DELETE MY HOUSEHOLD";

  const handleDelete = async () => {
    if (!isInputValid) return;
    setIsDeleting(true);
    setMessage(null);
    try {
      await deleteMutation.mutateAsync();
      setMessage("Your account and all associated data have been permanently deleted.");
      setTimeout(async () => {
        await authClient.signOut();
        window.location.href = "/";
      }, 2000);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to delete account. Please try again.";
      setMessage(errorMsg);
      setIsDeleting(false);
    }
  };

  return (
    <section className="p-6 bg-white border border-red-200 rounded-2xl shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#ba1a1a]">Instant Account Erasure</h2>
        <Link
          href="/dashboard/settings"
          className="text-xs font-bold text-[#2563eb] hover:underline"
        >
          ← Back to Settings
        </Link>
      </div>
      <p className="text-sm text-slate-600">
        You are currently signed in as <strong>{session.user.email}</strong>. You can export your data and permanently delete your account immediately.
      </p>

      {/* Step 1: Download data */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
        <h3 className="text-sm font-bold text-[#1B2B4B]">Step 1: Export financial data (optional)</h3>
        <p className="text-xs text-slate-600">
          Save a complete copy of your budget categories, income, expenses, transactions, and bank accounts to your local device before deletion.
        </p>
        <button
          onClick={handleDownload}
          disabled={exportQuery.isFetching}
          className="px-4 py-2 bg-[#2563eb] text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-1.5"
        >
          {exportQuery.isFetching && <Spinner size="sm" />}
          {downloaded ? "✓ Data Downloaded (Click to re-download)" : "📥 Export My Data"}
        </button>
      </div>

      {/* Step 2: Confirm & Delete */}
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
        <h3 className="text-sm font-bold text-[#ba1a1a]">Step 2: Confirm Permanent Erasure</h3>
        <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-700 font-medium">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 rounded text-red-600 focus:ring-red-500"
          />
          <span>
            I understand that deleting my account will permanently erase all my household budgets, transactions, income records, and account details.
          </span>
        </label>

        {confirmed && (
          <div className="space-y-1.5 pt-1">
            <p className="text-xs font-bold text-slate-700">
              Type <code className="bg-red-100 px-1 py-0.5 rounded text-red-800 font-mono">DELETE MY HOUSEHOLD</code> to confirm:
            </p>
            <input
              type="text"
              value={typedConfirmation}
              onChange={(e) => setTypedConfirmation(e.target.value)}
              placeholder="DELETE MY HOUSEHOLD"
              className="w-full px-3 py-2 text-xs font-mono border border-red-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        )}

        {message && (
          <div className="p-3 bg-white border border-red-300 text-red-800 text-xs font-semibold rounded-lg">
            {message}
          </div>
        )}

        <button
          onClick={handleDelete}
          disabled={!isInputValid || isDeleting}
          className="w-full py-2.5 bg-[#ba1a1a] text-white text-xs font-bold rounded-lg hover:bg-red-800 transition-colors disabled:opacity-50 shadow-sm flex items-center justify-center gap-1.5"
        >
          {isDeleting && <Spinner size="sm" />}
          Permanently Delete My Account Now
        </button>
      </div>
    </section>
  );
}
