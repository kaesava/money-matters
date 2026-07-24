"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../../../lib/trpc";

export default function BankAccountsPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [showModal, setShowModal] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<any>(null);
  const [name, setName] = useState("");
  const [unbudgetedBuffer, setUnbudgetedBuffer] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery();
  const accounts = bankAccountsQuery.data ?? [];

  const createBankAccountMut = trpc.createBankAccount.useMutation();
  const updateBankAccountMut = trpc.updateBankAccount.useMutation();
  const archiveBankAccountMut = trpc.archiveBankAccount.useMutation();

  const handleOpenCreate = () => {
    setAccountToEdit(null);
    setName("");
    setUnbudgetedBuffer("0.00");
    setShowModal(true);
  };

  const handleOpenEdit = (acc: any) => {
    setAccountToEdit(acc);
    setName(acc.name);
    setUnbudgetedBuffer(acc.unbudgetedBuffer || "0.00");
    setShowModal(true);
  };

  const handleArchive = async (acc: any) => {
    if (confirm(`Are you sure you want to archive bank account "${acc.name}"?`)) {
      try {
        await archiveBankAccountMut.mutateAsync({ accountId: acc.id });
        await utils.listBankAccountsWithExpected.invalidate();
      } catch (err: any) {
        alert(err.message || "Failed to archive bank account.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      if (accountToEdit) {
        await updateBankAccountMut.mutateAsync({
          accountId: accountToEdit.id,
          data: {
            name: name.trim(),
            unbudgetedBuffer: (parseFloat(unbudgetedBuffer) || 0).toFixed(2),
          },
        });
      } else {
        await createBankAccountMut.mutateAsync({
          name: name.trim(),
          unbudgetedBuffer: (parseFloat(unbudgetedBuffer) || 0).toFixed(2),
        });
      }
      await utils.listBankAccountsWithExpected.invalidate();
      setShowModal(false);
    } catch (err: any) {
      alert(err.message || "Failed to save bank account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push("/dashboard/settings")}
            className="text-xs font-bold text-zinc-500 hover:text-zinc-700 mb-1 flex items-center gap-1"
          >
            ← Settings
          </button>
          <h1 className="text-2xl font-black text-[#1B2B4B]">
            Bank Accounts & Reconciliation
          </h1>
          <p className="text-xs text-zinc-500 font-semibold mt-0.5">
            Configure bank accounts and unbudgeted buffer reserves for statement reconciliation.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#00B4A6] hover:opacity-90 active:scale-95 shadow-sm"
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
          {accounts.map((acc: any) => {
            const actualNum = parseFloat(acc.lastKnownBalance || "0");
            const expectedNum = parseFloat(acc.expectedBalance || "0");
            const bufferNum = parseFloat(acc.unbudgetedBuffer || "0");

            return (
              <div
                key={acc.id}
                className="p-5 rounded-2xl bg-white border border-zinc-100 shadow-sm flex items-center justify-between"
              >
                <div className="flex flex-col gap-1">
                  <h3 className="text-base font-extrabold text-[#1B2B4B]">{acc.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span>Balance: <strong>${actualNum.toFixed(2)}</strong></span>
                    <span>Expected: <strong>${expectedNum.toFixed(2)}</strong></span>
                    {bufferNum > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-teal-50 text-[#00B4A6] font-bold text-[10px]">
                        Buffer: +${bufferNum.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(acc)}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleArchive(acc)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50"
                  >
                    Archive
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Shared Add/Edit Bank Account Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity"
            onClick={() => setShowModal(false)}
          />
          <div className="relative pointer-events-auto w-full max-w-md bg-white shadow-2xl rounded-2xl border border-zinc-200 p-6 flex flex-col gap-4 z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#1B2B4B]">
                {accountToEdit ? `Edit Bank Account: ${accountToEdit.name}` : "Add Bank Account"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">Account Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Westpac Choice Account"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">Unbudgeted Buffer ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={unbudgetedBuffer}
                  onChange={(e) => setUnbudgetedBuffer(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                />
                <p className="text-[10px] text-zinc-400 mt-1">
                  Unbudgeted lump sums held in this account that are not allocated to budget categories.
                </p>
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#00B4A6] hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : accountToEdit ? "Save Changes" : "Add Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
