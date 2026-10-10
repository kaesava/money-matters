import { useState } from 'react';
import { useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import { useMobileToast } from '@money-matters/ui/mobile';
import { trpc } from '../../lib/trpc';
import { useSetupWizard } from '../../context/SetupWizardContext';

export function useSetupCategoriesSubmission() {
  const router = useRouter();
  const toast = useMobileToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    isRerun,
    incomes,
    goals,
    activeCategories,
    categoryFrequencies,
    removedCategoryNames,
    totalEverydayMonthly,
    sweepQueue,
    autoCreateExpenseSchedules,
  } = useSetupWizard();

  const bankAccountsQuery = trpc.getBankAccountsWithMappings.useQuery();
  const poolsQuery = trpc.listPools.useQuery();
  const categoriesQuery = trpc.listCategories.useQuery();
  const saveSetupBudgetMut = trpc.saveSetupBudget.useMutation();

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const existingPools = poolsQuery.data || [];
      const existingEveryday = existingPools.find((p) => p.poolType === 'EVERYDAY');
      const existingRegular = existingPools.find((p) => p.poolType === 'REGULAR');
      const accountsPayload = (bankAccountsQuery.data || []).map((acc) => ({
        id: acc.id,
        name: acc.name,
        bankProvider: acc.bankProvider || 'CBA',
        lastKnownBalance: String(acc.lastKnownBalance || '0.00'),
        unbudgetedBuffer: String(acc.unbudgetedBuffer || '0.00'),
        isPrivate: Boolean(acc.isPrivate),
      }));

      const poolsPayload = [
        {
          id: existingEveryday?.id,
          name: existingEveryday?.name || 'Everyday Spending',
          poolType: 'EVERYDAY' as const,
          everydayAllowanceAmount: (totalEverydayMonthly || 1000).toFixed(2),
          isSurplusTarget: false,
          isCommitted: false,
          isPrivate: false,
        },
        {
          id: existingRegular?.id,
          name: existingRegular?.name || 'Regular Bills',
          poolType: 'REGULAR' as const,
          isSurplusTarget: false,
          isCommitted: false,
          isPrivate: false,
        },
        ...goals.map((g, idx) => ({
          id: g.id?.startsWith('g-') ? undefined : g.id,
          name: g.name,
          poolType: 'GOAL' as const,
          targetAmount: (g.targetAmount || g.monthlyAmount * 12 || 1000).toFixed(2),
          targetDate: g.dueDate || null,
          isSurplusTarget: idx === 0,
          isCommitted: true,
          isPrivate: false,
        })),
      ];

      const categoriesPayload = activeCategories.map((c) => {
        const rawFreq = categoryFrequencies[c.name];
        const budgetFreq: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY' =
          rawFreq === 'YEARLY' ? 'ANNUALLY' : 'MONTHLY';
        const catId = 'id' in c && typeof c.id === 'string' && !c.id.startsWith('temp-') ? c.id : undefined;
        return {
          id: catId,
          name: c.name,
          poolType: c.type,
          monthlyAmount: (c.monthlyAud || 0).toFixed(2),
          enteredAmount: (c.monthlyAud || 0).toFixed(2),
          budgetFrequency: budgetFreq,
          icon: c.icon || 'wallet',
          isEssential: c.type === 'REGULAR',
        };
      });

      const incomesPayload = incomes.map((inc) => {
        const freq: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'CUSTOM' =
          inc.frequency === 'WEEKLY' || inc.frequency === 'FORTNIGHTLY' || inc.frequency === 'MONTHLY'
            ? inc.frequency
            : 'CUSTOM';
        return {
          id: inc.id?.startsWith('inc-') ? undefined : inc.id,
          name: inc.name,
          type: 'SALARY' as const,
          amount: (inc.amount || 0).toFixed(2),
          frequency: freq,
          receivingAccountId: inc.receivingAccountId || null,
        };
      });

      const resolvedArchivedCatIds = Array.from(removedCategoryNames)
        .map((name) => (categoriesQuery.data || []).find((c) => c.name === name)?.id)
        .filter((id): id is string => Boolean(id));

      await saveSetupBudgetMut.mutateAsync({
        incomes: incomesPayload,
        bankAccounts: accountsPayload.length > 0 ? accountsPayload : [
          { name: 'Primary Account', bankProvider: 'CBA', lastKnownBalance: '1000.00', unbudgetedBuffer: '0.00', isPrivate: false },
        ],
        pools: poolsPayload,
        categories: categoriesPayload,
        archivedPools: sweepQueue,
        archivedCategoryIds: resolvedArchivedCatIds,
        archetypeApplied: accountsPayload.length >= 2 ? 'AUSSIE_2_ACCOUNT' : 'ALL_IN_ONE_CUSTOM',
        autoCreateExpenseSchedules,
      });

      if (isRerun) {
        toast.success(t('setup.recalibrateSuccess'));
        router.replace('/(app)/home');
      } else {
        router.replace('/(setup)/complete');
      }
    } catch {
      toast.error(t('setup.saveError'), t('setup.saveErrorTitle'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    handleFinish,
  };
}
