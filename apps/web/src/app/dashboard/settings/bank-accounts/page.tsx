"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@money-matters/ui";

/** Web Bank Accounts management page */
export default function BankAccountsPage() {
  const router = useRouter();
  const bankAccountsQuery = trpc.getBankAccountsWithMappings.useQuery();
  const updateMappingsMut = trpc.updateBankAccountMappings.useMutation({
    onSuccess: () => bankAccountsQuery.refetch(),
  });
  const createAccountMut = trpc.createBankAccount.useMutation({
    onSuccess: () => {
      bankAccountsQuery.refetch();
      setNewAccountName("");
      setNewAccountBalance("0.00");
      setShowAddModal(false);
    },
  });
  const archiveAccountMut = trpc.archiveBankAccount.useMutation({
    onSuccess: () => {
      bankAccountsQuery.refetch();
      setErrorMsg(null);
    },
    onError: (err: { message: string }) => {
      setErrorMsg(err.message);
    },
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountBalance, setNewAccountBalance] = useState("0.00");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (bankAccountsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const accounts = bankAccountsQuery.data || [];

  const handleCategoryTypeChange = (type: "EVERYDAY" | "REGULAR" | "GOAL", targetAccountId: string) => {
    const currentMappings = [
      { categoryType: "EVERYDAY" as const, bankAccountId: accounts.find((a: { categoryTypes: string[]; id: string }) => a.categoryTypes.includes("EVERYDAY"))?.id || accounts[0]?.id },
      { categoryType: "REGULAR" as const, bankAccountId: accounts.find((a: { categoryTypes: string[]; id: string }) => a.categoryTypes.includes("REGULAR"))?.id || accounts[0]?.id },
      { categoryType: "GOAL" as const, bankAccountId: accounts.find((a: { categoryTypes: string[]; id: string }) => a.categoryTypes.includes("GOAL"))?.id || accounts[0]?.id },
    ];

    const updated = currentMappings.map((m) =>
      m.categoryType === type ? { ...m, bankAccountId: targetAccountId } : m
    );

    updateMappingsMut.mutate({ mappings: updated });
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountName.trim()) return;
    createAccountMut.mutate({
      name: newAccountName.trim(),
      lastKnownBalance: newAccountBalance.trim() || "0.00",
      unbudgetedBuffer: "0.00",
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/settings")}
          className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-[#1B2B4B]">
          {t("settings.bankAccounts.title")}
        </h1>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {/* Category Type Mapping Matrix Card */}
      <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-sm flex flex-col gap-4">
        <div>
          <h2 className="text-base font-bold text-[#1B2B4B]">
            {t("settings.bankAccounts.linkedTypes")}
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {t("settings.bankAccounts.linkedTypesDesc")}
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          {[
            { key: "EVERYDAY" as const, label: t("settings.bankAccounts.everyday"), color: "#10B981" },
            { key: "REGULAR" as const, label: t("settings.bankAccounts.regular"), color: "#3B82F6" },
            { key: "GOAL" as const, label: t("settings.bankAccounts.goal"), color: "#6366F1" },
          ].map((typeItem) => {
            const currentAcc = accounts.find((a: { categoryTypes: string[]; id: string }) => a.categoryTypes.includes(typeItem.key));
            return (
              <div
                key={typeItem.key}
                className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-100 bg-zinc-50/50"
              >
                <span className="text-xs font-bold" style={{ color: typeItem.color }}>
                  {typeItem.label}
                </span>
                <select
                  value={currentAcc?.id || ""}
                  onChange={(e) => handleCategoryTypeChange(typeItem.key, e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200 bg-white text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                >
                  {accounts.map((acc: { id: string; name: string; lastKnownBalance?: string }) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (${parseFloat(acc.lastKnownBalance || "0").toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        {/* Unbudgeted Buffer Explanatory Popover */}
        <div className="mt-2 p-3.5 rounded-xl border border-blue-100 bg-blue-50/50 flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
            ⓘ
          </div>
          <div className="text-xs text-blue-950 space-y-1">
            <p className="font-bold">What is the Unbudgeted Buffer?</p>
            <p className="text-zinc-600 leading-relaxed">
              Unbudgeted Buffer reserves a fixed dollar cushion directly in your account that is isolated from your spendable Everyday pool. This ensures emergency minimum balance protection before waterfall payday allocation.
            </p>
          </div>
        </div>
      </div>


      {/* Bank Accounts List */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
          Your Accounts ({accounts.length})
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 text-xs font-bold text-white rounded-lg bg-[#2563eb] hover:bg-blue-700 transition-colors"
        >
          + {t("settings.bankAccounts.addAccount")}
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {accounts.map((acc: { id: string; name: string; lastKnownBalance?: string; categoryTypes: string[] }) => (
          <div
            key={acc.id}
            className="p-4 rounded-xl bg-white border border-zinc-200 flex items-center justify-between shadow-xs"
          >
            <div>
              <p className="text-sm font-bold text-[#1B2B4B]">{acc.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold text-emerald-600">
                  ${parseFloat(acc.lastKnownBalance || "0").toFixed(2)}
                </span>
                {acc.categoryTypes.length > 0 && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                    {acc.categoryTypes.join(", ")}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => archiveAccountMut.mutate({ accountId: acc.id })}
              className="p-2 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              title="Delete account"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleCreateAccount}
            className="bg-white rounded-2xl p-6 max-w-sm w-full flex flex-col gap-4 shadow-xl border border-zinc-100"
          >
            <h3 className="text-lg font-bold text-[#1B2B4B]">
              {t("settings.bankAccounts.addAccount")}
            </h3>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-zinc-700">
                {t("settings.bankAccounts.accountName")}
              </label>
              <input
                type="text"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                placeholder={t("settings.bankAccounts.accountNamePlaceholder")}
                className="px-3 py-2 text-sm font-medium rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-zinc-700">
                {t("settings.bankAccounts.initialBalance")}
              </label>
              <input
                type="number"
                step="0.01"
                value={newAccountBalance}
                onChange={(e) => setNewAccountBalance(e.target.value)}
                className="px-3 py-2 text-sm font-medium rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 rounded-xl hover:bg-zinc-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createAccountMut.isPending}
                className="px-4 py-2 text-xs font-bold text-white rounded-xl bg-[#2563eb] hover:bg-blue-700 disabled:opacity-50"
              >
                {createAccountMut.isPending ? "Creating..." : "Create Account"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
