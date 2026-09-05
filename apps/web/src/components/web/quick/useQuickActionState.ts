import { useState, useMemo } from "react";
import { trpc } from "../../../lib/trpc";
import posthog from "../../../lib/posthog-client";
import { QuickPresetItem } from "./QuickPickBadges";
import { useToast } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";

export function useQuickActionState(
  onClose: () => void,
  initialTab: "DEBIT" | "CREDIT" | "TRANSFER" = "DEBIT"
) {
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
  const [runAllocation, setRunAllocation] = useState(true);
  const [paydayModalEventId, setPaydayModalEventId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
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
    setRunAllocation(true);
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

  const createTransferSourceMut = trpc.createTransferSource.useMutation({
    onSuccess: () => handleDone(),
    onError: (err) => setError(err.message),
  });

  const createIncomeSourceMut = trpc.createIncomeSource.useMutation({
    onSuccess: (res) => {
      if (runAllocation && !isFutureDate && res?.firstEventId) {
        // Trigger Payday Allocation preview modal instead of closing immediately
        setPaydayModalEventId(res.firstEventId);
      } else {
        handleDone();
      }
    },
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
    toast.success(t("toasts.saved", { defaultValue: "Saved successfully" }));
    onClose();
  }

  function handleSelectPreset(preset: QuickPresetItem) {
    if (preset.name) setName(preset.name);
    if (preset.amount) setAmount(preset.amount);

    if (preset.categoryId) {
      let poolMatch = categories.find((c) => c.id === preset.categoryId);
      let catMatchId: string | null = null;

      if (!poolMatch) {
        for (const p of categories) {
          const childCat = p.categories?.find((cat: { id: string }) => cat.id === preset.categoryId);
          if (childCat) {
            poolMatch = p;
            catMatchId = childCat.id;
            break;
          }
        }
      }

      if (poolMatch) {
        setCategoryId(poolMatch.id);
        setSelectedSubCategoryId(catMatchId);
      }
    }

    if (preset.receivingAccountId) {
      const match = bankAccounts.find((b) => b.id === preset.receivingAccountId);
      if (match) setReceivingAccountId(match.id);
    }

    if (preset.sourceCategoryId) {
      let srcPoolMatch = categories.find((c) => c.id === preset.sourceCategoryId);
      if (!srcPoolMatch) {
        for (const p of categories) {
          if (p.categories?.some((cat: { id: string }) => cat.id === preset.sourceCategoryId)) {
            srcPoolMatch = p;
            break;
          }
        }
      }
      if (srcPoolMatch) setSourceCategoryId(srcPoolMatch.id);
    }

    if (preset.destinationCategoryId) {
      let dstPoolMatch = categories.find((c) => c.id === preset.destinationCategoryId);
      if (!dstPoolMatch) {
        for (const p of categories) {
          if (p.categories?.some((cat: { id: string }) => cat.id === preset.destinationCategoryId)) {
            dstPoolMatch = p;
            break;
          }
        }
      }
      if (dstPoolMatch) setDestinationCategoryId(dstPoolMatch.id);
    }
  }

  function executeSubmit(skipBalanceCheck = false) {
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
      // Direct transfer via moveMoneyMutation (for today/past) or transfer event creation (for future)

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
          note: name || "Pool Transfer",
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
        setError("Pool selection is required.");
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
              executeSubmit(true);
            },
          });
          return;
        }
      }


      if (isFutureDate) {
        // Create pending Expense Event for future date
        createExpenseSourceMut.mutate({
          name,
          amount: amountNum.toFixed(2),
          poolId: categoryId,
          isRecurring: false,
          startDate: date,
        });
      } else {
        // Record immediate transaction for past/today expense
        recordExpenseMutation.mutate({
          poolId: categoryId,
          categoryId,
          amount: amountNum.toFixed(2),
          note: name,
          date,
        });
      }
    } else {
      // Create pending Income Event (shows up in Income & Bills > Pending List)
      createIncomeSourceMut.mutate({
        name,
        amount: amountNum.toFixed(2),
        isRecurring: false,
        startDate: date,
        receivingAccountId: receivingAccountId || undefined,
      });
    }
  }


  function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    executeSubmit(false);
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
    runAllocation,
    setRunAllocation,
    paydayModalEventId,
    setPaydayModalEventId,
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
    handleTabChange,
    handleSelectPreset,
    handleSubmit,
  };
}

