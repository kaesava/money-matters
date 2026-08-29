"use client";

import React, { useState } from "react";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../lib/trpc";
import { InfoTooltip, useToast } from "@money-matters/ui/web";
import { BankAccountFormModal } from "../../dashboard/bank-accounts/components/BankAccountFormModal";

type BankName = "CBA" | "Westpac" | "ANZ" | "NAB" | "ING" | "Macquarie" | "Other";
type CategoryType = "EVERYDAY" | "REGULAR" | "GOAL";

const BANK_OPTIONS: Array<{ key: BankName; label: string; logoBg: string; textColor: string }> = [
  { key: "CBA", label: "Commonwealth Bank (CBA)", logoBg: "bg-amber-400", textColor: "text-zinc-950" },
  { key: "Westpac", label: "Westpac", logoBg: "bg-red-600", textColor: "text-white" },
  { key: "ANZ", label: "ANZ", logoBg: "bg-blue-600", textColor: "text-white" },
  { key: "NAB", label: "NAB", logoBg: "bg-red-700", textColor: "text-white" },
  { key: "ING", label: "ING", logoBg: "bg-orange-500", textColor: "text-white" },
  { key: "Macquarie", label: "Macquarie", logoBg: "bg-zinc-800", textColor: "text-white" },
  { key: "Other", label: "Other / Custom Bank", logoBg: "bg-slate-500", textColor: "text-white" },
];

export interface SetupBankAccountsStepProps {
  onBack: () => void;
  onNext: () => void;
  showIcons?: boolean;
}

export function SetupBankAccountsStep({
  onBack,
  onNext,
  showIcons = true,
}: SetupBankAccountsStepProps) {
  const toast = useToast();
  const bankAccountsQuery = trpc.getBankAccountsWithMappings.useQuery();
  const utils = trpc.useUtils();

  const accounts = bankAccountsQuery.data ?? [];

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<{ id: string; name: string } | null>(null);
  const [accName, setAccName] = useState("");
  const [accBankProvider, setAccBankProvider] = useState<BankName>("Other");
  const [accBalance, setAccBalance] = useState("0.00");
  const [accBuffer, setAccBuffer] = useState("0.00");
  const [accIsPrivate, setAccIsPrivate] = useState(false);
  const [accSelectedTypes, setAccSelectedTypes] = useState<CategoryType[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const createAccountMut = trpc.createBankAccount.useMutation({
    onSuccess: () => {
      utils.getBankAccountsWithMappings.invalidate();
      closeModal();
      toast.success("Bank account added successfully.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create bank account.");
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

  const updateMappingsMut = trpc.updateBankAccountMappings.useMutation({
    onSuccess: () => {
      utils.getBankAccountsWithMappings.invalidate();
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

  const openEditModal = (acc: (typeof accounts)[number]) => {
    setEditingAccount({ id: acc.id, name: acc.name });
    setAccName(acc.name);
    setAccBankProvider((acc.bankProvider as BankName) || "Other");
    setAccBalance(acc.lastKnownBalance || "0.00");
    setAccBuffer(acc.unbudgetedBuffer || "0.00");
    setAccIsPrivate(acc.isPrivate ?? false);
    setAccSelectedTypes((acc.categoryTypes as CategoryType[]) || []);
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
      toast.warning("Please enter an account name.");
      return;
    }
    setIsSaving(true);

    if (editingAccount) {
      // Update account details & pool mappings
      await updateAccountMut.mutateAsync({
        accountId: editingAccount.id,
        data: {
          name: accName.trim(),
          bankProvider: accBankProvider,
          lastKnownBalance: accBalance,
          unbudgetedBuffer: accBuffer,
          isPrivate: accIsPrivate,
        },
      });

      // Update pool routing mappings if changed
      if (accSelectedTypes.length > 0) {
        const mappingsToUpdate = accSelectedTypes.map((catType) => ({
          categoryType: catType,
          bankAccountId: editingAccount.id,
        }));
        await updateMappingsMut.mutateAsync({ mappings: mappingsToUpdate });
      }
    } else {
      // Create new account
      const created = await createAccountMut.mutateAsync({
        name: accName.trim(),
        bankProvider: accBankProvider,
        lastKnownBalance: accBalance,
        unbudgetedBuffer: accBuffer,
        isPrivate: accIsPrivate,
      });

      // Attach pool mappings if selected
      if (created && accSelectedTypes.length > 0) {
        const mappingsToUpdate = accSelectedTypes.map((catType) => ({
          categoryType: catType,
          bankAccountId: created.id,
        }));
        await updateMappingsMut.mutateAsync({ mappings: mappingsToUpdate });
      }
    }
  };

  const handleArchive = () => {
    if (!editingAccount) return;
    if (accounts.length <= 1) {
      toast.warning("At least one bank account must remain active for your budget pools.");
      return;
    }
    archiveAccountMut.mutate({ accountId: editingAccount.id });
  };

  const fmtMoney = (val: number | string | undefined) => {
    const num = typeof val === "string" ? parseFloat(val) : typeof val === "number" ? val : 0;
    return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-6">
      {/* Step Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#1B2B4B] flex items-center gap-2">
            <span>{showIcons ? "🏦" : ""}</span>
            <span>{t("setup.bankAccountsStep.title")}</span>
            <InfoTooltip content={t("setup.bankAccountsStep.tooltip")} />
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            {t("setup.bankAccountsStep.subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="px-4 py-2 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <span>{t("setup.bankAccountsStep.addAccount")}</span>
        </button>
      </div>

      {/* Bank Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.map((acc) => {
          const providerOpt = BANK_OPTIONS.find((b) => b.key === acc.bankProvider) || {
            label: acc.bankProvider || "Bank",
            logoBg: "bg-slate-500",
            textColor: "text-white",
          };

          const poolTypes = (acc.categoryTypes as CategoryType[]) || [];

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

                {/* Pool badges */}
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

      {/* Re-usable Bank Account Add/Edit Modal */}
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
        accounts={accounts.map((a) => ({
          id: a.id,
          name: a.name,
          categoryTypes: (a.categoryTypes as CategoryType[]) || [],
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
