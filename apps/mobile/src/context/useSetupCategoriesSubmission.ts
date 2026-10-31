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
    bankAccounts,
    archivedAccountIds,
    archivedIncomeIds,
    goals,
    activeCategories,
    categoryFrequencies,
    removedCategoryNames,
    sweepQueue,
  } = useSetupWizard();

  const poolsQuery = trpc.listPools.useQuery();
  const saveSetupBudgetMut = trpc.saveSetupBudget.useMutation();
  const utils = trpc.useUtils();

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const accountsPayload = bankAccounts.map((acc) => ({
        id: acc.id.startsWith('acc-') ? undefined : acc.id,
        name: acc.name,
        bankProvider: acc.bankProvider || 'Other',
        accountType: (acc.accountType || 'EVERYDAY') as 'EVERYDAY' | 'SAVINGS' | 'LOAN_OFFSET',
        lastKnownBalance: String(acc.lastKnownBalance || '0.00'),
        unbudgetedBuffer: String(acc.unbudgetedBuffer || '0.00'),
        isPrivate: Boolean(acc.isPrivate),
      }));

      const primaryBankAccountId = accountsPayload[0]?.id;
      const existingPools = poolsQuery.data || [];

      const nonGoalCategories = activeCategories.filter((c) => c.type !== 'GOAL');

      // Find surplus target: Emergency Reserve -> first non-private goal -> everyday
      const surplusGoalIndex = goals.findIndex(
        (g) =>
          !g.isPrivate &&
          (g.name.toLowerCase().includes('emergency') || g.name.toLowerCase().includes('reserve'))
      );
      const effectiveSurplusIndex = surplusGoalIndex !== -1
        ? surplusGoalIndex
        : goals.findIndex((g) => !g.isPrivate);

      const envelopesPayload = [
        ...nonGoalCategories.map((c, idx) => {
          const rawFreq = c.budgetFrequency || categoryFrequencies[c.name];
          const budgetFreq: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY' =
            rawFreq === 'YEARLY' ? 'ANNUALLY' : (rawFreq as 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY') || 'MONTHLY';
          const isEveryday = c.type === 'EVERYDAY';
          const resolvedEnvelopeType = isEveryday
            ? ('EVERYDAY' as const)
            : c.envelopeType === 'FLEXIBLE_BILL'
            ? ('FLEXIBLE_BILL' as const)
            : ('SCHEDULED_BILL' as const);
          const isBill = resolvedEnvelopeType === 'SCHEDULED_BILL' || resolvedEnvelopeType === 'FLEXIBLE_BILL';
          const catId = 'id' in c && typeof c.id === 'string' && !c.id.startsWith('temp-') ? c.id : undefined;
          const matchedPool = (catId ? existingPools.find((p) => p.id === catId) : undefined) ||
            existingPools.find((p) => p.envelopeType === resolvedEnvelopeType && p.name.trim().toLowerCase() === c.name.trim().toLowerCase());
          const resolvedEnvId = catId || matchedPool?.id;
          return {
            id: resolvedEnvId,
            bankAccountId: matchedPool?.bankAccountId || primaryBankAccountId,
            isPrivate: matchedPool?.isPrivate ?? false,
            name: c.name,
            envelopeType: resolvedEnvelopeType,
            monthlyAmount: (c.monthlyAud || 0).toFixed(2),
            enteredAmount: (c.monthlyAud || 0).toFixed(2),
            budgetFrequency: resolvedEnvelopeType === 'FLEXIBLE_BILL' ? ('MONTHLY' as const) : budgetFreq,
            startDate: c.startDate || matchedPool?.startDate,
            endDate: c.endDate || matchedPool?.endDate,
            rrule: c.rrule || matchedPool?.rrule,
            generateEvents: c.generateEvents ?? true,
            isEssential: isBill,
            orderIndex: idx,
          };
        }),
        ...goals.map((g, idx) => {
          const goalId = g.id?.startsWith('g-') ? undefined : g.id;
          const matchedPool = (goalId ? existingPools.find((p) => p.id === goalId) : undefined) ||
            existingPools.find((p) => (p.envelopeType === 'ONGOING_GOAL' || p.envelopeType === 'TARGET_GOAL') && p.name.trim().toLowerCase() === g.name.trim().toLowerCase());
          const resolvedGoalId = goalId || matchedPool?.id;
          const isOngoing = g.goalMode === 'ONGOING' || (!g.dueDate && g.budgetFrequency);
          const rawAmt = g.enteredAmount !== undefined && g.enteredAmount !== null
            ? g.enteredAmount
            : (g.monthlyAmount || g.targetAmount || 0);
          const computedMonthly = isOngoing
            ? (g.budgetFrequency === 'WEEKLY'
                ? (rawAmt * 52) / 12
                : g.budgetFrequency === 'FORTNIGHTLY'
                ? (rawAmt * 26) / 12
                : g.budgetFrequency === 'ANNUALLY'
                ? rawAmt / 12
                : rawAmt)
            : (g.monthlyAmount || (g.targetAmount ? g.targetAmount / 12 : 100));

          return {
            id: resolvedGoalId,
            bankAccountId: matchedPool?.bankAccountId || primaryBankAccountId,
            name: g.name,
            envelopeType: (isOngoing ? 'ONGOING_GOAL' : 'TARGET_GOAL') as 'ONGOING_GOAL' | 'TARGET_GOAL',
            goalMode: g.goalMode ?? (g.dueDate ? 'TARGET_DATE' : 'ONGOING'),
            targetAmount: (isOngoing
              ? (g.targetAmount !== undefined && g.targetAmount !== null && g.targetAmount > 0
                  ? g.targetAmount
                  : (g.enteredAmount || g.monthlyAmount || 0))
              : (g.targetAmount || g.monthlyAmount * 12 || 1000)
            ).toFixed(2),
            monthlyAmount: computedMonthly.toFixed(2),
            endDate: isOngoing ? null : (g.dueDate || null),
            enteredAmount: (g.enteredAmount !== undefined && g.enteredAmount !== null)
              ? g.enteredAmount.toFixed(2)
              : (g.monthlyAmount ? g.monthlyAmount.toFixed(2) : undefined),
            budgetFrequency: g.budgetFrequency || (isOngoing ? 'MONTHLY' : undefined),
            startDate: g.startDate,
            rrule: g.rrule,
            isSurplusTarget: idx === effectiveSurplusIndex,
            isCommitted: true,
            isPrivate: matchedPool?.isPrivate ?? Boolean(g.isPrivate),
            orderIndex: nonGoalCategories.length + idx,
          };
        }),
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
        .map((name) => existingPools.find((c) => c.name === name)?.id)
        .filter((id): id is string => Boolean(id));

      await saveSetupBudgetMut.mutateAsync({
        incomes: incomesPayload,
        bankAccounts: accountsPayload.length > 0 ? accountsPayload : [
          { name: 'Other Financial Institution (Everyday)', bankProvider: 'Other', accountType: 'EVERYDAY', lastKnownBalance: '1000.00', unbudgetedBuffer: '0.00', isPrivate: false },
        ],
        envelopes: envelopesPayload.length > 0 ? envelopesPayload : [
          { name: 'Everyday Spending', envelopeType: 'EVERYDAY', bankAccountId: accountsPayload[0]?.id, monthlyAmount: '1000.00', isEssential: true },
        ],
        archivedEnvelopeIds: [...sweepQueue.map((s) => s.poolId), ...resolvedArchivedEnvelopeIds],
        archivedAccountIds: Array.from(archivedAccountIds),
        archivedIncomeIds: Array.from(archivedIncomeIds),
      });

      utils.getTenantStatus.setData(undefined, (old) => (old ? { ...old, setupCompleted: true } : undefined));
      await utils.getTenantStatus.refetch();
      await utils.invalidate();

      if (isRerun) {
        toast.success(t('setup.recalibrateSuccess'));
        router.replace('/(app)/home');
      } else {
        toast.success(t('toasts.setupSaved'));
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
