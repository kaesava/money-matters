import { useState } from "react";
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
  const userPrefsQuery = trpc.getUserPreferences.useQuery();
  const updateUserPrefMut = trpc.updateUserPreferences.useMutation();

  const isIncome = type === "CREDIT";
  const isTransfer = type === "TRANSFER";
  const isFutureDate = date > todayStr;

  const categoriesQuery = trpc.listCategories.useQuery();
  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery();

  const categories = categoriesQuery.data ?? [];
  const bankAccounts = bankAccountsQuery.data ?? [];

  const quickExpensePresets: QuickPresetItem[] =
    userPrefsQuery.data?.quickExpensePresets ?? [];
  const quickIncomePresets: QuickPresetItem[] =
    userPrefsQuery.data?.quickIncomePresets ?? [];
  const quickTransferPresets: QuickPresetItem[] =
    userPrefsQuery.data?.quickTransferPresets ?? [];

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
    utils.getUserPreferences.invalidate();
    setSuccess(true);
    setTimeout(() => onClose(), 1200);
  }

  function handleSelectPreset(preset: QuickPresetItem) {
    if (preset.name) setName(preset.name);
    if (preset.amount) setAmount(preset.amount);
    if (preset.categoryId) setCategoryId(preset.categoryId);
    if (preset.sourceCategoryId) setSourceCategoryId(preset.sourceCategoryId);
    if (preset.destinationCategoryId) setDestinationCategoryId(preset.destinationCategoryId);
    if (preset.receivingAccountId) setReceivingAccountId(preset.receivingAccountId);
  }

  function savePresetOnSubmit() {
    if (!name.trim()) return;
    const cleanName = name.trim();

    if (type === "DEBIT") {
      const newItem: QuickPresetItem = { name: cleanName, amount, categoryId };
      const filtered = quickExpensePresets.filter(
        (p) => p.name.trim().toLowerCase() !== cleanName.toLowerCase()
      );
      const updated = [newItem, ...filtered].slice(0, 3);
      updateUserPrefMut.mutate({ quickExpensePresets: updated });
    } else if (type === "CREDIT") {
      const newItem: QuickPresetItem = { name: cleanName, amount, receivingAccountId };
      const filtered = quickIncomePresets.filter(
        (p) => p.name.trim().toLowerCase() !== cleanName.toLowerCase()
      );
      const updated = [newItem, ...filtered].slice(0, 3);
      updateUserPrefMut.mutate({ quickIncomePresets: updated });
    } else if (type === "TRANSFER") {
      const newItem: QuickPresetItem = {
        name: cleanName,
        amount,
        sourceCategoryId,
        destinationCategoryId,
      };
      const filtered = quickTransferPresets.filter(
        (p) => p.name.trim().toLowerCase() !== cleanName.toLowerCase()
      );
      const updated = [newItem, ...filtered].slice(0, 3);
      updateUserPrefMut.mutate({ quickTransferPresets: updated });
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

    savePresetOnSubmit();

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
            if (!confirm(`Warning: Transferring $${amountNum.toFixed(2)} exceeds "${sourceCat.name}" goal balance ($${catBal.toFixed(2)}). Proceed?`)) {
              return;
            }
          }
        } else {
          // Everyday & Regular (Bills) draw from the entire Pool bucket
          const poolCategories = categories.filter((c) => c.type === sourceCat.type);
          const totalPoolBalance = poolCategories.reduce(
            (sum, c) => sum + parseFloat(c.currentBalance || "0"),
            0
          );
          if (amountNum > totalPoolBalance) {
            const poolLabel = sourceCat.type === "EVERYDAY" ? "Everyday" : "Bills";
            if (!confirm(`Warning: Transferring $${amountNum.toFixed(2)} exceeds available ${poolLabel} pool balance ($${totalPoolBalance.toFixed(2)}). Proceed?`)) {
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
            if (!confirm(`Warning: Recording $${amountNum.toFixed(2)} expense exceeds "${targetCat.name}" goal balance ($${catBal.toFixed(2)}). Proceed?`)) {
              return;
            }
          }
        } else {
          const poolCategories = categories.filter((c) => c.type === targetCat.type);
          const totalPoolBalance = poolCategories.reduce(
            (sum, c) => sum + parseFloat(c.currentBalance || "0"),
            0
          );
          if (amountNum > totalPoolBalance) {
            const poolLabel = targetCat.type === "EVERYDAY" ? "Everyday" : "Bills";
            if (!confirm(`Warning: Expense of $${amountNum.toFixed(2)} exceeds available ${poolLabel} pool balance ($${totalPoolBalance.toFixed(2)}). Proceed?`)) {
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
    setType,
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
