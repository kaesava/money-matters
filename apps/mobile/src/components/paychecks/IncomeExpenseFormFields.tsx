import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  MobileInput,
  AmountInput,
  MobileBankPicker,
  MobilePoolPicker,
  MobilePoolOption,
  MobileBankOption,
  RecurrenceBuilder,
  useRecurrenceBuilder,
  FormErrorBanner,
  FormLabel,
  DESIGN_TOKENS,
  useCurrencyLocale,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

export interface IncomeExpenseBankAccountOption {
  id: string;
  name: string;
  bankProvider?: string | null;
  lastKnownBalance?: string | null;
  accountType?: string | null;
  isPrivate?: boolean | null;
}

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
  bankAccounts: IncomeExpenseBankAccountOption[];
  recurrenceBuilder: ReturnType<typeof useRecurrenceBuilder>;
  hasPrivateEnvelopes?: boolean;
  contributionMode?: 'FULL' | 'PERCENTAGE' | 'FIXED_AMOUNT';
  onContributionModeChange?: (mode: 'FULL' | 'PERCENTAGE' | 'FIXED_AMOUNT') => void;
  contributionValue?: string;
  onContributionValueChange?: (val: string) => void;
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
  hasPrivateEnvelopes,
  contributionMode = 'FULL',
  onContributionModeChange,
  contributionValue,
  onContributionValueChange,
  onNameChange,
  onAmountChange,
  onReceivingAccountIdChange,
  onPoolSelect,
}: IncomeExpenseFormFieldsProps) {
  const { currencySymbol } = useCurrencyLocale();
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
        label={t('modals.incomeExpenseForm.expectedAmount', { symbol: currencySymbol })}
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
            currentBalance: b.lastKnownBalance,
            availableBalance: b.lastKnownBalance,
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

      {mode === 'INCOME' && !hasPrivateEnvelopes && (
        <View style={styles.sharedNoteCard}>
          <Text style={styles.sharedNoteText}>
            {t('incomeBillsTabs.householdContribution.allSharedNote')}
          </Text>
        </View>
      )}

      {mode === 'INCOME' && hasPrivateEnvelopes && (
        <View style={styles.contributionCard}>
          <FormLabel>{t('incomeBillsTabs.householdContribution.title')}</FormLabel>
          <View style={styles.contributionModesRow}>
            <TouchableOpacity
              style={[
                styles.modeBtn,
                contributionMode === 'FULL' && styles.modeBtnSelected,
              ]}
              onPress={() => onContributionModeChange?.('FULL')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.modeBtnText,
                  contributionMode === 'FULL' && styles.modeBtnTextSelected,
                ]}
                numberOfLines={1}
              >
                {t('incomeBillsTabs.householdContribution.full')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeBtn,
                contributionMode === 'PERCENTAGE' && styles.modeBtnSelected,
              ]}
              onPress={() => onContributionModeChange?.('PERCENTAGE')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.modeBtnText,
                  contributionMode === 'PERCENTAGE' && styles.modeBtnTextSelected,
                ]}
                numberOfLines={1}
              >
                {t('incomeBillsTabs.householdContribution.percentage')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeBtn,
                contributionMode === 'FIXED_AMOUNT' && styles.modeBtnSelected,
              ]}
              onPress={() => onContributionModeChange?.('FIXED_AMOUNT')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.modeBtnText,
                  contributionMode === 'FIXED_AMOUNT' && styles.modeBtnTextSelected,
                ]}
                numberOfLines={1}
              >
                {t('incomeBillsTabs.householdContribution.fixedAmount')}
              </Text>
            </TouchableOpacity>
          </View>

          {contributionMode === 'PERCENTAGE' && (
            <View style={styles.contributionInputSection}>
              <MobileInput
                label={t('incomeBillsTabs.householdContribution.modeLabel')}
                keyboardType="numeric"
                value={contributionValue || ''}
                onChangeText={(val) => onContributionValueChange?.(val)}
                placeholder={t('incomeBillsTabs.householdContribution.percentagePlaceholder')}
              />
              <Text style={styles.remainderNoteText}>
                {t('incomeBillsTabs.householdContribution.remainderNote')}
              </Text>
            </View>
          )}

          {contributionMode === 'FIXED_AMOUNT' && (
            <View style={styles.contributionInputSection}>
              <AmountInput
                label={t('incomeBillsTabs.householdContribution.modeLabel')}
                value={contributionValue || ''}
                onChangeText={(val) => onContributionValueChange?.(val)}
              />
              <Text style={styles.remainderNoteText}>
                {t('incomeBillsTabs.householdContribution.remainderNote')}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
  sharedNoteCard: {
    padding: 12,
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
  },
  sharedNoteText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[600],
    lineHeight: 16,
  },
  contributionCard: {
    padding: 12,
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    gap: 10,
  },
  contributionModesRow: {
    flexDirection: 'row',
    backgroundColor: DESIGN_TOKENS.colors.slate[200],
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnSelected: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  modeBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[600],
    textAlign: 'center',
  },
  modeBtnTextSelected: {
    color: DESIGN_TOKENS.colors.textPrimary,
    fontWeight: '700',
  },
  contributionInputSection: {
    gap: 4,
  },
  remainderNoteText: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[500],
    lineHeight: 15,
  },
});
