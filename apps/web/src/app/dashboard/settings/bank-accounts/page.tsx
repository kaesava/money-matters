"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../../lib/trpc";
import { DashboardError } from "../../../../components/web/DashboardError";

function fmt(val: string | number) {
  const num = typeof val === "string" ? parseFloat(val) : val;
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function BankAccountsPage() {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState<"INCOME_LANDING" | "SAVINGS" | "EVERYDAY">("INCOME_LANDING");
  const [isOffset, setIsOffset] = useState(false);
  const [adding, setAdding] = useState(false);

  const bankAccountsQuery = trpc.listBankAccounts.useQuery();
  const createBankAccountMutation = trpc.createBankAccount.useMutation({
    onSuccess: () => {
      setShowAddModal(false);
      setName("");
      setPurpose("INCOME_LANDING");
      setIsOffset(false);
      bankAccountsQuery.refetch();
    },
  });

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    try {
      await createBankAccountMutation.mutateAsync({
        name: name.trim(),
        purpose: [purpose],
        isOffset,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const accounts = bankAccountsQuery.data ?? [];

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push("/dashboard/settings")}
            className="text-xs font-bold text-zinc-500 hover:text-zinc-700 mb-1 flex items-center gap-1"
          >
            ← Settings
          </button>
          <h1 className="text-2xl font-bold text-[#1B2B4B]">
            Bank Accounts
          </h1>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#00B4A6] hover:opacity-90 active:scale-95 shadow-sm"
        >
          + Add Account
        </button>
      </div>

      {bankAccountsQuery.isLoading ? (
        <div className="h-48 rounded-2xl animate-pulse bg-zinc-200/50" />
      ) : accounts.length === 0 ? (
        <div className="p-8 rounded-2xl bg-white border border-zinc-100 text-center text-sm font-semibold text-zinc-400">
          No bank accounts registered yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {accounts.map((acc: any) => (
            <div
              key={acc.id}
              className="p-5 rounded-2xl bg-white border border-zinc-100 shadow-sm flex items-center justify-between"
            >
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#00B4A6]">
                  {acc.purpose} {acc.isOffset ? "• Offset" : ""}
                </span>
                <h3 className="text-base font-bold text-[#1B2B4B]">{acc.name}</h3>
              </div>
              <span className="text-sm font-bold text-zinc-400">
                Verified
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Add Bank Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative pointer-events-auto w-full max-w-md bg-white shadow-2xl rounded-2xl border border-zinc-200 p-6 flex flex-col gap-4 z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#1B2B4B]">Add Bank Account</h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-zinc-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddAccount} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">Account Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CBA Everyday Account"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[--dash-teal]"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">Purpose / Tag</label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[--dash-teal]"
                >
                  <option value="INCOME_LANDING">INCOME LANDING (Salary landing spot)</option>
                  <option value="SAVINGS">SAVINGS (Regular bills & Goal targets)</option>
                  <option value="EVERYDAY">EVERYDAY (Discretionary pool)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  id="isOffset"
                  checked={isOffset}
                  onChange={(e) => setIsOffset(e.target.checked)}
                  className="w-4 h-4 rounded text-[#00B4A6] focus:ring-[#00B4A6]"
                />
                <label htmlFor="isOffset" className="text-xs font-bold text-zinc-600 select-none">
                  Is this account an Offset account?
                </label>
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#00B4A6] hover:opacity-90 disabled:opacity-50"
                >
                  {adding ? "Adding..." : "Add Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
