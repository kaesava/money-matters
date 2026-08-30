"use client";

import React, { useState } from "react";
import { trpc } from "../../../lib/trpc";
import { t } from "@money-matters/i18n";
import { useToast } from "@money-matters/ui/web";
import { BankAccountFormModal } from "../../dashboard/bank-accounts/components/BankAccountFormModal";

interface BankAccount {
  id: string;
  name: string;
  bankProvider?: string | null;
  lastKnownBalance: string;
  unbudgetedBuffer?: string | null;
  isPrivate?: boolean;
  categoryTypes?: string[];
  poolTypes?: string[];
}

interface SetupBankAccountsStepProps {
  accounts?: BankAccount[];
  onNext: () => void;
  onBack: () => void;
}

type BankName = "CBA" | "Westpac" | "ANZ" | "NAB" | "ING" | "Macquarie" | "Other";
type CategoryType = "EVERYDAY" | "REGULAR" | "GOAL";

const BANK_OPTIONS: Array<{ key: BankName; label: string; logoBg: string; textColor: string }> = [
  { key: "CBA", label: "Commonwealth Bank", logoBg: "bg-amber-400", textColor: "text-slate-900" },
  { key: "NAB", label: "National Australia Bank", logoBg: "bg-rose-600", textColor: "text-white" },
  { key: "ANZ", label: "ANZ Bank", logoBg: "bg-blue-600", textColor: "text-white" },
  { key: "Westpac", label: "Westpac", logoBg: "bg-red-700", textColor: "text-white" },
  { key: "ING", label: "ING Australia", logoBg: "bg-orange-500", textColor: "text-white" },
  { key: "Macquarie", label: "Macquarie Bank", logoBg: "bg-slate-900", textColor: "text-white" },
  { key: "Other", label: "Other Financial Institution", logoBg: "bg-slate-500", textColor: "text-white" },
];

function fmtMoney(val: string | number | undefined | null): string {
  const num = typeof val === "string" ? parseFloat(val) : typeof val === "number" ? val : 0;
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function SetupBankAccountsStep({ accounts, onNext, onBack }: SetupBankAccountsStepProps) {
  const toast = useToast();
  const utils = trpc.useUtils();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<{ id: string; name: string } | null>(null);
  const [accName, setAccName] = useState("");
  const [accBankProvider, setAccBankProvider] = useState<BankName>("CBA");
  const [accBalance, setAccBalance] = useState("1000.00");
  const [accBuffer, setAccBuffer] = useState("0.00");
  const [accIsPrivate, setAccIsPrivate] = useState(false);
  const [accSelectedTypes, setAccSelectedTypes] = useState<CategoryType[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const createAccountMut = trpc.createBankAccount.useMutation({
    onSuccess: () => {
      utils.getBankAccountsWithMappings.invalidate();
      closeModal();
      toast.success("Bank account created.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save bank account.");
      setIsSaving(false);
    },
  });

  const updateAccountMut = trpc.updateBankAccount.useMutation({
    onSuccess: () => {
      utils.getBankAccountsWithMappings.invalidate();
      closeModal();
      toast.success("Bank account updated.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update bank account.");
      setIsSaving(false);
    },
  });

  const archiveAccountMut = trpc.archiveBankAccount.useMutation({
    onSuccess: () => {
      utils.getBankAccountsWithMappings.invalidate();
      closeModal();
      toast.success("Bank account removed.");
    },
    onError: (err) => {
      toast.error(err.message || "Cannot delete bank account.");
    },
  });

  const openAddModal = () => {
    setEditingAccount(null);
    setAccName("");
    setAccBankProvider("CBA");
    setAccBalance("1000.00");
    setAccBuffer("0.00");
    setAccIsPrivate(false);
    setAccSelectedTypes([]);
    setIsModalOpen(true);
  };

  const openEditModal = (acc: BankAccount) => {
    setEditingAccount({ id: acc.id, name: acc.name });
    setAccName(acc.name);
    setAccBankProvider((acc.bankProvider as BankName) || "Other");
    setAccBalance(acc.lastKnownBalance || "0.00");
    setAccBuffer(acc.unbudgetedBuffer || "0.00");
    setAccIsPrivate(acc.isPrivate ?? false);
    setAccSelectedTypes(((acc.poolTypes || acc.categoryTypes) as CategoryType[]) || []);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
    setIsSaving(false);
  };

  const handleCategoryTypeToggle = (type: CategoryType) => {
    setAccSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) {
      toast.error("Account name is required.");
      return;
    }

    setIsSaving(true);

    if (editingAccount) {
      updateAccountMut.mutate({
        accountId: editingAccount.id,
        data: {
          name: accName.trim(),
          bankProvider: accBankProvider,
          lastKnownBalance: accBalance,
          unbudgetedBuffer: accBuffer,
          isPrivate: accIsPrivate,
        },
      });
    } else {
      createAccountMut.mutate({
        name: accName.trim(),
        bankProvider: accBankProvider,
        lastKnownBalance: accBalance,
        unbudgetedBuffer: accBuffer,
        isPrivate: accIsPrivate,
      });
    }
  };

  const handleArchive = async () => {
    if (!editingAccount) return;
    if (confirm(`Remove bank account "${editingAccount.name}"?`)) {
      archiveAccountMut.mutate({ accountId: editingAccount.id });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-black text-[#1B2B4B] tracking-tight">
            {t("setup.bankAccountsStep.title")}
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {t("setup.bankAccountsStep.subtitle")}
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="px-4 py-2 bg-[#2563eb] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <span>➕</span>
          <span>{t("setup.bankAccountsStep.addAccount")}</span>
        </button>
      </div>

      {/* Bank Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(accounts || []).map((acc) => {
          const providerOpt = BANK_OPTIONS.find((b) => b.key === acc.bankProvider) || {
            label: acc.bankProvider || "Bank",
            logoBg: "bg-slate-500",
            textColor: "text-white",
          };

          const poolTypes = ((acc.poolTypes || acc.categoryTypes) as CategoryType[]) || [];

          return (
            <div
              key={acc.id}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-4 hover:border-slate-300 transition-all shadow-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl ${providerOpt.logoBg} ${providerOpt.textColor} flex items-center justify-center font-black text-xs shadow-xs shrink-0`}
                  >
                    {acc.bankProvider ? acc.bankProvider.slice(0, 3).toUpperCase() : "BNK"}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#1B2B4B]">{acc.name}</h3>
                    <p className="text-[11px] font-bold text-slate-400">{providerOpt.label}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openEditModal(acc)}
                  className="px-2.5 py-1 text-xs font-extrabold text-[#2563eb] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                >
                  {t("setup.bankAccountsStep.edit")}
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">{t("setup.bankAccountsStep.balance")}</span>
                  <span className="text-sm font-black text-[#1B2B4B]">
                    {fmtMoney(acc.lastKnownBalance)}
                  </span>
                </div>

                <div className="flex items-center gap-1 flex-wrap justify-end">
                  {poolTypes.includes("EVERYDAY") && (
                    <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded-md">
                      Everyday
                    </span>
                  )}
                  {poolTypes.includes("REGULAR") && (
                    <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 rounded-md">
                      Bills
                    </span>
                  )}
                  {poolTypes.includes("GOAL") && (
                    <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 rounded-md">
                      Goals
                    </span>
                  )}
                  {poolTypes.length === 0 && (
                    <span className="px-2 py-0.5 text-[9px] font-bold text-slate-400 bg-slate-100 rounded-md">
                      {t("setup.bankAccountsStep.unlinked")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl transition-colors cursor-pointer"
        >
          {t("setup.bankAccountsStep.backIncome")}
        </button>

        <button
          type="button"
          onClick={onNext}
          className="px-6 py-2.5 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
        >
          <span>{t("setup.bankAccountsStep.nextGoals")}</span>
        </button>
      </div>

      <BankAccountFormModal
        isOpen={isModalOpen}
        editingAccount={editingAccount}
        accName={accName}
        setAccName={setAccName}
        accBankProvider={accBankProvider}
        setAccBankProvider={setAccBankProvider}
        accBalance={accBalance}
        setAccBalance={setAccBalance}
        accBuffer={accBuffer}
        setAccBuffer={setAccBuffer}
        accIsPrivate={accIsPrivate}
        setAccIsPrivate={setAccIsPrivate}
        accSelectedTypes={accSelectedTypes}
        accounts={(accounts || []).map((a) => ({
          id: a.id,
          name: a.name,
          categoryTypes: ((a.poolTypes || a.categoryTypes) as CategoryType[]) || [],
        }))}
        isTrialExpired={false}
        isSaving={isSaving}
        bankOptions={BANK_OPTIONS}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onCategoryTypeToggle={handleCategoryTypeToggle}
        fmtMoney={fmtMoney}
        onArchive={editingAccount ? handleArchive : undefined}
      />
    </div>
  );
}
