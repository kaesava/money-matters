import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS, MobileModalDialog } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD, formatDate } from '../../lib/format';

export interface CategoryScheduledEvent {
  id: string;
  name: string;
  amount: string | number;
  dueDate: string;
  status?: string;
}

export interface MobileCategoryDetailModalProps {
  visible: boolean;
  poolId?: string | null;
  poolName: string;
  poolType?: string;
  currentBalance?: number | string | null;
  targetAmount?: number | string | null;
  targetDate?: string | null;
  events: CategoryScheduledEvent[];
  onClose: () => void;
  onMarkPaid?: (eventId: string, amount: string, date: string) => void;
}

export function MobileCategoryDetailModal({
  visible,
  poolId: _poolId,
  poolName,
  poolType,
  currentBalance,
  targetAmount,
  targetDate,
  events,
  onClose,
  onMarkPaid,
}: MobileCategoryDetailModalProps) {
  if (!visible) return null;

  const balNum = typeof currentBalance === 'number'
    ? currentBalance
    : parseFloat(String(currentBalance || '0'));

  const targetNum = typeof targetAmount === 'number'
    ? targetAmount
    : parseFloat(String(targetAmount || '0'));

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={poolName}
      subtitle={poolType ? t(`poolTypes.${poolType.toLowerCase()}`) || poolType : undefined}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {/* Balance & Target Stat Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('paydayDrawer.tableColBalance')}</Text>
            <Text style={styles.statAmount}>{formatAUD(balNum)}</Text>
          </View>

          {targetNum > 0 && (
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>{t('paydayDrawer.tableColTarget')}</Text>
              <Text style={styles.statAmount}>{formatAUD(targetNum)}</Text>
              {targetDate && (
                <Text style={styles.targetDateText}>{formatDate(targetDate)}</Text>
              )}
            </View>
          )}
        </View>

        {/* Scheduled Expenses List */}
        <View style={styles.eventsSection}>
          <Text style={styles.sectionTitle}>
            {t('incomeBillsTabs.upcomingTimeline')} ({events.length})
          </Text>

          {events.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                {t('categoryDrawer.noExpenses')}
              </Text>
            </View>
          ) : (
            <View style={styles.eventsList}>
              {events.map((evt) => {
                const amtNum = typeof evt.amount === 'number'
                  ? evt.amount
                  : parseFloat(String(evt.amount || '0'));

                return (
                  <View key={evt.id} style={styles.eventCard}>
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventName}>{evt.name}</Text>
                      <Text style={styles.eventDate}>{formatDate(evt.dueDate)}</Text>
                    </View>

                    <View style={styles.eventActions}>
                      <Text style={styles.eventAmount}>{formatAUD(amtNum)}</Text>
                      {onMarkPaid && (
                        <TouchableOpacity
                          style={styles.markPaidBtn}
                          onPress={() => onMarkPaid(evt.id, amtNum.toFixed(2), evt.dueDate)}
                        >
                          <Feather name="check" size={12} color="#FFFFFF" />
                          <Text style={styles.markPaidBtnText}>
                            {t('common.markSpent')}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </MobileModalDialog>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statAmount: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#1B2B4B',
    marginTop: 4,
  },
  targetDateText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  eventsSection: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  emptyBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  eventsList: {
    gap: 8,
  },
  eventCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  eventInfo: {
    flex: 1,
    gap: 2,
  },
  eventName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B2B4B',
  },
  eventDate: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'monospace',
  },
  eventActions: {
    alignItems: 'flex-end',
    gap: 6,
  },
  eventAmount: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: '#BA1A1A',
  },
  markPaidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: D.colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  markPaidBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
