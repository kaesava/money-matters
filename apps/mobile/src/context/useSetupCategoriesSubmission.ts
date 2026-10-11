import { useState } from 'react';
import { useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import { useMobileToast } from '@money-matters/ui/mobile';
import { trpc } from '../lib/trpc';
import { useSetupWizard } from './SetupWizardContext';

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
  const saveSetupBudgetMut = trpc.saveSetupBudget.useMutation();

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const accountsPayload = (bankAccountsQuery.data || []).map((acc) => ({
        id: acc.id,
        name: acc.name,
        bankProvider: acc.bankProvider || 'CBA',
        lastKnownBalance: String(acc.lastKnownBalance || '0.00'),
        unbudgetedBuffer: String(acc.unbudgetedBuffer || '0.00'),
        isPrivate: Boolean(acc.isPrivate),
      }));

      const envelopesPayload = [
        ...activeCategories.map((c, idx) => {
          const rawFreq = categoryFrequencies[c.name];
          const budgetFreq: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY' =
            rawFreq === 'YEARLY' ? 'ANNUALLY' : 'MONTHLY';
          const catId = 'id' in c && typeof c.id === 'string' && !c.id.startsWith('temp-') ? c.id : undefined;
          const isEveryday = c.type === 'EVERYDAY';
          const isBill = c.type === 'REGULAR';
          return {
            id: catId,
            bankAccountId: accountsPayload[0]?.id,
            name: c.name,
            envelopeType: (isEveryday ? 'EVERYDAY' : isBill ? 'SCHEDULED_BILL' : 'TARGET_GOAL') as 'EVERYDAY' | 'SCHEDULED_BILL' | 'TARGET_GOAL',
            monthlyAmount: (c.monthlyAud || 0).toFixed(2),
            enteredAmount: (c.monthlyAud || 0).toFixed(2),
            budgetFrequency: budgetFreq,
            icon: c.icon || 'wallet',
            isEssential: isBill,
            orderIndex: idx,
          };
        }),
        ...goals.map((g, idx) => ({
          id: g.id?.startsWith('g-') ? undefined : g.id,
          bankAccountId: accountsPayload[0]?.id,
          name: g.name,
          envelopeType: (g.goalMode === 'ONGOING' ? 'ONGOING_GOAL' : 'TARGET_GOAL') as 'ONGOING_GOAL' | 'TARGET_GOAL',
          goalMode: g.goalMode ?? (g.dueDate ? 'TARGET_DATE' : 'ONGOING'),
          targetAmount: (g.goalMode === 'ONGOING'
            ? g.monthlyAmount || g.targetAmount || 250
            : g.targetAmount || g.monthlyAmount * 12 || 1000
          ).toFixed(2),
          targetDate: g.goalMode === 'ONGOING' ? null : g.dueDate || null,
          enteredAmount: g.enteredAmount ? g.enteredAmount.toFixed(2) : undefined,
          budgetFrequency: g.budgetFrequency,
          startDate: g.startDate,
          rrule: g.rrule,
          isSurplusTarget: idx === 0,
          isCommitted: true,
          isPrivate: false,
          orderIndex: activeCategories.length + idx,
        })),
      ];

      const incomesPayload = incomes.map((inc) => {
        const incType: 'SALARY' | 'FREELANCE' | 'INVESTMENT' | 'OTHER' =
          inc.type === 'BUSINESS' ? 'FREELANCE' : inc.type === 'SALARY' || inc.type === 'OTHER' ? inc.type : 'SALARY';
        const freq: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'CUSTOM' =
          inc.frequency === 'WEEKLY' || inc.frequency === 'FORTNIGHTLY' || inc.frequency === 'MONTHLY'
            ? inc.frequency
            : 'CUSTOM';
        return {
          id: inc.id?.startsWith('inc-') ? undefined : inc.id,
          name: inc.name,
          type: incType,
          amount: (inc.amount || 0).toFixed(2),
          frequency: freq,
          receivingAccountId: inc.receivingAccountId || null,
          startDate: inc.startDate || null,
        };
      });

      const resolvedArchivedEnvelopeIds = Array.from(removedCategoryNames)
        .map((name) => (poolsQuery.data || []).find((c) => c.name === name)?.id)
        .filter((id): id is string => Boolean(id));

      await saveSetupBudgetMut.mutateAsync({
        incomes: incomesPayload,
        bankAccounts: accountsPayload.length > 0 ? accountsPayload : [
          { name: 'Primary Account', bankProvider: 'CBA', lastKnownBalance: '1000.00', unbudgetedBuffer: '0.00', isPrivate: false },
        ],
        envelopes: envelopesPayload.length > 0 ? envelopesPayload : [
          { name: 'Everyday Spending', envelopeType: 'EVERYDAY', bankAccountId: accountsPayload[0]?.id, monthlyAmount: '1000.00', isEssential: true },
        ],
        archivedEnvelopeIds: [...sweepQueue.map((s) => s.poolId), ...resolvedArchivedEnvelopeIds],
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
