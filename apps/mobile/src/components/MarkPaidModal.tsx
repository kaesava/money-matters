import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  DESIGN_TOKENS,
  MobileModalDialog,
  AmountInput,
  MobileDatePickerField,
  MobileButton,
  FormErrorBanner,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD, formatDate } from '../lib/format';
import { MarkPaidTargetPoolCard } from './mark-paid/MarkPaidTargetPoolCard';
import { MarkPaidShortfallSection } from './mark-paid/MarkPaidShortfallSection';
import { MarkPaidEvent } from './mark-paid/mark-paid-types';
import { useMarkPaidForm } from './mark-paid/useMarkPaidForm';

export type { MarkPaidEvent };

export interface MarkPaidModalProps {
  visible: boolean;
  event: MarkPaidEvent | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function MarkPaidModal({
  visible,
  event,
  onClose,
  onSuccess,
}: MarkPaidModalProps) {
  const {
    actualAmount,
    setActualAmount,
    actualDate,
    setActualDate,
    wasFutureDate,
    originalDate,
    currentPool,
    poolBal,
    shortfallAmount,
    hasShortfall,
    groupedPools,
    expandedGroups,
    transferAmounts,
    totalAllocated,
    shortfallValidation,
    toggleGroup,
    handleAmountChange,
    handleConfirm,
    submitting,
    generalError,
    isValid,
    isAmountValid,
    isDateValid,
  } = useMarkPaidForm(visible, event, onClose, onSuccess);

  if (!visible || !event) return null;

  const formattedPoolType = currentPool?.poolType === 'EVERYDAY'
    ? 'Everyday'
    : currentPool?.poolType === 'REGULAR'
    ? 'Bills'
    : 'Goal';
  const formattedPoolName = currentPool?.name || 'Pool';

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={t('incomeBillsTabs.markSpentModalTitle')}
      footer={
        <View style={styles.footerRow}>
          <MobileButton
            variant="ghost"
            onPress={onClose}
            disabled={submitting}
            style={styles.cancelBtn}
          >
            {t('common.cancel')}
          </MobileButton>
          <MobileButton
            variant="primary"
            onPress={handleConfirm}
            loading={submitting}
            disabled={!isValid || submitting}
            style={styles.confirmBtn}
          >
            {hasShortfall
              ? t('incomeBillsTabs.confirmTransferAndSpend')
              : t('common.markSpent')}
          </MobileButton>
        </View>
      }
    >
      <View style={styles.content}>
        <FormErrorBanner message={generalError} />

        <MarkPaidTargetPoolCard
          poolName={formattedPoolName}
          poolType={formattedPoolType}
          poolBalance={poolBal}
        />

        <View style={styles.inputRow}>
          <View style={styles.flex1}>
            <AmountInput
              label={t('common.amount')}
              required
              value={actualAmount}
              onChangeText={setActualAmount}
              error={!isAmountValid && Boolean(actualAmount) ? 'Amount must be > $0' : undefined}
            />
          </View>
          <View style={styles.flex1}>
            <MobileDatePickerField
              label={t('common.date')}
              required
              value={actualDate}
              onChange={setActualDate}
              error={!isDateValid ? 'Date cannot be in future' : undefined}
            />
          </View>
        </View>

        {wasFutureDate && (
          <View style={styles.infoBanner}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={styles.infoText}>
              {t('incomeBillsTabs.expenseFutureDateAdjustedNotice', {
                date: formatDate(originalDate),
              })}
            </Text>
          </View>
        )}

        {hasShortfall ? (
          <MarkPaidShortfallSection
            eventName={event.name}
            formattedPoolType={formattedPoolType}
            formattedPoolName={formattedPoolName}
            shortfallAmount={shortfallAmount}
            groupedPools={groupedPools}
            expandedGroups={expandedGroups}
            transferAmounts={transferAmounts}
            totalAllocated={totalAllocated}
            shortfallValidation={shortfallValidation}
            onToggleGroup={toggleGroup}
            onAmountChange={handleAmountChange}
          />
        ) : (
          <View style={styles.sufficientBanner}>
            <Feather name="check-circle" size={16} color={DESIGN_TOKENS.colors.successDark} style={{ marginTop: 1 }} />
            <Text style={styles.sufficientText}>
              {t('incomeBillsTabs.sufficientBalanceNotice', {
                poolName: formattedPoolName,
                balance: formatAUD(poolBal),
              })}
            </Text>
          </View>
        )}
      </View>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingVertical: 4,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
    borderRadius: 10,
    padding: 10,
  },
  infoIcon: {
    fontSize: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: DESIGN_TOKENS.colors.accentDark,
    fontWeight: '500',
  },
  sufficientBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.successBorder,
    borderRadius: 10,
    padding: 12,
  },
  sufficientText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: DESIGN_TOKENS.colors.successDark,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  cancelBtn: {
    minWidth: 80,
  },
  confirmBtn: {
    minWidth: 120,
  },
});

export default MarkPaidModal;
