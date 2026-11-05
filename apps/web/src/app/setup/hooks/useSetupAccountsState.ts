"use client";

import { useState } from "react";
import { getDefaultAccountName } from "@money-matters/types";
import { BankAccountRowItem } from "../components/SetupBankAccountRow";

export function useSetupAccountsState() {
  const [bankAccounts, setBankAccounts] = useState<BankAccountRowItem[]>([
    {
      id: "acc-default",
      name: getDefaultAccountName("Other", "EVERYDAY"),
      bankProvider: "Other",
      accountType: "EVERYDAY",
      lastKnownBalance: "1000.00",
      unbudgetedBuffer: "0.00",
      isPrivate: false,
    },
  ]);
  const [archivedAccountIds, setArchivedAccountIds] = useState<Set<string>>(new Set());

  const handleAddAccount = () => {
    setBankAccounts((prev) => [
      ...prev,
      {
        id: `acc-${Date.now()}`,
        name: getDefaultAccountName("Other", "EVERYDAY"),
        bankProvider: "Other",
        accountType: "EVERYDAY",
        lastKnownBalance: "0.00",
        unbudgetedBuffer: "0.00",
        isPrivate: false,
      },
    ]);
  };

  const handleUpdateAccount = (
    acc: BankAccountRowItem,
    field: "name" | "bankProvider" | "accountType" | "lastKnownBalance" | "unbudgetedBuffer" | "isPrivate",
    value: string | boolean
  ) => {
    setBankAccounts((prev) =>
      prev.map((item) => (item.id === acc.id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveAccount = (id: string) => {
    if (!id.startsWith("acc-")) setArchivedAccountIds((prev) => new Set(prev).add(id));
    setBankAccounts((prev) => prev.filter((item) => item.id !== id));
  };

  return {
    bankAccounts,
    setBankAccounts,
    archivedAccountIds,
    handleAddAccount,
    handleUpdateAccount,
    handleRemoveAccount,
  };
}
