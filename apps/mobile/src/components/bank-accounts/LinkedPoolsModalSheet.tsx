import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DESIGN_TOKENS, MobileModalDialog } from '@money-matters/ui/mobile';
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

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={t('bankAccounts.linkedPools')}
      subtitle={accountName}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {pools.length === 0 ? (
          <Text style={styles.emptyText}>{t('bankAccounts.reconcile.noLinkedPools')}</Text>
        ) : (
          pools.map((pool) => {
            const bal =
              typeof pool.currentBalance === 'number'
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
                  <Feather
                    name="chevron-right"
                    size={16}
                    color={DESIGN_TOKENS.colors.subtleText}
                  />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
    paddingBottom: 20,
  },
  emptyText: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.subtleText,
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
    backgroundColor: DESIGN_TOKENS.colors.background,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
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
    color: DESIGN_TOKENS.colors.primary,
  },
  sweepBadge: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  sweepBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.accentDark,
  },
  typeBadgeWrap: {
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textMuted,
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
    color: DESIGN_TOKENS.colors.slate[700],
  },
});
