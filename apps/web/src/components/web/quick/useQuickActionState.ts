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

  const categoriesQuery = trpc.listPools.useQuery();
  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery();
  const transactionsQuery = trpc.listTransactions.useQuery({ limit: 100 });

  const rawCategories = categoriesQuery.data;
  const categories = useMemo(() => (rawCategories ?? []).map((p) => ({ ...p, type: p.poolType })), [rawCategories]);
  const rawBankAccounts = bankAccountsQuery.data;
  const bankAccounts = useMemo(() => rawBankAccounts ?? [], [rawBankAccounts]);
  const rawTxList = transactionsQuery.data;
  const txList = useMemo(() => rawTxList ?? [], [rawTxList]);

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

  const createExpenseSourceMut = trpc.createExpenseSource.useMutation({
    onSuccess: () => handleDone(),
    onError: (err) => setError(err.message),
  });

  const createIncomeSourceMut = trpc.createIncomeSource.useMutation({
    onSuccess: () => handleDone(),
    onError: (err) => setError(err.message),
  });

  function handleDone() {
    utils.listTransactions.invalidate();
    utils.listPools.invalidate();
    utils.listCategories.invalidate();
    utils.listIncomeSources.invalidate();
    utils.listExpenseSources.invalidate();
    utils.listIncomeEvents.invalidate();
    utils.listExpenseEvents.invalidate();
    utils.listBankAccountsWithExpected.invalidate();
    setSuccess(true);
    setTimeout(() => onClose(), 1200);
  }

  function handleSelectPreset(preset: QuickPresetItem) {
    if (preset.name) setName(preset.name);
    if (preset.amount) setAmount(preset.amount);

    if (preset.categoryId) {
      const match = categories.find((c) => c.id === preset.categoryId);
      if (match) setCategoryId(match.id);
    }
    if (preset.receivingAccountId) {
      const match = bankAccounts.find((b) => b.id === preset.receivingAccountId);
      if (match) setReceivingAccountId(match.id);
    }
    if (preset.sourceCategoryId) {
      const match = categories.find((c) => c.id === preset.sourceCategoryId);
      if (match) setSourceCategoryId(match.id);
    }
    if (preset.destinationCategoryId) {
      const match = categories.find((c) => c.id === preset.destinationCategoryId);
      if (match) setDestinationCategoryId(match.id);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid positive amount.");
      return;
    }

    if (!isTransfer && !name.trim()) {
      setError("Name is required.");
      return;
    }

    if (isTransfer) {
      if (!sourceCategoryId || !destinationCategoryId) {
        setError("Both source and destination pools are required.");
        return;
      }
      if (sourceCategoryId === destinationCategoryId) {
        setError("Source and destination pools must be different.");
        return;
      }
      const sourceCat = categories.find((c) => c.id === sourceCategoryId);
      if (sourceCat) {
        const catBal = parseFloat(String(sourceCat.currentBalance || "0"));
        if (amountNum > catBal) {
          if (
            !confirm(
              `Warning: Transferring $${amountNum.toFixed(2)} exceeds "${sourceCat.name}" pool balance ($${catBal.toFixed(2)}). Proceed?`
            )
          ) {
            return;
          }
        }
      }
      moveMoneyMutation.mutate({
        sourcePoolId: sourceCategoryId,
        destinationPoolId: destinationCategoryId,
        amount: amountNum.toFixed(2),
        note: name || "Pool Transfer",
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
        setError("Pool selection is required.");
        return;
      }
      const targetCat = categories.find((c) => c.id === categoryId);
      if (targetCat && !isFutureDate) {
        const catBal = parseFloat(String(targetCat.currentBalance || "0"));
        if (amountNum > catBal) {
          if (
            !confirm(
              `Warning: Expense of $${amountNum.toFixed(2)} exceeds available "${targetCat.name}" pool balance ($${catBal.toFixed(2)}). Proceed?`
            )
          ) {
            return;
          }
        }
      }
      if (isFutureDate) {
        createExpenseSourceMut.mutate({
          name,
          amount: amountNum.toFixed(2),
          poolId: categoryId,
          isRecurring: false,
          startDate: date,
        });
      } else {
        recordExpenseMutation.mutate({
          poolId: categoryId,
          amount: amountNum.toFixed(2),
          flowType: "DEBIT",
          note: name,
          date,
        });
      }
    } else {
      if (isFutureDate) {
        createIncomeSourceMut.mutate({
          name,
          amount: amountNum.toFixed(2),
          isRecurring: false,
          startDate: date,
          receivingAccountId: receivingAccountId || undefined,
        });
      } else {
        const targetCat = categories.find((c) => c.poolType === "EVERYDAY") || categories[0];
        if (!targetCat?.id) {
          setError("No active pool found. Please ensure at least one pool exists.");
          return;
        }
        recordExpenseMutation.mutate({
          poolId: targetCat.id,
          amount: amountNum.toFixed(2),
          flowType: "CREDIT",
          note: name,
          date,
        });
      }
    }
  }

  const isSubmitting =
    recordExpenseMutation.isPending ||
    moveMoneyMutation.isPending ||
    createExpenseSourceMut.isPending ||
    createIncomeSourceMut.isPending;

  return {
    type,
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
    categories,
    bankAccounts,
    quickExpensePresets,
    quickIncomePresets,
    quickTransferPresets,
    isIncome,
    isTransfer,
    isFutureDate,
    isSubmitting,
    isPending: isSubmitting,
    handleTabChange,
    handleSelectPreset,
    handleSubmit,
  };
}
