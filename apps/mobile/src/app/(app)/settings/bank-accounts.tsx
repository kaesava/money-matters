import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  DESIGN_TOKENS,
  MobileScreenWrapper,
  BankProviderBadge,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../../lib/trpc';
import { authClient } from '../../../lib/auth';
import { formatAUD } from '../../../lib/format';
import {
  BankAccountFormModal,
  BankAccountItemToEdit,
} from '../../../components/BankAccountFormModal';
import { MobileReconciliationModal } from '../../../components/categories/MobileReconciliationModal';
import { showMobileConfirm } from '../../../components/MobileConfirmDialog';

export default function BankAccountsScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const utils = trpc.useUtils();

  const [refreshing, setRefreshing] = useState(false);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<BankAccountItemToEdit | null>(null);

  const [reconcileAccount, setReconcileAccount] = useState<any | null>(null);

  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery();
  const poolsQuery = trpc.listPools.useQuery();
  const accounts = bankAccountsQuery.data || [];
  const allPools = poolsQuery.data || [];

  const archiveAccountMut = trpc.archiveBankAccount.useMutation({
    onSuccess: () => {
      utils.listBankAccountsWithExpected.invalidate();
      utils.listBankAccounts.invalidate();
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([bankAccountsQuery.refetch(), poolsQuery.refetch()]);
    setRefreshing(false);
  };

  const handleArchive = (acc: (typeof accounts)[0]) => {
    showMobileConfirm({
      title: 'Archive Bank Account',
      message: `Are you sure you want to archive "${acc.name}"? Linked pools must be re-mapped before archival.`,
      confirmText: 'Archive',
      onConfirm: () => archiveAccountMut.mutate({ accountId: acc.id }),
    });
  };

  return (
    <MobileScreenWrapper
      title={t('settings.bankAccounts.title') || 'Linked Bank Accounts'}
      user={session?.user}
      showBack
      onBackPress={() => router.back()}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2563eb"
          />
        }
      >
        {/* Top Action Header */}
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionHeaderTitle}>Bank Accounts ({accounts.length})</Text>
            <Text style={styles.sectionHeaderSubtitle}>
              Manage physical bank accounts and balance alignment
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setAccountToEdit(null);
              setFormModalVisible(true);
            }}
            style={styles.addAccountBtn}
          >
            <Feather name="plus" size={14} color="#FFFFFF" />
            <Text style={styles.addAccountText}>Add Account</Text>
          </TouchableOpacity>
        </View>

        {/* Bank Accounts List */}
        {bankAccountsQuery.isLoading ? (
          <ActivityIndicator color="#2563eb" style={{ marginVertical: 40 }} />
        ) : accounts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="credit-card" size={32} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Bank Accounts Linked</Text>
            <Text style={styles.emptyDesc}>
              Link your checking or savings account to start allocating money into pools.
            </Text>
          </View>
        ) : (
          <View style={styles.accountsList}>
            {accounts.map((acc) => {
              const linkedPools = allPools.filter((p) => p.bankAccountId === acc.id);
              const actualBal = parseFloat(acc.lastKnownBalance || '0');
              const buffer = parseFloat(acc.unbudgetedBuffer || '0');
              const availBal = Math.max(0, actualBal - buffer);

              const poolsTotal = linkedPools.reduce(
                (sum: number, p) =>
                  sum +
                  (typeof p.currentBalance === 'number'
                    ? p.currentBalance
                    : parseFloat(p.currentBalance || '0')),
                0
              );
              const expectedBal = parseFloat(acc.expectedBalance || '0');
              const diff = Math.round((actualBal - expectedBal) * 100) / 100;
              const hasDiff = Math.abs(diff) >= 0.01;

              return (
                <View key={acc.id} style={styles.accountCard}>
                  {/* Account Header */}
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.titleRow}>
                        <BankProviderBadge
                          provider={acc.bankProvider}
                          size="sm"
                        />
                        <Text style={styles.accountName}>{acc.name}</Text>
                        {acc.isPrivate && (
                          <View style={styles.privatePill}>
                            <Text style={styles.privateText}>🔒 Private</Text>
                          </View>
                        )}
                      </View>

                      {/* Alignment State Label */}
                      {!hasDiff ? (
                        <View style={styles.balancedRow}>
                          <View style={styles.greenDot} />
                          <Text style={styles.balancedText}>
                            Expected {formatAUD(poolsTotal)}. Balanced ✓
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.diffRow}>
                          <Text style={styles.expectedText}>
                            Expected {formatAUD(poolsTotal)}.
                          </Text>
                          <TouchableOpacity
                            onPress={() =>
                              setReconcileAccount({
                                id: acc.id,
                                name: acc.name,
                                lastKnownBalance: acc.lastKnownBalance,
                                unbudgetedBuffer: acc.unbudgetedBuffer,
                                expectedBalance: expectedBal,
                                differenceAmount: diff,
                                linkedPools: linkedPools.map((p) => ({
                                  id: p.id,
                                  name: p.name,
                                  poolType: p.poolType,
                                  currentBalance:
                                    typeof p.currentBalance === 'number'
                                      ? p.currentBalance
                                      : parseFloat(p.currentBalance || '0'),
                                  isSurplusTarget: p.isSurplusTarget,
                                })),
                              })
                            }
                            style={styles.alignBtn}
                          >
                            <View style={styles.pulseDot} />
                            <Text style={styles.alignBtnText}>
                              {diff > 0
                                ? `Align Surplus (${formatAUD(diff)})`
                                : `Align Shortfall (${formatAUD(Math.abs(diff))})`}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>

                    {/* Available & Actual Balances */}
                    <View style={styles.balanceCol}>
                      <Text style={styles.balanceAmount}>{formatAUD(availBal)}</Text>
                      <Text style={styles.balanceSub}>
                        {buffer > 0
                          ? `Actual: ${formatAUD(actualBal)} (Buffer ${formatAUD(buffer)})`
                          : 'Available'}
                      </Text>
                    </View>
                  </View>

                  {/* Linked Pools Chips */}
                  <View style={styles.linkedPoolsSection}>
                    <Text style={styles.linkedLabel}>Linked Pools:</Text>
                    <View style={styles.poolsGrid}>
                      {linkedPools.length > 0 ? (
                        linkedPools.map((p) => (
                          <TouchableOpacity
                            key={p.id}
                            onPress={() => router.push(`/(app)/pools/${p.id}` as never)}
                            style={styles.poolChip}
                          >
                            <Text style={styles.poolChipName}>{p.name}</Text>
                            <Text style={styles.poolChipBal}>
                              {formatAUD(p.currentBalance)}
                            </Text>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <Text style={styles.noPoolsText}>No pools mapped</Text>
                      )}
                    </View>
                  </View>

                  {/* Actions Footer */}
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      onPress={() => {
                        setAccountToEdit({
                          id: acc.id,
                          name: acc.name,
                          bankProvider: acc.bankProvider,
                          lastKnownBalance: acc.lastKnownBalance,
                          unbudgetedBuffer: acc.unbudgetedBuffer,
                          isPrivate: acc.isPrivate,
                        });
                        setFormModalVisible(true);
                      }}
                      style={styles.cardActionBtn}
                    >
                      <Feather name="edit-2" size={13} color="#2563eb" />
                      <Text style={styles.cardActionText}>Edit Account</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setReconcileAccount(acc)}
                      style={styles.cardActionBtn}
                    >
                      <Feather name="refresh-cw" size={13} color="#D97706" />
                      <Text style={[styles.cardActionText, { color: '#D97706' }]}>
                        Align Balance
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleArchive(acc)}
                      style={styles.cardActionBtn}
                    >
                      <Feather name="archive" size={13} color="#94A3B8" />
                      <Text style={[styles.cardActionText, { color: '#94A3B8' }]}>
                        Archive
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Account Create/Edit Modal */}
      <BankAccountFormModal
        visible={formModalVisible}
        accountToEdit={accountToEdit}
        onClose={() => setFormModalVisible(false)}
        onSuccess={() => bankAccountsQuery.refetch()}
      />

      {/* Balance Reconciliation Modal */}
      <MobileReconciliationModal
        visible={!!reconcileAccount}
        account={reconcileAccount}
        onClose={() => setReconcileAccount(null)}
        onSuccess={() => bankAccountsQuery.refetch()}
      />
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 60,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  sectionHeaderSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  addAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  addAccountText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 30,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  accountsList: {
    gap: 12,
  },
  accountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  accountName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  privatePill: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  privateText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  balancedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  balancedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
  },
  diffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  expectedText: {
    fontSize: 11,
    color: '#64748B',
  },
  alignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D97706',
  },
  alignBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  balanceCol: {
    alignItems: 'flex-end',
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#1B2B4B',
  },
  balanceSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  linkedPoolsSection: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  linkedLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  poolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  poolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  poolChipName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  poolChipBal: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#2563eb',
  },
  noPoolsText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  cardActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 6,
  },
  cardActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
});
