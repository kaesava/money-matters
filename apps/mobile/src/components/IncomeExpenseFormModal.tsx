import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  DESIGN_TOKENS,
  MobileModalDialog,
  MobileInput,
  AmountInput,
  MobileButton,
  RecurrenceBuilder,
  useRecurrenceBuilder,
  useMobileToast,
  showMobileConfirm,
  MobileBankPicker,
  MobilePoolPicker,
  MobilePoolOption,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../lib/trpc';
import { formatIsoDate } from '../lib/format';

export interface SourceToEdit {
  id: string;
  name: string;
  amount: string;
  poolId?: string | null;
  categoryId?: string | null;
  receivingAccountId?: string | null;
  rrule?: string | null;
  startDate?: string | Date | null;
  endDate?: string | null;
  interval?: number | null;
}

interface IncomeExpenseFormModalProps {
  visible: boolean;
  mode: 'INCOME' | 'EXPENSE';
  sourceToEdit?: SourceToEdit | null;
  onClose: () => void;
  onSuccess?: () => void;
}

function parseSourceRecurrence(source?: SourceToEdit | null) {
  if (!source) {
    return {
      origIsRecurring: true,
      origFrequency: 'MONTHLY' as const,
      origInterval: 1,
    };
  }

  const origIsRecurring = !!source.rrule || !!source.startDate;

  if (source.rrule) {
    const match = source.rrule.match(/INTERVAL=(\d+)/);
    const parsedInterval = match ? parseInt(match[1], 10) : 1;

    if (source.rrule.includes('FREQ=WEEKLY')) {
      if (source.rrule.includes('FREQ=WEEKLY;INTERVAL=2') || (parsedInterval > 1 && parsedInterval % 2 === 0)) {
        return {
          origIsRecurring,
          origFrequency: 'FORTNIGHTLY' as const,
          origInterval: Math.max(1, Math.floor(parsedInterval / 2)),
        };
      }
      return {
        origIsRecurring,
        origFrequency: 'WEEKLY' as const,
        origInterval: parsedInterval,
      };
    } else if (source.rrule.includes('FREQ=YEARLY') || source.rrule.includes('FREQ=ANNUALLY')) {
      return {
        origIsRecurring,
        origFrequency: 'ANNUALLY' as const,
        origInterval: parsedInterval,
      };
    } else if (source.rrule.includes('FREQ=MONTHLY')) {
      return {
        origIsRecurring,
        origFrequency: 'MONTHLY' as const,
        origInterval: parsedInterval,
      };
    }
  }

  return {
    origIsRecurring,
    origFrequency: 'MONTHLY' as const,
    origInterval: 1,
  };
}

export function IncomeExpenseFormModal({
  visible,
  mode,
  sourceToEdit,
  onClose,
  onSuccess,
}: IncomeExpenseFormModalProps) {
  const toast = useMobileToast();
  const isEdit = Boolean(sourceToEdit);

  // Queries
  const poolsQuery = trpc.listPools.useQuery(undefined, { enabled: visible && mode === 'EXPENSE' });
  const categoriesQuery = trpc.listCategories.useQuery(undefined, { enabled: visible && mode === 'EXPENSE' });
  const bankAccountsQuery = trpc.listBankAccounts.useQuery(undefined, { enabled: visible && mode === 'INCOME' });

  const rawPools = poolsQuery.data ?? [];
  const rawCategories = categoriesQuery.data ?? [];
  const bankAccounts = bankAccountsQuery.data ?? [];

  const pickerPools: MobilePoolOption[] = useMemo(() => {
    return rawPools.map((p) => ({
      id: p.id,
      name: p.name,
      poolType: p.poolType,
      currentBalance: p.currentBalance,
      isPrivate: p.isPrivate,
      categories: rawCategories
        .filter((c) => c.poolId === p.id)
        .map((c) => ({ id: c.id, name: c.name })),
    }));
  }, [rawPools, rawCategories]);

  // Form State
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [poolId, setPoolId] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [receivingAccountId, setReceivingAccountId] = useState('');

  const [nameError, setNameError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [poolError, setPoolError] = useState('');

  const recurrenceBuilder = useRecurrenceBuilder();
  const {
    frequency,
    isRecurring,
    interval,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    setIsRecurring,
    setFrequency,
    setInterval,
  } = recurrenceBuilder;

  useEffect(() => {
    if (sourceToEdit) {
      setName(sourceToEdit.name || '');
      setAmount(sourceToEdit.amount || '');
      setPoolId(sourceToEdit.poolId || '');
      setCategoryId(sourceToEdit.categoryId || null);
      setReceivingAccountId(sourceToEdit.receivingAccountId || '');

      const { origIsRecurring, origFrequency, origInterval } = parseSourceRecurrence(sourceToEdit);
      setIsRecurring(origIsRecurring);
      setFrequency(origFrequency);
      setInterval(origInterval);

      if (sourceToEdit.startDate) {
        setStartDate(formatIsoDate(sourceToEdit.startDate));
      } else {
        setStartDate(formatIsoDate(new Date()));
      }
      if (sourceToEdit.endDate) {
        setEndDate(formatIsoDate(sourceToEdit.endDate));
      } else {
        setEndDate('');
      }
    } else {
      setName('');
      setAmount('');
      setPoolId(rawPools.find((p) => p.poolType === 'REGULAR')?.id || rawPools[0]?.id || '');
      setCategoryId(null);
      setReceivingAccountId(bankAccounts[0]?.id || '');
      setIsRecurring(true);
      setFrequency('MONTHLY');
      setInterval(1);
      setStartDate(formatIsoDate(new Date()));
      setEndDate('');
    }
    setNameError('');
    setAmountError('');
    setPoolError('');
  }, [sourceToEdit, visible, rawPools.length, bankAccounts.length]);

  // Mutations
  const createIncomeMut = trpc.createIncomeSource.useMutation();
  const updateIncomeMut = trpc.updateIncomeSource.useMutation();
  const archiveIncomeMut = trpc.archiveIncomeSource.useMutation();

  const createExpenseMut = trpc.createExpenseSource.useMutation();
  const updateExpenseMut = trpc.updateExpenseSource.useMutation();
  const archiveExpenseMut = trpc.archiveExpenseSource.useMutation();

  const isPending =
    createIncomeMut.isPending ||
    updateIncomeMut.isPending ||
    archiveIncomeMut.isPending ||
    createExpenseMut.isPending ||
    updateExpenseMut.isPending ||
    archiveExpenseMut.isPending;

  // Accurate Dirty Checking
  const isDirty = useMemo(() => {
    if (!sourceToEdit) {
      return name.trim() !== '' || amount.trim() !== '';
    }
    const origStartDate = sourceToEdit.startDate ? formatIsoDate(sourceToEdit.startDate) : formatIsoDate(new Date());
    const origEndDate = sourceToEdit.endDate ? formatIsoDate(sourceToEdit.endDate) : '';
    const { origIsRecurring, origFrequency, origInterval } = parseSourceRecurrence(sourceToEdit);

    return (
      name !== (sourceToEdit.name || '') ||
      amount !== (sourceToEdit.amount || '') ||
      poolId !== (sourceToEdit.poolId || '') ||
      categoryId !== (sourceToEdit.categoryId || null) ||
      receivingAccountId !== (sourceToEdit.receivingAccountId || '') ||
      isRecurring !== origIsRecurring ||
      frequency !== origFrequency ||
      (interval || 1) !== origInterval ||
      startDate !== origStartDate ||
      (endDate || '') !== origEndDate
    );
  }, [
    name,
    amount,
    poolId,
    categoryId,
    receivingAccountId,
    isRecurring,
    frequency,
    interval,
    startDate,
    endDate,
    sourceToEdit,
  ]);

  const isScheduleRuleChanged = useMemo(() => {
    if (!sourceToEdit) return false;
    const origStartDate = sourceToEdit.startDate ? formatIsoDate(sourceToEdit.startDate) : formatIsoDate(new Date());
    const origEndDate = sourceToEdit.endDate ? formatIsoDate(sourceToEdit.endDate) : '';
    const { origIsRecurring, origFrequency, origInterval } = parseSourceRecurrence(sourceToEdit);

    return (
      isRecurring !== origIsRecurring ||
      frequency !== origFrequency ||
      (interval || 1) !== origInterval ||
      startDate !== origStartDate ||
      (endDate || '') !== origEndDate
    );
  }, [isRecurring, frequency, interval, startDate, endDate, sourceToEdit]);

  const isValid =
    name.trim() !== '' &&
    amount.trim() !== '' &&
    parseFloat(amount) > 0 &&
    (mode !== 'EXPENSE' || !!poolId);

  // Archive Action
  const handleArchive = () => {
    if (!sourceToEdit) return;
    showMobileConfirm({
      title:
        mode === 'INCOME'
          ? t('modals.incomeExpenseForm.archiveIncomeTitle')
          : t('modals.incomeExpenseForm.archiveExpenseTitle'),
      message:
        mode === 'INCOME'
          ? t('modals.incomeExpenseForm.archiveIncomeConfirm')
          : t('modals.incomeExpenseForm.archiveExpenseConfirm'),
      confirmText: t('modals.incomeExpenseForm.archiveSchedule'),
      isDestructive: true,
      onConfirm: async () => {
        try {
          if (mode === 'INCOME') {
            await archiveIncomeMut.mutateAsync({ id: sourceToEdit.id });
          } else {
            await archiveExpenseMut.mutateAsync({ id: sourceToEdit.id });
          }
          toast.success(t('toasts.archived'));
          onSuccess?.();
          onClose();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t('modals.incomeExpenseForm.failedToArchive'));
        }
      },
    });
  };

  // Execution
  const executeSave = async () => {
    const formattedAmount = parseFloat(amount).toFixed(2);
    try {
      if (mode === 'INCOME') {
        if (isEdit && sourceToEdit) {
          const res = await updateIncomeMut.mutateAsync({
            id: sourceToEdit.id,
            data: {
              name: name.trim(),
              amount: formattedAmount,
              receivingAccountId: receivingAccountId || undefined,
              isRecurring,
              frequency: isRecurring ? frequency : undefined,
              interval: isRecurring ? (interval || 1) : undefined,
              startDate: startDate || undefined,
              endDate: isRecurring && endDate ? endDate : undefined,
            },
          });
          if (res?.hasConfirmedHistory) {
            toast.info(t('modals.updateSchedule.confirmDescDetailChange'));
          }
          toast.success('Income schedule updated successfully.');
        } else {
          await createIncomeMut.mutateAsync({
            name: name.trim(),
            amount: formattedAmount,
            receivingAccountId: receivingAccountId || undefined,
            isRecurring,
            frequency: isRecurring ? frequency : undefined,
            interval: isRecurring ? (interval || 1) : undefined,
            startDate: startDate || undefined,
            endDate: isRecurring && endDate ? endDate : undefined,
          });
          toast.success(
            isRecurring ? t('toasts.saved') : 'One-off income saved to Upcoming Timeline.'
          );
        }
      } else {
        if (isEdit && sourceToEdit) {
          await updateExpenseMut.mutateAsync({
            id: sourceToEdit.id,
            data: {
              name: name.trim(),
              amount: formattedAmount,
              poolId,
              categoryId: categoryId || undefined,
              isRecurring,
              frequency: isRecurring ? frequency : undefined,
              interval: isRecurring ? (interval || 1) : undefined,
              startDate: startDate || undefined,
              endDate: isRecurring && endDate ? endDate : undefined,
            },
          });
          toast.success('Bill schedule updated successfully.');
        } else {
          await createExpenseMut.mutateAsync({
            name: name.trim(),
            amount: formattedAmount,
            poolId,
            categoryId: categoryId || undefined,
            isRecurring,
            frequency: isRecurring ? frequency : undefined,
            interval: isRecurring ? (interval || 1) : undefined,
            startDate: startDate || undefined,
            endDate: isRecurring && endDate ? endDate : undefined,
          });
          toast.success(
            isRecurring ? t('toasts.saved') : 'One-off bill saved to Upcoming Timeline.'
          );
        }
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const handleSubmit = () => {
    let hasErr = false;
    if (!name.trim()) {
      setNameError('Name is required.');
      hasErr = true;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setAmountError('Please enter a valid positive amount.');
      hasErr = true;
    }
    if (mode === 'EXPENSE' && !poolId) {
      setPoolError('Expense sources MUST be assigned to a Pool.');
      hasErr = true;
    }

    if (hasErr) return;

    if (isEdit) {
      showMobileConfirm({
        title:
          mode === 'INCOME'
            ? t('modals.updateSchedule.confirmTitleIncome')
            : t('modals.updateSchedule.confirmTitleExpense'),
        message: isScheduleRuleChanged
          ? t('modals.updateSchedule.confirmDescRuleChange', { startDate })
          : t('modals.updateSchedule.confirmDescDetailChange'),
        confirmText: t('modals.updateSchedule.confirmCta'),
        onConfirm: executeSave,
      });
    } else {
      executeSave();
    }
  };

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      isDirty={isDirty}
      title={
        isEdit
          ? mode === 'INCOME'
            ? t('modals.incomeExpenseForm.titleEditIncome')
            : t('modals.incomeExpenseForm.titleEditExpense')
          : mode === 'INCOME'
          ? t('modals.incomeExpenseForm.titleAddIncome')
          : t('modals.incomeExpenseForm.titleAddExpense')
      }
      footer={
        <View style={styles.footerRow}>
          {isEdit ? (
            <TouchableOpacity
              onPress={handleArchive}
              disabled={isPending}
              style={styles.archiveLink}
            >
              <Text style={styles.archiveLinkText}>
                {t('modals.incomeExpenseForm.archiveSchedule')}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          <MobileButton
            variant="primary"
            loading={isPending}
            disabled={!isDirty || !isValid || isPending}
            onPress={handleSubmit}
            title={isEdit ? t('common.update') : t('common.create')}
            style={styles.submitBtn}
          />
        </View>
      }
    >
      <View style={styles.content}>
        <MobileInput
          label={mode === 'INCOME' ? t('incomeAndBills.incomeSchedule') : t('incomeAndBills.billSchedule')}
          required
          value={name}
          onChangeText={(val) => {
            setName(val);
            if (nameError) setNameError('');
          }}
          placeholder={
            mode === 'INCOME'
              ? t('modals.incomeExpenseForm.placeholderIncomeName')
              : t('modals.incomeExpenseForm.placeholderExpenseName')
          }
          error={nameError}
          autoFocus={!isEdit}
        />

        <AmountInput
          label={t('modals.incomeExpenseForm.expectedAmount', { symbol: '$' })}
          required
          value={amount}
          onChangeText={(val) => {
            setAmount(val);
            if (amountError) setAmountError('');
          }}
          placeholder="0.00"
          error={amountError}
        />

        {mode === 'INCOME' && (
          <MobileBankPicker
            displayStyle="field"
            label={t('modals.incomeExpenseForm.receivingBankAccount')}
            banks={bankAccounts.map((b) => ({
              id: b.id,
              name: b.name,
              institution: b.bankProvider,
            }))}
            selectedBankId={receivingAccountId}
            onSelectBank={setReceivingAccountId}
            allowAllOption={false}
            placeholder={t('modals.incomeExpenseForm.defaultMainAccount')}
          />
        )}

        {mode === 'EXPENSE' && (
          <MobilePoolPicker
            displayStyle="field"
            label={t('modals.incomeExpenseForm.assignedPool')}
            required
            pools={pickerPools}
            selectedPoolId={poolId}
            selectedCategoryId={categoryId}
            allowAllOption={false}
            allowCategorySelection={true}
            onSelectCategory={(pId, cId) => {
              setPoolId(pId);
              setCategoryId(cId);
              if (poolError) setPoolError('');
            }}
            placeholder={t('modals.incomeExpenseForm.selectTargetPool')}
            error={poolError}
          />
        )}

        <RecurrenceBuilder builder={recurrenceBuilder} />
      </View>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  archiveLink: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  archiveLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  submitBtn: {
    minWidth: 120,
  },
});
