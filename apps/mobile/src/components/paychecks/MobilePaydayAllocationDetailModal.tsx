import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS, MobileModalDialog } from '@money-matters/ui/mobile';
import { formatAUD } from '../../lib/format';

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
  const D = DESIGN_TOKENS;

  if (!visible || !allocation) return null;

  const totalIncome = parseFloat(allocation.totalIncomeAmount) || 0;
  const isConfirmed = allocation.status === 'CONFIRMED';

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title="Payday Allocation Details"
      subtitle={`${allocation.incomeName} • ${allocation.expectedDate}`}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        {/* Status and Total */}
        <View style={styles.topCard}>
          <View style={styles.topCardRow}>
            <View>
              <Text style={styles.sourceTitle}>{allocation.incomeName}</Text>
              {allocation.receivingAccountName && (
                <Text style={styles.accountMeta}>
                  Deposited into {allocation.receivingAccountName}
                </Text>
              )}
            </View>

            <View style={styles.statusCol}>
              <View
                style={[
                  styles.statusBadge,
                  isConfirmed ? styles.confirmedBadge : styles.savedBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    isConfirmed ? styles.confirmedText : styles.savedText,
                  ]}
                >
                  {isConfirmed ? 'Confirmed ✓' : 'Custom Saved 💾'}
                </Text>
              </View>
              <Text style={styles.totalIncomeText}>{formatAUD(totalIncome)}</Text>
            </View>
          </View>

          {allocation.note ? (
            <Text style={styles.noteText}>Note: {allocation.note}</Text>
          ) : null}
        </View>

        {/* Lines Breakdown */}
        <View style={styles.linesSection}>
          <Text style={styles.sectionHeader}>Allocated Bucket Splits</Text>
          {allocation.lines.map((line, idx) => {
            const amt = parseFloat(line.confirmedAmount || line.proposedAmount || '0');
            return (
              <View key={line.id || idx} style={styles.lineItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.poolName}>
                    {line.poolName || 'Everyday Pool'}
                  </Text>
                  {line.reasoning ? (
                    <Text style={styles.lineReasoning}>{line.reasoning}</Text>
                  ) : null}
                </View>
                <Text style={styles.lineAmount}>{formatAUD(amt)}</Text>
              </View>
            );
          })}
        </View>

        {/* Action button */}
        {onOpenSplitStudio && !isConfirmed && (
          <TouchableOpacity
            onPress={() => {
              onClose();
              onOpenSplitStudio(allocation.incomeEventId);
            }}
            style={styles.openStudioBtn}
          >
            <Feather name="sliders" size={15} color="#FFFFFF" />
            <Text style={styles.openStudioBtnText}>Edit in Split Studio</Text>
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
  topCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 8,
  },
  topCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sourceTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  accountMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusCol: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  confirmedBadge: {
    backgroundColor: '#ECFDF5',
  },
  confirmedText: {
    color: '#047857',
  },
  savedBadge: {
    backgroundColor: '#FFFBEB',
  },
  savedText: {
    color: '#92400E',
  },
  totalIncomeText: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#2563eb',
  },
  noteText: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
  },
  linesSection: {
    gap: 8,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
  },
  poolName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B2B4B',
  },
  lineReasoning: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  lineAmount: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: '#1B2B4B',
  },
  openStudioBtn: {
    backgroundColor: '#2563eb',
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
    color: '#FFFFFF',
  },
});

export default MobilePaydayAllocationDetailModal;
