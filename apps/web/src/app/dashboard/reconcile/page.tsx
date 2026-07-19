"use client";
import React, { useState } from "react";
import { trpc } from "../../../lib/trpc";
import { DashboardError } from "../../../components/web/DashboardError";

export default function ReconciliationPage() {
  const { data: tenant, isLoading: loadingTenant, error: tenantError, refetch: refetchTenant } = trpc.getTenant.useQuery();
  const { data: categories = [], isLoading: loadingCats, error: catsError, refetch: refetchCats } = trpc.listCategories.useQuery();

  const submitReconciliation = trpc.submitReconciliation.useMutation();

  const [balances, setBalances] = useState<Record<string, string>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [successStates, setSuccessStates] = useState<Record<string, string>>({});

  const isLoading = loadingTenant || loadingCats;
  const error = tenantError || catsError;

  const handleReconcile = async (accountId: string) => {
    const balanceVal = balances[accountId];
    if (!balanceVal) return;

    const actual = parseFloat(balanceVal);
    if (isNaN(actual) || actual < 0) return;

    setLoadingStates((prev) => ({ ...prev, [accountId]: true }));
    setSuccessStates((prev) => ({ ...prev, [accountId]: "" }));

    try {
      const res = await submitReconciliation.mutateAsync({
        bankAccountId: accountId,
        actualBalance: actual.toFixed(2),
      });

      setSuccessStates((prev) => ({
        ...prev,
        [accountId]: `Successfully reconciled. Delta: $${res.delta}`,
      }));
      refetchTenant();
      refetchCats();
    } catch (err) {
      console.error("Reconciliation failed:", err);
    } finally {
      setLoadingStates((prev) => ({ ...prev, [accountId]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[45vh]">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--dash-teal)" }} />
      </div>
    );
  }

  if (error) {
    return <DashboardError error={error} onRetry={() => { refetchTenant(); refetchCats(); }} />;
  }

  const bankAccounts = tenant?.bankAccounts ?? [];

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">
          Audit & Reconciliation
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#1B2B4B]">
          Savings Reconciliation
        </h1>
        <p className="text-sm text-zinc-500 max-w-xl">
          Align your real-world bank account balances with your virtual category buckets to keep your budget 100% accurate.
        </p>
      </div>

      {bankAccounts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center bg-white rounded-2xl border border-zinc-100 shadow-sm">
          <span className="text-4xl">🏦</span>
          <p className="text-sm font-semibold text-zinc-700">No bank accounts registered</p>
          <p className="text-xs text-zinc-400">Please add bank accounts in settings to start reconciling.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {bankAccounts.map((account) => {
            // Find categories mapped to this bank account
            const mappedCats = categories.filter((c) => c.bankAccountId === account.id);
            const expectedBalance = mappedCats.reduce((sum, c) => sum + parseFloat(c.currentBalance), 0);
            
            const actualVal = balances[account.id] ?? account.lastKnownBalance;
            const actualBalance = parseFloat(actualVal) || 0;
            const delta = actualBalance - expectedBalance;

            const isSaving = loadingStates[account.id];
            const successMsg = successStates[account.id];

            return (
              <div
                key={account.id}
                className="bg-white rounded-3xl border border-zinc-100 shadow-md p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center relative overflow-hidden group hover:shadow-lg transition-all duration-300"
              >
                {/* Account Details & Mapped Categories */}
                <div className="flex-1 flex flex-col gap-4">
                  <div>
                    <span className="px-2 py-1 text-[10px] font-extrabold uppercase rounded bg-zinc-100 text-zinc-500 tracking-wider">
                      {account.purpose.join(" / ")}
                    </span>
                    <h3 className="text-lg font-black text-[#1B2B4B] mt-2">{account.name}</h3>
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-bold text-zinc-400 uppercase">Mapped Categories ({mappedCats.length})</p>
                    {mappedCats.length === 0 ? (
                      <p className="text-xs text-zinc-400 italic">No categories mapped to this account.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {mappedCats.map((cat) => (
                          <span
                            key={cat.id}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-zinc-50 border border-zinc-100 rounded-lg text-zinc-600 flex items-center gap-1.5"
                          >
                            <span className="text-xs">{cat.icon || "📂"}</span>
                            {cat.name} (${parseFloat(cat.currentBalance).toFixed(2)})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Audit Form & Delta */}
                <div className="w-full md:w-80 bg-zinc-50 border border-zinc-100 rounded-2xl p-5 flex flex-col gap-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-semibold">Expected Balance</span>
                    <span className="font-extrabold text-[#1B2B4B]">${expectedBalance.toFixed(2)}</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold text-zinc-400 uppercase">Actual Bank Balance</label>
                    <input
                      type="number"
                      step="0.01"
                      value={balances[account.id] !== undefined ? balances[account.id] : account.lastKnownBalance}
                      onChange={(e) => setBalances({ ...balances, [account.id]: e.target.value })}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-[#00B4A6] bg-white transition-colors"
                    />
                  </div>

                  <div className="flex justify-between items-center text-xs pt-2 border-t border-zinc-200/60">
                    <span className="text-zinc-500 font-semibold">Difference (Delta)</span>
                    <span className={`font-black ${delta === 0 ? "text-emerald-600" : "text-rose-500"}`}>
                      {delta >= 0 ? `+$${delta.toFixed(2)}` : `-$${Math.abs(delta).toFixed(2)}`}
                    </span>
                  </div>

                  <button
                    onClick={() => handleReconcile(account.id)}
                    disabled={isSaving}
                    style={{ backgroundColor: "var(--dash-teal)" }}
                    className="w-full text-white py-2.5 rounded-xl font-extrabold text-xs hover:opacity-90 transition-opacity active:scale-[0.99] disabled:opacity-50"
                  >
                    {isSaving ? "Reconciling..." : "Save Audit & Update"}
                  </button>

                  {successMsg && (
                    <p className="text-[11px] font-bold text-emerald-600 text-center animate-fade-in">
                      {successMsg}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
