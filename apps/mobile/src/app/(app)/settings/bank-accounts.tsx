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
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../../lib/trpc';
import { authClient } from '../../../lib/auth';
import {
  BankAccountFormModal,
  BankAccountItemToEdit,
} from '../../../components/BankAccountFormModal';
import { MobileReconciliationModal } from '../../../components/categories/MobileReconciliationModal';
import { BankAccountCard } from '../../../components/bank-accounts/BankAccountCard';
import {
  LinkedPoolsModalSheet,
  LinkedPoolItem,
} from '../../../components/bank-accounts/LinkedPoolsModalSheet';
import { QuickExpenseModal } from '../../../components/QuickExpenseModal';

export default function BankAccountsScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const [refreshing, setRefreshing] = useState(false);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<BankAccountItemToEdit | null>(null);

  const [reconcileAccount, setReconcileAccount] = useState<any | null>(null);
  const [poolsSheetAccount, setPoolsSheetAccount] = useState<{
    name: string;
    pools: LinkedPoolItem[];
  } | null>(null);
  const [transferModalVisible, setTransferModalVisible] = useState(false);

  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery();
  const poolsQuery = trpc.listPools.useQuery();
  const accounts = bankAccountsQuery.data || [];
  const allPools = poolsQuery.data || [];

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([bankAccountsQuery.refetch(), poolsQuery.refetch()]);
    setRefreshing(false);
  };

  return (
    <MobileScreenWrapper
      title={t('settings.accounts')}
      user={session?.user}
      showBack
      onBackPress={() => router.back()}
      infoTooltip={{
        title: t('tooltips.bankAccounts.title'),
        content: t('tooltips.bankAccounts.content'),
      }}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={DESIGN_TOKENS.colors.sereneBlue}
          />
        }
      >
        {/* Top Action Header */}
        <View style={styles.topRow}>
          <View style={styles.headerTextCol}>
            <Text style={styles.sectionHeaderTitle}>
              {t('settings.accounts')} ({accounts.length})
            </Text>
            <Text style={styles.sectionHeaderSubtitle}>
              {t('tooltips.bankAccounts.content')}
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
            <Text style={styles.addAccountText}>
              {t('settings.bankAccounts.addAccount')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bank Accounts List */}
        {bankAccountsQuery.isLoading ? (
          <ActivityIndicator color={DESIGN_TOKENS.colors.sereneBlue} style={styles.loader} />
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
              const linkedPools: LinkedPoolItem[] = allPools.filter((p) => p.bankAccountId === acc.id);

              return (
                <BankAccountCard
                  key={acc.id}
                  account={acc}
                  linkedPools={linkedPools}
                  onPressEdit={() => {
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
                  onPressAlign={() =>
                    setReconcileAccount({
                      id: acc.id,
                      name: acc.name,
                      lastKnownBalance: acc.lastKnownBalance,
                      unbudgetedBuffer: acc.unbudgetedBuffer,
                      expectedBalance: acc.expectedBalance,
                      linkedPools,
                    })
                  }
                  onPressPool={(poolId) => router.push(`/(app)/pools/${poolId}` as never)}
                  onPressMorePools={() =>
                    setPoolsSheetAccount({
                      name: acc.name,
                      pools: linkedPools,
                    })
                  }
                />
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
        onNeedsReconciliation={(accToReconcile) => setReconcileAccount(accToReconcile)}
      />

      {/* Balance Reconciliation Modal */}
      <MobileReconciliationModal
        visible={!!reconcileAccount}
        account={reconcileAccount}
        onClose={() => setReconcileAccount(null)}
        onSuccess={() => {
          bankAccountsQuery.refetch();
          poolsQuery.refetch();
        }}
        onOpenTransfer={() => {
          setReconcileAccount(null);
          setTransferModalVisible(true);
        }}
      />

      {/* Linked Pools Sheet */}
      {poolsSheetAccount && (
        <LinkedPoolsModalSheet
          visible={!!poolsSheetAccount}
          onClose={() => setPoolsSheetAccount(null)}
          accountName={poolsSheetAccount.name}
          pools={poolsSheetAccount.pools}
        />
      )}

      {/* Transfer Between Pools Modal */}
      <QuickExpenseModal
        visible={transferModalVisible}
        initialType="TRANSFER"
        onClose={() => setTransferModalVisible(false)}
        onSuccess={() => {
          bankAccountsQuery.refetch();
          poolsQuery.refetch();
        }}
      />
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 90,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTextCol: {
    flex: 1,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addAccountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loader: {
    marginVertical: 40,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1B2B4B',
    marginTop: 8,
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
});
