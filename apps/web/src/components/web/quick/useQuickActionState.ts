import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../../lib/trpc";
import posthog from "../../../lib/posthog-client";
import { QuickPresetItem, QuickActionInitialData } from "@money-matters/types";
import { useToast } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { useLocale } from "../../../providers/LocaleProvider";
import { useQuickPresets } from "./useQuickPresets";
import { useQuickInitialMatching } from "./useQuickInitialMatching";

interface ConfirmModalState { isOpen: boolean; title: string; description: string; onConfirm: () => void; }
interface CrossBankPrompt { sourceAccountName: string; destAccountName: string; amount: number; payId?: string | null; bsb?: string | null; accountNumber?: string | null; }
interface ShortfallData { billName: string; amount: number; date: string; poolId: string; poolName: string; poolType: string; currentBalance: number; }

export function useQuickActionState(
  onClose: () => void,
  initialTab: "DEBIT" | "CREDIT" | "TRANSFER" = "DEBIT",
  initialData?: QuickActionInitialData
) {
  const router = useRouter();
  const toast = useToast();
  const { userTimezone, timezone } = useLocale();
  const activeTz = userTimezone || timezone || "Australia/Sydney";
  const todayStr = useMemo(() => new Intl.DateTimeFormat("en-CA", {
    timeZone: activeTz,
  }).format(new Date()), [activeTz]);

  const [type, setType] = useState<"DEBIT" | "CREDIT" | "TRANSFER">(initialData?.type || initialTab);
  const [name, setName] = useState(initialData?.name || "");
  const [amount, setAmount] = useState(
    initialData?.amount ? (isNaN(parseFloat(initialData.amount)) ? "" : parseFloat(initialData.amount).toFixed(2)) : ""
  );
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || "");
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string | null>(null);
  const [sourceCategoryId, setSourceCategoryId] = useState("");
  const [destinationCategoryId, setDestinationCategoryId] = useState("");
  const [receivingAccountId, setReceivingAccountId] = useState("");
  const [date, setDate] = useState(initialData?.date || todayStr);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmModalState | null>(null);
  const [crossBankPrompt, setCrossBankPrompt] = useState<CrossBankPrompt | null>(null);
  const [shortfallModalData, setShortfallModalData] = useState<ShortfallData | null>(null);

  const utils = trpc.useUtils();

  const isIncome = type === "CREDIT";
  const isTransfer = type === "TRANSFER";
  const isFutureDate = date > todayStr;

  const poolsQuery = trpc.listPools.useQuery();
  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery();
  const transactionsQuery = trpc.listTransactions.useQuery({ limit: 100 });

  const rawPools = poolsQuery.data;

  const categories = useMemo(() => {
    const poolsList = rawPools ?? [];

    return poolsList
      .filter((p) => isIncome || isTransfer || p.envelopeType === "SCHEDULED_BILL" || p.envelopeType === "FLEXIBLE_BILL" || p.envelopeType === "TARGET_GOAL" || p.envelopeType === "ONGOING_GOAL")
      .map((p) => {
        return {
          ...p,
          type: p.envelopeType,
          poolType: p.envelopeType,
          categories: [] as Array<{ id: string; name: string }>,
        };
      });
  }, [rawPools, isIncome, isTransfer]);

  const rawBankAccounts = bankAccountsQuery.data;
  const bankAccounts = useMemo(() => rawBankAccounts ?? [], [rawBankAccounts]);
  const rawTxList = transactionsQuery.data;
  const txList = useMemo(() => rawTxList ?? [], [rawTxList]);

  // Auto-match envelope and transfer pools from initialData
  useQuickInitialMatching(
    initialData,
    categories,
    categoryId,
    setCategoryId,
    sourceCategoryId,
    setSourceCategoryId,
    destinationCategoryId,
    setDestinationCategoryId
  );

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

  const { quickExpensePresets, quickIncomePresets, quickTransferPresets } = useQuickPresets(txList, categories);

  const recordExpenseMutation = trpc.recordExpense.useMutation({
    onSuccess: () => handleDone(),
    onError: (err) => setError(err.message),
  });

  const moveMoneyMutation = trpc.moveMoney.useMutation({
    onSuccess: () => handleDone(),
    onError: (err) => setError(err.message),
  });

  const createOneOffExpenseMut = trpc.createOneOffExpense.useMutation({
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
    utils.listIncomeSources.invalidate();
    utils.listIncomeEvents.invalidate();
    utils.listExpenseEvents.invalidate();
    utils.listTransferEvents.invalidate();
    utils.listBankAccountsWithExpected.invalidate();
    if (isTransfer && !isFutureDate) {
      toast.success(t("toasts.transferCompleted"));
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
      toast.success(t("toasts.saved"));
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

  function executeSubmit(_skipBalanceCheck = false, skipSplit = false) {
    setError(null);

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError(t("drawers.quickExpense.validAmountError"));
      return;
    }

    if (!isTransfer && !name.trim()) {
      setError(t("drawers.quickExpense.nameRequired"));
      return;
    }

    if (isTransfer) {
      if (!sourceCategoryId || !destinationCategoryId) {
        setError(t("drawers.quickExpense.poolsRequired"));
        return;
      }
      if (sourceCategoryId === destinationCategoryId) {
        setError(t("drawers.quickExpense.poolsDifferent"));
        return;
      }
      if (date < todayStr) {
        return;
      }

      if (isFutureDate) {
        createTransferSourceMut.mutate({
          sourceEnvelopeId: sourceCategoryId,
          destinationEnvelopeId: destinationCategoryId,
          amount: amountNum.toFixed(2),
          name: name || undefined,
          startDate: date,
        });
      } else {
        moveMoneyMutation.mutate({
          sourceEnvelopeId: sourceCategoryId,
          destinationEnvelopeId: destinationCategoryId,
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
        setError(t("drawers.quickExpense.poolSelectionRequired"));
        return;
      }
      const targetCat = categories.find((c) => c.id === categoryId);
      if (targetCat && !isFutureDate) {
        const catBal = parseFloat(String(targetCat.currentBalance || "0"));
        if (amountNum > catBal) {
          setShortfallModalData({
            billName: name.trim(),
            amount: amountNum,
            date,
            poolId: targetCat.id,
            poolName: targetCat.name,
            poolType: targetCat.envelopeType,
            currentBalance: catBal,
          });
          return;
        }
      }


      if (isFutureDate) {
        createOneOffExpenseMut.mutate({
          name,
          amount: amountNum.toFixed(2),
          envelopeId: categoryId,
          expectedDate: date,
        });
      } else {
        recordExpenseMutation.mutate({
          envelopeId: categoryId,
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
    createOneOffExpenseMut.isPending ||
    createIncomeSourceMut.isPending;

  async function handleConfirmShortfallPaid({
    amount: finalAmt,
    date: finalDate,
    transfers = [],
  }: {
    amount: number;
    date: string;
    transfers?: Array<{ poolId: string; amount: string }>;
  }) {
    if (!shortfallModalData) return;
    for (const tItem of transfers) {
      if (parseFloat(tItem.amount || "0") > 0) {
        await moveMoneyMutation.mutateAsync({
          sourceEnvelopeId: tItem.poolId,
          destinationEnvelopeId: shortfallModalData.poolId,
          amount: tItem.amount,
          note: `Cover shortfall for ${shortfallModalData.billName}`,
        });
      }
    }
    await recordExpenseMutation.mutateAsync({
      envelopeId: shortfallModalData.poolId,
      amount: finalAmt.toFixed(2),
      note: shortfallModalData.billName,
      date: finalDate,
      transactionType: "EXPENSE",
    });
    setShortfallModalData(null);
    handleDone();
  }

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
    shortfallModalData,
    setShortfallModalData,
    handleConfirmShortfallPaid,
    handleTabChange,
    handleSelectPreset,
    handleSubmit,
    executeSubmit,
  };
}

