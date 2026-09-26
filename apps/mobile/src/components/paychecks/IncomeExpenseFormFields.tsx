import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  MobileInput,
  AmountInput,
  MobileBankPicker,
  MobilePoolPicker,
  MobilePoolOption,
  RecurrenceBuilder,
  FormErrorBanner,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

interface IncomeExpenseFormFieldsProps {
  mode: 'INCOME' | 'EXPENSE';
  isEdit: boolean;
  name: string;
  amount: string;
  nameError: string;
  amountError: string;
  poolError: string;
  generalError?: string;
  poolId: string;
  categoryId: string | null;
  receivingAccountId: string;
  pickerPools: MobilePoolOption[];
  bankAccounts: any[];
  recurrenceBuilder: any;
  onNameChange: (val: string) => void;
  onAmountChange: (val: string) => void;
  onReceivingAccountIdChange: (val: string) => void;
  onPoolSelect: (pId: string, cId: string | null) => void;
}

export function IncomeExpenseFormFields({
  mode,
  isEdit,
  name,
  amount,
  nameError,
  amountError,
  poolError,
  generalError,
  poolId,
  categoryId,
  receivingAccountId,
  pickerPools,
  bankAccounts,
  recurrenceBuilder,
  onNameChange,
  onAmountChange,
  onReceivingAccountIdChange,
  onPoolSelect,
}: IncomeExpenseFormFieldsProps) {
  return (
    <View style={styles.content}>
      {generalError ? <FormErrorBanner message={generalError} /> : null}

      <MobileInput
        label={mode === 'INCOME' ? t('incomeAndBills.incomeSchedule') : t('incomeAndBills.billSchedule')}
        required
        value={name}
        onChangeText={onNameChange}
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
        onChangeText={onAmountChange}
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
            currentBalance: b.balance,
            availableBalance: b.balance,
          }))}
          selectedBankId={receivingAccountId}
          onSelectBank={onReceivingAccountIdChange}
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
          onSelectCategory={onPoolSelect}
          placeholder={t('modals.incomeExpenseForm.selectTargetPool')}
          error={poolError}
        />
      )}

      <RecurrenceBuilder builder={recurrenceBuilder} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
});
