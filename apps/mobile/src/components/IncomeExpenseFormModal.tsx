import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  MobileModalDialog,
  MobileButton,
  showMobileConfirm,
  MobileEnvelopeOption,
  validateHouseholdContribution,
  resolveHouseholdContributionPayload,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../lib/trpc';
import { IncomeExpenseFormFields } from './plan/IncomeExpenseFormFields';
import { useIncomeExpenseForm } from './plan/useIncomeExpenseForm';
import { useIncomeExpenseMutations } from './plan/useIncomeExpenseMutations';

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
  contributionMode?: 'FULL' | 'PERCENTAGE' | 'FIXED_AMOUNT';
  contributionValue?: string | null;
}

interface IncomeExpenseFormModalProps {
  visible: boolean;
  mode: 'INCOME' | 'EXPENSE';
  sourceToEdit?: SourceToEdit | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function IncomeExpenseFormModal({
  visible,
  mode,
  sourceToEdit,
  onClose,
  onSuccess,
}: IncomeExpenseFormModalProps) {
  const isEdit = Boolean(sourceToEdit);

  const poolsQuery = trpc.listEnvelopes.useQuery(undefined, { enabled: visible });
  const bankAccountsQuery = trpc.listBankAccounts.useQuery(undefined, { enabled: visible && mode === 'INCOME' });

  const rawPools = poolsQuery.data ?? [];
  const bankAccounts = bankAccountsQuery.data ?? [];
  const hasPrivateEnvelopes = useMemo(() => rawPools.some((p) => p.isPrivate), [rawPools]);

  const pickerPools: MobileEnvelopeOption[] = useMemo(() => {
    return rawPools.map((p) => ({
      id: p.id,
      name: p.name,
      poolType: p.envelopeType,
      currentBalance: p.currentBalance,
      isPrivate: p.isPrivate,
      categories: [],
    }));
  }, [rawPools]);

  const {
    name,
    amount,
    poolId,
    categoryId,
    receivingAccountId,
    contributionMode,
    contributionValue,
    nameError,
    amountError,
    poolError,
    isDirty,
    isValid,
    isScheduleRuleChanged,
    isEndDateInvalid,
    recurrenceBuilder,
    setName,
    setAmount,
    setPoolId,
    setCategoryId,
    setReceivingAccountId,
    setContributionMode,
    setContributionValue,
    setNameError,
    setAmountError,
    setPoolError,
  } = useIncomeExpenseForm(visible, sourceToEdit, rawPools, bankAccounts, mode);

  const { isPending, handleArchive, executeSave } = useIncomeExpenseMutations({
    mode,
    isEdit,
    sourceToEdit,
    onSuccess,
    onClose,
  });

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
    if (isEndDateInvalid) {
      hasErr = true;
    }

    if (mode === 'INCOME') {
      const contributionErr = validateHouseholdContribution({
        hasPrivateEnvelopes,
        contributionMode,
        contributionValue,
        expectedAmount: amount,
      });
      if (contributionErr) {
        setAmountError(contributionErr);
        hasErr = true;
      }
    }

    if (hasErr) return;

    const contributionPayload = resolveHouseholdContributionPayload({
      hasPrivateEnvelopes,
      contributionMode,
      contributionValue,
    });

    const saveAction = () => {
      executeSave({
        name,
        amount,
        receivingAccountId,
        poolId,
        categoryId,
        isRecurring: recurrenceBuilder.isRecurring,
        frequency: recurrenceBuilder.frequency,
        interval: recurrenceBuilder.interval,
        startDate: recurrenceBuilder.startDate,
        endDate: recurrenceBuilder.endDate || undefined,
        ...contributionPayload,
      });
    };

    if (isEdit) {
      showMobileConfirm({
        title:
          mode === 'INCOME'
            ? t('modals.updateSchedule.confirmTitleIncome')
            : t('modals.updateSchedule.confirmTitleExpense'),
        message: isScheduleRuleChanged
          ? t('modals.updateSchedule.confirmDescRuleChange', { startDate: recurrenceBuilder.startDate })
          : t('modals.updateSchedule.confirmDescDetailChange'),
        confirmText: t('modals.updateSchedule.confirmCta'),
        onConfirm: saveAction,
      });
    } else {
      saveAction();
    }
  };

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      isDirty={isDirty}
      title={
        isEdit
          ? (sourceToEdit?.name || '')
          : mode === 'INCOME'
          ? t('planTabs.addIncomeSchedule')
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
      <IncomeExpenseFormFields
        mode={mode}
        isEdit={isEdit}
        name={name}
        amount={amount}
        nameError={nameError}
        amountError={amountError}
        poolError={poolError}
        generalError={isEndDateInvalid ? t('modals.incomeExpenseForm.endDateBeforeStartDate') : undefined}
        poolId={poolId}
        categoryId={categoryId}
        receivingAccountId={receivingAccountId}
        pickerPools={pickerPools}
        bankAccounts={bankAccounts}
        recurrenceBuilder={recurrenceBuilder}
        hasPrivateEnvelopes={hasPrivateEnvelopes}
        contributionMode={contributionMode}
        onContributionModeChange={setContributionMode}
        contributionValue={contributionValue}
        onContributionValueChange={setContributionValue}
        onNameChange={(val) => {
          setName(val);
          if (nameError) setNameError('');
        }}
        onAmountChange={(val) => {
          setAmount(val);
          if (amountError) setAmountError('');
        }}
        onReceivingAccountIdChange={setReceivingAccountId}
        onPoolSelect={(pId, cId) => {
          setPoolId(pId);
          setCategoryId(cId);
          if (poolError) setPoolError('');
        }}
      />
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
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
