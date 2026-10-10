import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import { showMobileConfirm } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { PaycheckTransferEvent } from './PaycheckEventSection';

export function usePaychecksData() {
  const { data: session } = authClient.useSession();
  const utils = trpc.useUtils();
  const [refreshing, setRefreshing] = useState(false);

  const incomeEventsQuery = trpc.listIncomeEvents.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const transferEventsQuery = trpc.listTransferEvents.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const incomeSourcesQuery = trpc.listIncomeSources.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const expenseSourcesQuery = trpc.listExpenseSources.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const poolsQuery = trpc.listPools.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const bankAccountsQuery = trpc.listBankAccounts.useQuery(undefined, {
    enabled: !!session?.user,
  });

  const incomeSources = incomeSourcesQuery.data ?? [];
  const expenseSources = expenseSourcesQuery.data ?? [];
  const pools = poolsQuery.data ?? [];
  const bankAccounts = bankAccountsQuery.data ?? [];

  const rawIncomeEvents = (incomeEventsQuery.data ?? []).filter((e) => e.status === 'PENDING');
  const rawExpenseEvents = (expenseEventsQuery.data ?? []).filter((e) => e.status === 'PENDING');
  const rawTransferEvents = (transferEventsQuery.data ?? []).filter((e) => e.status === 'PENDING');

  const deleteIncomeEventMut = trpc.deleteIncomeEvent.useMutation({
    onSuccess: () => {
      incomeEventsQuery.refetch();
    },
  });

  const deleteExpenseEventMut = trpc.deleteExpenseEvent.useMutation({
    onSuccess: () => {
      expenseEventsQuery.refetch();
    },
  });

  const deleteTransferEventMut = trpc.deleteTransferEvent.useMutation({
    onSuccess: () => {
      transferEventsQuery.refetch();
    },
  });

  const executeTransferMutation = trpc.executeTransferEvent.useMutation({
    onSuccess: () => {
      transferEventsQuery.refetch();
      poolsQuery.refetch();
      utils.listTransactions.invalidate();
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      incomeEventsQuery.refetch(),
      expenseEventsQuery.refetch(),
      transferEventsQuery.refetch(),
      incomeSourcesQuery.refetch(),
      expenseSourcesQuery.refetch(),
      poolsQuery.refetch(),
      bankAccountsQuery.refetch(),
    ]);
    setRefreshing(false);
  };

  const handleDeleteIncomeEvent = (item: { id: string; name?: string | null }) => {
    showMobileConfirm({
      title: t('payday.deleteIncomeEvent'),
      message: t('payday.deleteIncomeEventConfirm'),
      confirmText: t('common.delete'),
      onConfirm: () => deleteIncomeEventMut.mutate({ eventId: item.id }),
    });
  };

  const handleDeleteExpenseEvent = (item: { id: string; name?: string | null }) => {
    showMobileConfirm({
      title: t('payday.deleteExpenseEvent'),
      message: t('payday.deleteExpenseEventConfirm', { name: item.name || t('common.expense') }),
      confirmText: t('common.delete'),
      onConfirm: () => deleteExpenseEventMut.mutate({ eventId: item.id }),
    });
  };

  const handleDeleteTransferEvent = (item: { id: string; name?: string | null }) => {
    showMobileConfirm({
      title: t('payday.deleteTransferEvent'),
      message: t('payday.deleteTransferEventConfirm'),
      confirmText: t('common.delete'),
      onConfirm: () => deleteTransferEventMut.mutate({ eventId: item.id }),
    });
  };

  const handleExecuteTransfer = (item: PaycheckTransferEvent) => {
    executeTransferMutation.mutate({
      eventId: item.id,
      name: item.name || 'Transfer',
      amount: parseFloat(item.expectedAmount).toFixed(2),
      sourcePoolId: item.sourcePoolId || undefined,
      destinationPoolId: item.destinationPoolId || undefined,
    });
  };

  const refetchAll = () => {
    incomeSourcesQuery.refetch();
    expenseSourcesQuery.refetch();
    incomeEventsQuery.refetch();
    expenseEventsQuery.refetch();
    poolsQuery.refetch();
  };

  return {
    refreshing,
    onRefresh,
    incomeSources,
    expenseSources,
    pools,
    bankAccounts,
    rawIncomeEvents,
    rawExpenseEvents,
    rawTransferEvents,
    isLoadingIncome: incomeSourcesQuery.isLoading,
    isLoadingExpense: expenseSourcesQuery.isLoading,
    handleDeleteIncomeEvent,
    handleDeleteExpenseEvent,
    handleDeleteTransferEvent,
    handleExecuteTransfer,
    refetchAll,
  };
}
