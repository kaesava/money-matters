import { useState, useMemo } from "react";
import { trpc } from "../../../lib/trpc";
import posthog from "../../../lib/posthog-client";
import { QuickPresetItem } from "./QuickPickBadges";

export function useQuickActionState(
  onClose: () => void,
  initialTab: "DEBIT" | "CREDIT" | "TRANSFER" = "DEBIT"
) {
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
  }).format(new Date());

  const [type, setType] = useState<"DEBIT" | "CREDIT" | "TRANSFER">(initialTab);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sourceCategoryId, setSourceCategoryId] = useState("");
  const [destinationCategoryId, setDestinationCategoryId] = useState("");
  const [receivingAccountId, setReceivingAccountId] = useState("");
  const [date, setDate] = useState(todayStr);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const utils = trpc.useUtils();

  const isIncome = type === "CREDIT";
  const isTransfer = type === "TRANSFER";
  const isFutureDate = date > todayStr;

  const categoriesQuery = trpc.listCategories.useQuery();
  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery();
  const transactionsQuery = trpc.listTransactions.useQuery({ limit: 100 });

  const rawCategories = categoriesQuery.data;
  const categories = useMemo(() => rawCategories ?? [], [rawCategories]);
  const rawBankAccounts = bankAccountsQuery.data;
  const bankAccounts = useMemo(() => rawBankAccounts ?? [], [rawBankAccounts]);
  const rawTxList = transactionsQuery.data;
  const txList = useMemo(() => rawTxList ?? [], [rawTxList]);

  // Tab switch handler: clear all entered data
  function handleTabChange(newType: "DEBIT" | "CREDIT" | "TRANSFER") {
    setType(newType);
    setName("");
    setAmount("");
    setCategoryId("");
    setSourceCategoryId("");
    setDestinationCategoryId("");
    setReceivingAccountId("");
    setDate(todayStr);
    setError(null);
    setSuccess(false);
  }

  const isPaydayOrAdjustment = (note?: string | null) => {
    if (!note) return false;
    const lower = note.toLowerCase();
    return (
      lower.includes("payday") ||
      lower.includes("waterfall") ||
      lower.includes("adjustment") ||
      lower.includes("pool balance") ||
      lower.includes("reconcil")
    );
  };

  // Derive last 3 Expense presets from actual transactions
  const quickExpensePresets = useMemo(() => {
    const presets: QuickPresetItem[] = [];
    const seen = new Set<string>();
    for (const tx of txList) {
      if (tx.flowType === "DEBIT" && !tx.transferGroupId && tx.note && !isPaydayOrAdjustment(tx.note)) {
        const cleanNote = tx.note.trim();
        const key = cleanNote.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          presets.push({
            name: cleanNote,
            amount: tx.amount ? parseFloat(tx.amount).toFixed(2) : undefined,
            categoryId: tx.categoryId || undefined,
          });
          if (presets.length >= 3) break;
        }
      }
    }
    return presets;
  }, [txList]);

  // Derive last 3 Income presets from actual transactions
  const quickIncomePresets = useMemo(() => {
    const presets: QuickPresetItem[] = [];
    const seen = new Set<string>();
    for (const tx of txList) {
      if (tx.flowType === "CREDIT" && !tx.transferGroupId && tx.note && !isPaydayOrAdjustment(tx.note)) {
        const cleanNote = tx.note.trim();
        const key = cleanNote.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          presets.push({
            name: cleanNote,
            amount: tx.amount ? parseFloat(tx.amount).toFixed(2) : undefined,
            receivingAccountId: tx.bankAccountId || undefined,
          });
          if (presets.length >= 3) break;
        }
      }
    }
    return presets;
  }, [txList]);

  // Derive last 3 Transfer presets from actual transactions
  const quickTransferPresets = useMemo(() => {
    const presets: QuickPresetItem[] = [];
    const transferMap = new Map<
      string,
      { note: string; amount: string; sourceCatId?: string; destCatId?: string }
    >();

    const catNameMap = new Map(categories.map((c) => [c.id, c.name]));

    for (const tx of txList) {
      const groupKey = tx.transferGroupId || (tx.note?.startsWith("Transferred") ? tx.note : null);
      if (groupKey && !isPaydayOrAdjustment(tx.note)) {
        const existing = transferMap.get(groupKey) || {
          note: tx.note || "Transfer",
          amount: tx.amount ? parseFloat(tx.amount).toFixed(2) : "0.00",
        };
        if (tx.flowType === "DEBIT") {
          existing.sourceCatId = tx.categoryId || undefined;
        } else if (tx.flowType === "CREDIT") {
          existing.destCatId = tx.categoryId || undefined;
        }
        transferMap.set(groupKey, existing);
      }
    }

    const seen = new Set<string>();
    for (const transfer of transferMap.values()) {
      const srcName = transfer.sourceCatId ? catNameMap.get(transfer.sourceCatId) : null;
      const dstName = transfer.destCatId ? catNameMap.get(transfer.destCatId) : null;

      let displayName = transfer.note.trim();
      if (srcName && dstName && (displayName === "Transfer" || displayName.startsWith("Transferred"))) {
        displayName = `${srcName} ➔ ${dstName}`;
      }

      const key = `${transfer.sourceCatId || ""}->${transfer.destCatId || ""}:${transfer.amount}:${displayName.toLowerCase()}`;
      if (!seen.has(key) && !isPaydayOrAdjustment(displayName)) {
        seen.add(key);
        presets.push({
          name: displayName,
          amount: transfer.amount,
          sourceCategoryId: transfer.sourceCatId,
          destinationCategoryId: transfer.destCatId,
        });
        if (presets.length >= 3) break;
      }
    }
    return presets;
  }, [txList, categories]);

  const recordExpenseMutation = trpc.recordExpense.useMutation({
    onSuccess: () => handleDone(),
    onError: (err) => setError(err.message),
  });

  const moveMoneyMutation = trpc.moveMoney.useMutation({
    onSuccess: () => handleDone(),
    onError: (err) => setError(err.message),
  });

  const createUpcomingExpenseMut = trpc.createUpcomingExpense.useMutation({
    onSuccess: () => handleDone(),
    onError: (err) => setError(err.message),
  });

  const createUpcomingIncomeMut = trpc.createUpcomingIncome.useMutation({
    onSuccess: () => handleDone(),
    onError: (err) => setError(err.message),
  });

  function handleDone() {
    utils.listTransactions.invalidate();
    utils.listCategories.invalidate();
    utils.listIncomeSources.invalidate();
    utils.listExpenseSources.invalidate();
    utils.listIncomeEvents.invalidate();
    utils.listExpenseEvents.invalidate();
    utils.listBankAccountsWithExpected.invalidate();
    setSuccess(true);
    setTimeout(() => onClose(), 1200);
  }

  // Populate preset values: skip any archived categories or bank accounts
  function handleSelectPreset(preset: QuickPresetItem) {
    if (preset.name) setName(preset.name);
    if (preset.amount) setAmount(preset.amount);

    if (preset.categoryId) {
      const isActive = categories.some((c) => c.id === preset.categoryId);
      if (isActive) setCategoryId(preset.categoryId);
    }

    if (preset.sourceCategoryId) {
      const isActive = categories.some((c) => c.id === preset.sourceCategoryId);
      if (isActive) setSourceCategoryId(preset.sourceCategoryId);
    }

    if (preset.destinationCategoryId) {
      const isActive = categories.some(
        (c) => c.id === preset.destinationCategoryId
      );
      if (isActive) setDestinationCategoryId(preset.destinationCategoryId);
    }

    if (preset.receivingAccountId) {
      const isActive = bankAccounts.some(
        (a) => a.id === preset.receivingAccountId
      );
      if (isActive) setReceivingAccountId(preset.receivingAccountId);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }

    if (!name.trim()) {
      setError(
        isTransfer
          ? "Transfer name is required."
          : isIncome
          ? "Income source name is required."
          : "Expense name is required."
      );
      return;
    }

    if (isTransfer) {
      if (!sourceCategoryId || !destinationCategoryId) {
        setError("Please select both source and destination categories.");
        return;
      }
      if (sourceCategoryId === destinationCategoryId) {
        setError("Source and destination categories must be different.");
        return;
      }
      const sourceCat = categories.find((c) => c.id === sourceCategoryId);
      if (sourceCat) {
        if (sourceCat.type === "GOAL") {
          const catBal = parseFloat(sourceCat.currentBalance || "0");
          if (amountNum > catBal) {
            if (
              !confirm(
                `Warning: Transferring $${amountNum.toFixed(
                  2
                )} exceeds "${sourceCat.name}" goal balance ($${catBal.toFixed(
                  2
                )}). Proceed?`
              )
            ) {
              return;
            }
          }
        } else {
          // Everyday & Regular (Bills) draw from the entire Pool bucket
          const poolCategories = categories.filter(
            (c) => c.type === sourceCat.type
          );
          const totalPoolBalance = poolCategories.reduce(
            (sum, c) => sum + parseFloat(c.currentBalance || "0"),
            0
          );
          if (amountNum > totalPoolBalance) {
            const poolLabel =
              sourceCat.type === "EVERYDAY" ? "Everyday" : "Bills";
            if (
              !confirm(
                `Warning: Transferring $${amountNum.toFixed(
                  2
                )} exceeds available ${poolLabel} pool balance ($${totalPoolBalance.toFixed(
                  2
                )}). Proceed?`
              )
            ) {
              return;
            }
          }
        }
      }
      moveMoneyMutation.mutate({
        sourceCategoryId,
        destinationCategoryId,
        amount: amountNum.toFixed(2),
        note: name,
      });
      posthog.capture("money_moved_between_categories", {
        amount: amountNum,
        source_category_id: sourceCategoryId,
        destination_category_id: destinationCategoryId,
      });
      return;
    }

    if (!isIncome) {
      if (!categoryId) {
        setError("Category is required.");
        return;
      }
      const targetCat = categories.find((c) => c.id === categoryId);
      if (targetCat && !isFutureDate) {
        if (targetCat.type === "GOAL") {
          const catBal = parseFloat(targetCat.currentBalance || "0");
          if (amountNum > catBal) {
            if (
              !confirm(
                `Warning: Recording $${amountNum.toFixed(
                  2
                )} expense exceeds "${targetCat.name}" goal balance ($${catBal.toFixed(
                  2
                )}). Proceed?`
              )
            ) {
              return;
            }
          }
        } else {
          const poolCategories = categories.filter(
            (c) => c.type === targetCat.type
          );
          const totalPoolBalance = poolCategories.reduce(
            (sum, c) => sum + parseFloat(c.currentBalance || "0"),
            0
          );
          if (amountNum > totalPoolBalance) {
            const poolLabel =
              targetCat.type === "EVERYDAY" ? "Everyday" : "Bills";
            if (
              !confirm(
                `Warning: Expense of $${amountNum.toFixed(
                  2
                )} exceeds available ${poolLabel} pool balance ($${totalPoolBalance.toFixed(
                  2
                )}). Proceed?`
              )
            ) {
              return;
            }
          }
        }
      }
      if (isFutureDate) {
        createUpcomingExpenseMut.mutate({
          name,
          amount: amountNum.toFixed(2),
          categoryId,
          expectedDate: date,
          note: name,
        });
      } else {
        recordExpenseMutation.mutate({
          categoryId,
          amount: amountNum.toFixed(2),
          flowType: "DEBIT",
          note: name,
          recordedAt: new Date(date).toISOString(),
        });
      }
    } else {
      if (isFutureDate) {
        createUpcomingIncomeMut.mutate({
          name,
          amount: amountNum.toFixed(2),
          expectedDate: date,
          receivingAccountId: receivingAccountId || undefined,
          note: name,
        });
      } else {
        const targetCat =
          categories.find((c) => c.type === "EVERYDAY") || categories[0];
        if (!targetCat?.id) {
          setError(
            "No active pool category found. Please ensure at least one category exists."
          );
          return;
        }
        recordExpenseMutation.mutate({
          categoryId: targetCat.id,
          amount: amountNum.toFixed(2),
          flowType: "CREDIT",
          note: name,
          recordedAt: new Date(date).toISOString(),
        });
      }
    }
  }

  const isPending =
    recordExpenseMutation.isPending ||
    moveMoneyMutation.isPending ||
    createUpcomingExpenseMut.isPending ||
    createUpcomingIncomeMut.isPending;

  return {
    type,
    handleTabChange,
    name,
    setName,
    amount,
    setAmount,
    categoryId,
    setCategoryId,
    sourceCategoryId,
    setSourceCategoryId,
    destinationCategoryId,
    setDestinationCategoryId,
    receivingAccountId,
    setReceivingAccountId,
    date,
    setDate,
    error,
    success,
    isIncome,
    isTransfer,
    categories,
    bankAccounts,
    quickExpensePresets,
    quickIncomePresets,
    quickTransferPresets,
    handleSelectPreset,
    handleSubmit,
    isPending,
  };
}
