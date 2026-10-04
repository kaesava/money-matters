import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { AppScreenWrapper } from '../../../components/AppScreenWrapper';
import { trpc } from '../../../lib/trpc';
import { authClient } from '../../../lib/auth';
import { CategoryItemModal } from '../../../components/CategoryItemModal';
import { MarkPaidModal, MarkPaidEvent } from '../../../components/MarkPaidModal';
import { CategoryDetailPoolCard } from '../../../components/categories/CategoryDetailPoolCard';
import { CategoryDetailOverviewCard } from '../../../components/categories/CategoryDetailOverviewCard';
import { CategoryDetailUpcomingSection } from '../../../components/categories/CategoryDetailUpcomingSection';
import { CategoryDetailHistorySection } from '../../../components/categories/CategoryDetailHistorySection';

export default function CategoryDetailScreen() {
  const { id, returnTo } = useLocalSearchParams<{ id: string; returnTo?: string }>();
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const [catModalVisible, setCatModalVisible] = useState(false);
  const [markPaidEvent, setMarkPaidEvent] = useState<MarkPaidEvent | null>(null);
  const [upcomingExpanded, setUpcomingExpanded] = useState(true);
  const [historyExpanded, setHistoryExpanded] = useState(true);

  const categoriesQuery = trpc.listCategories.useQuery(undefined, { enabled: !!session?.user });
  const poolsQuery = trpc.listPools.useQuery(undefined, { enabled: !!session?.user });
  const bankAccountsQuery = trpc.listBankAccounts.useQuery(undefined, { enabled: !!session?.user });
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery(undefined, {
    enabled: !!session?.user && !!id,
  });
  const txLedgerQuery = trpc.listTransactions.useQuery(
    { categoryId: id, limit: 10 },
    { enabled: !!session?.user && !!id }
  );

  const category = (categoriesQuery.data ?? []).find((c) => c.id === id);
  const pool = (poolsQuery.data ?? []).find((p) => p.id === category?.poolId);
  const bankAccount = (bankAccountsQuery.data ?? []).find((b) => b.id === pool?.bankAccountId);

  const upcomingExpenses = useMemo(() => {
    return (expenseEventsQuery.data ?? [])
      .filter((e) => e.status !== 'CONFIRMED' && e.categoryId === id)
      .sort((a, b) => a.expectedDate.localeCompare(b.expectedDate));
  }, [expenseEventsQuery.data, id]);

  const topUpcomingExpenses = upcomingExpenses.slice(0, 5);
  const recentTransactions = (txLedgerQuery.data ?? []).slice(0, 5);

  const handleBack = () => {
    if (returnTo) {
      router.push(returnTo as never);
    } else if (pool?.id) {
      router.push(`/(app)/pools/${pool.id}` as never);
    } else {
      router.back();
    }
  };

  if (categoriesQuery.isLoading || poolsQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={DESIGN_TOKENS.colors.sereneBlue} />
      </View>
    );
  }

  if (!category) {
    return (
      <AppScreenWrapper
        title={t('categories.categoryNotFound')}
        showBack
        onBackPress={handleBack}
      >
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>{t('categories.categoryNotFound')}</Text>
        </View>
      </AppScreenWrapper>
    );
  }

  return (
    <AppScreenWrapper
      title={category.name}
      showBack
      onBackPress={handleBack}
      scrollable={false}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {pool && (
          <CategoryDetailPoolCard
            pool={pool}
            bankAccount={bankAccount}
          />
        )}

        <CategoryDetailOverviewCard
          category={category}
          onEditCategory={() => setCatModalVisible(true)}
        />

        <CategoryDetailUpcomingSection
          categoryId={category.id}
          upcomingExpenses={upcomingExpenses}
          topUpcomingExpenses={topUpcomingExpenses}
          upcomingExpanded={upcomingExpanded}
          onToggleExpanded={() => setUpcomingExpanded((v) => !v)}
          onMarkPaid={(evt) => setMarkPaidEvent(evt)}
        />

        <CategoryDetailHistorySection
          categoryId={category.id}
          recentTransactions={recentTransactions}
          historyExpanded={historyExpanded}
          onToggleExpanded={() => setHistoryExpanded((v) => !v)}
        />
      </ScrollView>

      {pool && (
        <CategoryItemModal
          visible={catModalVisible}
          poolId={pool.id}
          categoryToEdit={{
            id: category.id,
            name: category.name,
            poolId: category.poolId,
            monthlyAmount: category.monthlyAmount,
            enteredAmount: category.enteredAmount,
            budgetFrequency: category.budgetFrequency as
              | 'MONTHLY'
              | 'WEEKLY'
              | 'FORTNIGHTLY'
              | 'ANNUALLY'
              | null
              | undefined,
            isEssential: category.isEssential,
          }}
          onClose={() => setCatModalVisible(false)}
          onSuccess={() => {
            categoriesQuery.refetch();
            poolsQuery.refetch();
          }}
        />
      )}

      <MarkPaidModal
        visible={!!markPaidEvent}
        event={markPaidEvent}
        onClose={() => setMarkPaidEvent(null)}
        onSuccess={() => {
          expenseEventsQuery.refetch();
          txLedgerQuery.refetch();
        }}
      />
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundContainer: {
    padding: 30,
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: 14,
    color: DESIGN_TOKENS.colors.slate[500],
  },
  scrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 60,
  },
});
