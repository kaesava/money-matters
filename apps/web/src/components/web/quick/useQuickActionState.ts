import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../../lib/trpc";
import posthog from "../../../lib/posthog-client";
import { QuickPresetItem } from "./QuickPickBadges";
import { useToast } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";

export function useQuickActionState(
  onClose: () => void,
  initialTab: "DEBIT" | "CREDIT" | "TRANSFER" = "DEBIT"
) {
  const router = useRouter();
  const toast = useToast();
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
  }).format(new Date());

  const [type, setType] = useState<"DEBIT" | "CREDIT" | "TRANSFER">(initialTab);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string | null>(null);
  const [sourceCategoryId, setSourceCategoryId] = useState("");
  const [destinationCategoryId, setDestinationCategoryId] = useState("");
  const [receivingAccountId, setReceivingAccountId] = useState("");
  const [date, setDate] = useState(todayStr);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);
  const [crossBankPrompt, setCrossBankPrompt] = useState<{
    sourceAccountName: string;
    destAccountName: string;
    amount: number;
    payId?: string | null;
    bsb?: string | null;
    accountNumber?: string | null;
  } | null>(null);

  const utils = trpc.useUtils();

  const isIncome = type === "CREDIT";
  const isTransfer = type === "TRANSFER";
  const isFutureDate = date > todayStr;

  const poolsQuery = trpc.listPools.useQuery();
  const subCategoriesQuery = trpc.listCategories.useQuery();
  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery();
  const transactionsQuery = trpc.listTransactions.useQuery({ limit: 100 });

  const rawPools = poolsQuery.data;
  const rawSubCategories = subCategoriesQuery.data;

  const categories = useMemo(() => {
    const poolsList = rawPools ?? [];
    const catList = rawSubCategories ?? [];

    return poolsList.map((p) => {
      const childCategories = catList
        .filter((c) => c.poolId === p.id)
        .map((c) => ({ id: c.id, name: c.name }));

      return {
        ...p,
        type: p.poolType,
        categories: childCategories,
      };
    });
  }, [rawPools, rawSubCategories]);

  const rawBankAccounts = bankAccountsQuery.data;
  const bankAccounts = useMemo(() => rawBankAccounts ?? [], [rawBankAccounts]);
  const rawTxList = transactionsQuery.data;
  const txList = useMemo(() => rawTxList ?? [], [rawTxList]);

  function handleTabChange(newType: "DEBIT" | "CREDIT" | "TRANSFER") {
    setType(newType);
    setName("");
    setAmount("");
    setCategoryId("");
    setSelectedSubCategoryId(null);
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

  const computeRecentAndFrequent = <T>(
    items: T[],
    getKey: (item: T) => string | null,
    buildPreset: (item: T) => QuickPresetItem,
    getTimestamp?: (item: T) => number
  ): { recent: QuickPresetItem[]; frequent: QuickPresetItem[] } => {
    const recent: QuickPresetItem[] = [];
    const recentKeys = new Set<string>();
    const freqCounts = new Map<string, { count: number; sample: T }>();
    const cutoffTime = Date.now() - 180 * 24 * 60 * 60 * 1000;

    for (const item of items) {
      const key = getKey(item);
      if (!key) continue;

      if (recent.length < 2 && !recentKeys.has(key)) {
        recentKeys.add(key);
        recent.push(buildPreset(item));
      }

      const itemTime = getTimestamp ? getTimestamp(item) : Date.now();
      if (itemTime >= cutoffTime) {
        const existing = freqCounts.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          freqCounts.set(key, { count: 1, sample: item });
        }
      }
    }

    const sortedFreq = Array.from(freqCounts.entries())
      .filter(([key]) => !recentKeys.has(key))
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 2)
      .map(([_, entry]) => buildPreset(entry.sample));

    return { recent, frequent: sortedFreq };
  };

  const quickExpensePresets = useMemo(() => {
    const validTxs = txList.filter(
      (tx) => tx.flowType === "DEBIT" && !tx.transferGroupId && tx.note && !isPaydayOrAdjustment(tx.note)
    );
    return computeRecentAndFrequent(
      validTxs,
      (tx) => tx.note?.trim().toLowerCase() || null,
      (tx) => ({
        name: tx.note!.trim(),
        amount: tx.amount ? parseFloat(tx.amount).toFixed(2) : undefined,
        categoryId: tx.categoryId || undefined,
      }),
      (tx) => (tx.recordedAt ? new Date(tx.recordedAt).getTime() : Date.now())
    );
  }, [txList]);

  const quickIncomePresets = useMemo(() => {
    const validTxs = txList.filter(
      (tx) => tx.flowType === "CREDIT" && !tx.transferGroupId && tx.note && !isPaydayOrAdjustment(tx.note)
    );
    return computeRecentAndFrequent(
      validTxs,
      (tx) => tx.note?.trim().toLowerCase() || null,
      (tx) => ({
        name: tx.note!.trim(),
        amount: tx.amount ? parseFloat(tx.amount).toFixed(2) : undefined,
        receivingAccountId: tx.bankAccountId || undefined,
      }),
      (tx) => (tx.recordedAt ? new Date(tx.recordedAt).getTime() : Date.now())
    );
  }, [txList]);

  const quickTransferPresets = useMemo(() => {
    const transferMap = new Map<
      string,
      { note: string; amount: string; sourceCatId?: string; destCatId?: string; timestamp: number }
    >();

    const catNameMap = new Map(categories.map((c) => [c.id, c.name]));

    for (const tx of txList) {
      const groupKey = tx.transferGroupId || (tx.note?.startsWith("Transferred") ? tx.note : null);
      if (groupKey && !isPaydayOrAdjustment(tx.note)) {
        const existing = transferMap.get(groupKey) || {
          note: tx.note || "Transfer",
          amount: tx.amount ? parseFloat(tx.amount).toFixed(2) : "0.00",
          timestamp: tx.recordedAt ? new Date(tx.recordedAt).getTime() : Date.now(),
        };
        if (tx.flowType === "DEBIT") {
          existing.sourceCatId = tx.categoryId || tx.poolId || undefined;
        } else if (tx.flowType === "CREDIT") {
          existing.destCatId = tx.categoryId || tx.poolId || undefined;
        }
        transferMap.set(groupKey, existing);
      }
    }

    const transferItems = Array.from(transferMap.values()).map((transfer) => {
      const srcName = transfer.sourceCatId ? catNameMap.get(transfer.sourceCatId) : null;
      const dstName = transfer.destCatId ? catNameMap.get(transfer.destCatId) : null;

      let displayName = transfer.note.trim();
      if (srcName && dstName && (displayName === "Transfer" || displayName.startsWith("Transferred"))) {
        displayName = `${srcName} ➔ ${dstName}`;
      }
      return {
        ...transfer,
        displayName,
      };
    }).filter((t) => !isPaydayOrAdjustment(t.displayName));

    return computeRecentAndFrequent(
      transferItems,
      (t) => t.displayName.toLowerCase(),
      (t) => ({
        name: t.displayName,
        amount: t.amount,
        sourceCategoryId: t.sourceCatId,
        destinationCategoryId: t.destCatId,
      }),
      (t) => t.timestamp
    );
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

  const createTransferSourceMut = trpc.createTransferSource.useMutation({
    onSuccess: () => handleDone(),
    onError: (err) => setError(err.message),
  });

  const createIncomeSourceMut = trpc.createIncomeSource.useMutation({
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
    utils.listTransferEvents.invalidate();
    utils.listBankAccountsWithExpected.invalidate();
    if (isTransfer && !isFutureDate) {
      toast.success(t("toasts.transferCompleted", { defaultValue: "Transfer completed" }));
      const srcPool = categories.find((c) => c.id === sourceCategoryId);
      const dstPool = categories.find((c) => c.id === destinationCategoryId);
      if (srcPool?.bankAccountId && dstPool?.bankAccountId && srcPool.bankAccountId !== dstPool.bankAccountId) {
        const srcAcc = bankAccounts.find((a) => a.id === srcPool.bankAccountId);
        const dstAcc = bankAccounts.find((a) => a.id === dstPool.bankAccountId);
        setCrossBankPrompt({
          sourceAccountName: srcAcc?.name || "Source Bank Account",
          destAccountName: dstAcc?.name || "Destination Bank Account",
          amount: parseFloat(amount) || 0,
        });
        return;
      }
    } else {
      toast.success(t("toasts.saved", { defaultValue: "Saved successfully" }));
    }
    onClose();
  }

  function handleSelectPreset(preset: QuickPresetItem) {
    if (preset.name) setName(preset.name);
    if (preset.amount) setAmount(preset.amount);

    if (preset.categoryId) {
      let poolMatch = categories.find((c) => c.id === preset.categoryId);
      if (!poolMatch) {
        poolMatch = categories.find((p) => p.categories?.some((cat: { id: string }) => cat.id === preset.categoryId));
      }
      setCategoryId(poolMatch ? poolMatch.id : preset.categoryId);

      const hasSubCat = poolMatch?.categories?.some((cat: { id: string }) => cat.id === preset.categoryId);
      if (hasSubCat) {
        setSelectedSubCategoryId(preset.categoryId);
      } else {
        setSelectedSubCategoryId(null);
      }
    }

    if (preset.sourceCategoryId) {
      const srcPoolMatch = categories.find((c) => c.id === preset.sourceCategoryId) ||
        categories.find((p) => p.categories?.some((cat: { id: string }) => cat.id === preset.sourceCategoryId));
      setSourceCategoryId(srcPoolMatch ? srcPoolMatch.id : preset.sourceCategoryId);
    }
    if (preset.destinationCategoryId) {
      const dstPoolMatch = categories.find((c) => c.id === preset.destinationCategoryId) ||
        categories.find((p) => p.categories?.some((cat: { id: string }) => cat.id === preset.destinationCategoryId));
      setDestinationCategoryId(dstPoolMatch ? dstPoolMatch.id : preset.destinationCategoryId);
    }
    if (preset.receivingAccountId) {
      setReceivingAccountId(preset.receivingAccountId);
    }
  }

  function executeSubmit(skipBalanceCheck = false, skipSplit = false) {
    setError(null);

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError(t("drawers.quickExpense.validAmountError", { defaultValue: "Please enter a valid amount." }));
      return;
    }

    if (!isTransfer && !name.trim()) {
      setError(t("drawers.quickExpense.nameRequired", { defaultValue: "Name is required." }));
      return;
    }

    if (isTransfer) {
      if (!sourceCategoryId || !destinationCategoryId) {
        setError(t("drawers.quickExpense.poolsRequired", { defaultValue: "Both Source Pool and Destination Pool are required for transfers." }));
        return;
      }
      if (sourceCategoryId === destinationCategoryId) {
        setError(t("drawers.quickExpense.poolsDifferent", { defaultValue: "Source Pool and Destination Pool must be different." }));
        return;
      }
      if (date < todayStr) {
        return;
      }

      if (isFutureDate) {
        createTransferSourceMut.mutate({
          sourcePoolId: sourceCategoryId,
          destinationPoolId: destinationCategoryId,
          amount: amountNum.toFixed(2),
          name: name || undefined,
          startDate: date,
        });
      } else {
        moveMoneyMutation.mutate({
          sourcePoolId: sourceCategoryId,
          destinationPoolId: destinationCategoryId,
          amount: amountNum.toFixed(2),
          note: name || undefined,
        });
      }
      posthog.capture("money_moved_between_categories", {
        amount: amountNum,
        source_category_id: sourceCategoryId,
        destination_category_id: destinationCategoryId,
        is_future: isFutureDate,
      });
      return;
    }

    if (!isIncome) {
      if (!categoryId) {
        setError(t("drawers.quickExpense.poolSelectionRequired", { defaultValue: "Pool selection is required." }));
        return;
      }
      const targetCat = categories.find((c) => c.id === categoryId);
      if (targetCat && !isFutureDate && !skipBalanceCheck) {
        const catBal = parseFloat(String(targetCat.currentBalance || "0"));
        if (amountNum > catBal) {
          setConfirmState({
            isOpen: true,
            title: "Insufficient Pool Balance",
            description: `Warning: Expense of $${amountNum.toFixed(2)} exceeds available "${targetCat.name}" pool balance ($${catBal.toFixed(2)}). Proceed?`,
            onConfirm: () => {
              setConfirmState(null);
              executeSubmit(true, skipSplit);
            },
          });
          return;
        }
      }


      if (isFutureDate) {
        createExpenseSourceMut.mutate({
          name,
          amount: amountNum.toFixed(2),
          poolId: categoryId,
          categoryId: selectedSubCategoryId || undefined,
          isRecurring: false,
          startDate: date,
        });
      } else {
        recordExpenseMutation.mutate({
          poolId: categoryId,
          categoryId: selectedSubCategoryId || undefined,
          amount: amountNum.toFixed(2),
          note: name,
          date,
          transactionType: "EXPENSE",
        });
      }
    } else {
      createIncomeSourceMut.mutate(
        {
          name,
          amount: amountNum.toFixed(2),
          isRecurring: false,
          startDate: date,
          receivingAccountId: receivingAccountId || undefined,
        },
        {
          onSuccess: (res) => {
            handleDone();
            if (!skipSplit && res?.firstEventId) {
              router.push(`/dashboard/income-split?id=${res.firstEventId}&returnTo=/dashboard`);
            }
          },
        }
      );
    }
  }


  function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    executeSubmit(false, false);
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
    selectedSubCategoryId,
    setSelectedSubCategoryId,
    sourceCategoryId,
    setSourceCategoryId,
    destinationCategoryId,
    setDestinationCategoryId,
    receivingAccountId,
    setReceivingAccountId,
    date,
    setDate,
    todayStr,
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
    confirmState,
    setConfirmState,
    crossBankPrompt,
    setCrossBankPrompt,
    handleTabChange,
    handleSelectPreset,
    handleSubmit,
    executeSubmit,
  };
}

