import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { formatAUD } from '../../lib/format';
import { t } from '@money-matters/i18n';

export interface LinkedPoolItem {
  id: string;
  name: string;
  poolType: string;
  currentBalance?: number | string;
  isSurplusTarget?: boolean | null;
}

export interface LinkedPoolsModalSheetProps {
  visible: boolean;
  onClose: () => void;
  accountName: string;
  pools: LinkedPoolItem[];
}

export function LinkedPoolsModalSheet({
  visible,
  onClose,
  accountName,
  pools,
}: LinkedPoolsModalSheetProps) {
  const router = useRouter();
  const D = DESIGN_TOKENS;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Linked Pools</Text>
              <Text style={styles.subtitle}>{accountName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={D.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {pools.length === 0 ? (
              <Text style={styles.emptyText}>{t('bankAccounts.reconcile.noLinkedPools')}</Text>
            ) : (
              pools.map((pool) => {
                const bal = typeof pool.currentBalance === 'number'
                  ? pool.currentBalance
                  : parseFloat(String(pool.currentBalance || '0'));

                return (
                  <TouchableOpacity
                    key={pool.id}
                    onPress={() => {
                      onClose();
                      router.push(`/(app)/pools/${pool.id}` as never);
                    }}
                    style={styles.poolCard}
                  >
                    <View style={styles.poolLeft}>
                      <View style={styles.nameRow}>
                        <Text style={styles.poolName}>{pool.name}</Text>
                        {pool.isSurplusTarget && (
                          <View style={styles.sweepBadge}>
                            <Text style={styles.sweepBadgeText}>
                              {t('bankAccounts.reconcile.sweepGoalBadge')}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.typeBadgeWrap}>
                        <Text style={styles.typeBadgeText}>
                          {pool.poolType === 'EVERYDAY'
                            ? t('poolTypes.everyday')
                            : pool.poolType === 'REGULAR'
                            ? t('poolTypes.bills')
                            : t('poolTypes.goals')}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.poolRight}>
                      <Text style={styles.poolBal}>{formatAUD(bal)}</Text>
                      <Feather name="chevron-right" size={16} color="#94A3B8" />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: D.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  list: {
    gap: 10,
    paddingBottom: 20,
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  poolCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  poolLeft: {
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  poolName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B2B4B',
  },
  sweepBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  sweepBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1E40AF',
  },
  typeBadgeWrap: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  poolRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  poolBal: {
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#334155',
  },
});
