import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import type { TimelineEventItem, PaycheckTransferEvent } from '../PaycheckEventSection';

interface PaycheckEventActionButtonsProps {
  readonly item: TimelineEventItem;
  readonly onOpenPaydayWizard: (eventId: string) => void;
  readonly onMarkExpensePaid: (eventId: string, amount: string) => void;
  readonly onExecuteTransfer?: (event: PaycheckTransferEvent) => void;
}

export const PaycheckEventActionButtons: React.FC<PaycheckEventActionButtonsProps> = ({
  item,
  onOpenPaydayWizard,
  onMarkExpensePaid,
  onExecuteTransfer,
}) => {
  if (item.kind === 'INCOME') {
    return (
      <TouchableOpacity
        style={styles.processBtn}
        onPress={(e) => {
          e.stopPropagation();
          onOpenPaydayWizard(item.id);
        }}
      >
        <Feather name="play" size={12} color={DESIGN_TOKENS.colors.onAccent} />
        <Text style={styles.processBtnText}>{t('common.runSplit')}</Text>
      </TouchableOpacity>
    );
  }

  if (item.kind === 'TRANSFER') {
    return (
      <TouchableOpacity
        style={styles.transferBtn}
        onPress={(e) => {
          e.stopPropagation();
          if (item.rawTransfer && onExecuteTransfer) {
            onExecuteTransfer(item.rawTransfer);
          }
        }}
      >
        <Feather name="repeat" size={12} color={DESIGN_TOKENS.colors.onAccent} />
        <Text style={styles.transferBtnText}>{t('common.transfer')}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.payBtn}
      onPress={(e) => {
        e.stopPropagation();
        onMarkExpensePaid(item.id, item.expectedAmount);
      }}
    >
      <Feather name="check" size={12} color={DESIGN_TOKENS.colors.onAccent} />
      <Text style={styles.payBtnText}>{t('common.markSpent')}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  processBtn: {
    backgroundColor: DESIGN_TOKENS.colors.primary,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  processBtnText: {
    color: DESIGN_TOKENS.colors.onPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  payBtn: {
    backgroundColor: DESIGN_TOKENS.colors.successDark,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  payBtnText: {
    color: DESIGN_TOKENS.colors.onPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  transferBtn: {
    backgroundColor: DESIGN_TOKENS.colors.accent,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  transferBtnText: {
    color: DESIGN_TOKENS.colors.onAccent,
    fontSize: 12,
    fontWeight: '700',
  },
});
