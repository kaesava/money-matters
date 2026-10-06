import React from 'react';
import {
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS, MobileModalDialog } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatDate } from '../../lib/format';
import { AllocationDetailHeader } from './allocation-detail/AllocationDetailHeader';
import { AllocationDetailLinesList } from './allocation-detail/AllocationDetailLinesList';

export interface MobilePaydayAllocationRecord {
  id: string;
  incomeEventId: string;
  incomeName: string;
  expectedDate: string;
  actualDate?: string | null;
  totalIncomeAmount: string;
  status: string;
  receivingAccountName?: string | null;
  note?: string | null;
  createdAt?: string | Date | null;
  lines: Array<{
    id?: string;
    poolId: string;
    poolName: string | null;
    proposedAmount: string;
    confirmedAmount: string | null;
    reasoning: string | null;
  }>;
}

export interface MobilePaydayAllocationDetailModalProps {
  visible: boolean;
  allocation: MobilePaydayAllocationRecord | null;
  onClose: () => void;
  onOpenSplitStudio?: (incomeEventId: string) => void;
}

export function MobilePaydayAllocationDetailModal({
  visible,
  allocation,
  onClose,
  onOpenSplitStudio,
}: MobilePaydayAllocationDetailModalProps) {
  if (!visible || !allocation) return null;

  const totalIncome = parseFloat(allocation.totalIncomeAmount) || 0;
  const isConfirmed = allocation.status === 'CONFIRMED';

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={t('paydayDrawer.incomeSplitDetails')}
      subtitle={`${allocation.incomeName} • ${formatDate(allocation.expectedDate)}`}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <AllocationDetailHeader
          allocation={allocation}
          totalIncome={totalIncome}
          isConfirmed={isConfirmed}
        />

        <AllocationDetailLinesList lines={allocation.lines} />

        {onOpenSplitStudio && !isConfirmed && (
          <TouchableOpacity
            onPress={() => {
              onClose();
              onOpenSplitStudio(allocation.incomeEventId);
            }}
            style={styles.openStudioBtn}
          >
            <Feather name="sliders" size={15} color={DESIGN_TOKENS.colors.onAccent} />
            <Text style={styles.openStudioBtnText}>{t('paydayDrawer.reviewIncome')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 14,
    paddingBottom: 10,
  },
  openStudioBtn: {
    backgroundColor: DESIGN_TOKENS.colors.accent,
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  openStudioBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.onAccent,
  },
});

export default MobilePaydayAllocationDetailModal;
