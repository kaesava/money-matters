import { useState } from 'react';
import { useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import { useMobileToast, buildRecurrenceRule } from '@money-matters/ui/mobile';
import { trpc } from '../lib/trpc';
import { formatMobileCurrency } from '../lib/format';
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
    archivedGoalIds,
    goals,
    activeCategories,
    categoryFrequencies,
    removedCategoryNames,
    convertFromMonthly,
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

      const everydayItems = activeCategories.filter((c) => c.type === 'EVERYDAY');
      const billCategories = activeCategories.filter((c) => c.type === 'BILL');

      const totalEverydayMonthly = everydayItems.reduce((sum, item) => sum + (item.monthlyAud || 0), 0);
      const existingEverydayEnv = existingPools.find((env) => env.envelopeType === 'EVERYDAY' && !env.isPrivate);
      const customEverydayItem = everydayItems.find((item) => item.id && !item.id.startsWith('temp-')) || everydayItems[0];

      const everydayPayload = {
        id: existingEverydayEnv?.id || (customEverydayItem?.id && !customEverydayItem.id.startsWith('temp-') ? customEverydayItem.id : undefined),
        bankAccountId: customEverydayItem?.bankAccountId || existingEverydayEnv?.bankAccountId || primaryBankAccountId,
        isPrivate: false,
        name: existingEverydayEnv?.name || 'Everyday',
        envelopeType: 'EVERYDAY' as const,
        fundingMode: 'TARGET_BALANCE' as const,
        safetyBufferFloor: (customEverydayItem?.safetyBufferFloor ?? parseFloat(existingEverydayEnv?.safetyBufferFloor || '0')).toFixed(2),
        monthlyAmount: totalEverydayMonthly.toFixed(2),
        enteredAmount: totalEverydayMonthly.toFixed(2),
        budgetFrequency: 'MONTHLY' as const,
        generateEvents: false,
        isPriority: false,
        orderIndex: 0,
      };

      const finalGoalsPayload = goals.filter((g) => !removedCategoryNames.has(g.name));

      const hasExplicitSurplusGoal = finalGoalsPayload.some((g) => g.isSurplusTarget && !g.isPrivate);
      const hasExplicitSurplusBill = billCategories.some((c) => c.isSurplusTarget && !c.isPrivate);

      const fallbackSurplusGoalIdx =
        !hasExplicitSurplusGoal && !hasExplicitSurplusBill
          ? finalGoalsPayload.findIndex(
              (g) =>
                !g.isPrivate &&
                (g.name.toLowerCase().includes('emergency') || g.name.toLowerCase().includes('reserve'))
            )
          : -1;
      const effectiveFallbackGoalIdx =
        !hasExplicitSurplusGoal && !hasExplicitSurplusBill
          ? fallbackSurplusGoalIdx !== -1
            ? fallbackSurplusGoalIdx
            : finalGoalsPayload.findIndex((g) => !g.isPrivate)
          : -1;

      const envelopesPayload = [
        everydayPayload,
        ...billCategories.map((c, idx) => {
          const rawFreq = c.budgetFrequency || categoryFrequencies[c.name];
          const uiFreq: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' =
            rawFreq === 'ANNUALLY'
              ? 'YEARLY'
              : (rawFreq as 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY') || 'MONTHLY';
          const budgetFreq: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' =
            uiFreq === 'YEARLY' ? 'ANNUALLY' : uiFreq;
          const fundingMode: 'TARGET_BALANCE' | 'RECURRING' = c.fundingMode || 'RECURRING';
          const catId = c.id && !c.id.startsWith('temp-') ? c.id : undefined;
          const matchedPool =
            (catId ? existingPools.find((p) => p.id === catId) : undefined) ||
            existingPools.find(
              (p) => p.envelopeType === 'BILL' && p.name.trim().toLowerCase() === c.name.trim().toLowerCase()
            );
          const resolvedEnvId = catId || matchedPool?.id;
          const enteredVal = convertFromMonthly(c.monthlyAud || 0, uiFreq);

          return {
            id: resolvedEnvId,
            bankAccountId: c.bankAccountId || matchedPool?.bankAccountId || primaryBankAccountId,
            isPrivate: c.isPrivate ?? matchedPool?.isPrivate ?? false,
            name: c.name,
            envelopeType: 'BILL' as const,
            fundingMode,
            targetAmount:
              fundingMode === 'TARGET_BALANCE'
                ? (c.targetAmount ?? c.monthlyAud ?? 0).toFixed(2)
                : undefined,
            monthlyAmount: (c.monthlyAud || 0).toFixed(2),
            enteredAmount: enteredVal.toFixed(2),
            budgetFrequency: fundingMode === 'TARGET_BALANCE' ? ('MONTHLY' as const) : budgetFreq,
            startDate: c.startDate ?? matchedPool?.startDate,
            endDate: c.endDate ?? matchedPool?.endDate,
            rrule: c.rrule ?? matchedPool?.rrule,
            generateEvents: fundingMode === 'RECURRING' ? (c.generateEvents ?? true) : false,
            isPriority: c.isPriority ?? true,
            isSurplusTarget: Boolean(c.isSurplusTarget),
            orderIndex: idx + 1,
          };
        }),
        ...finalGoalsPayload.map((g, idx) => {
          const goalId = g.id?.startsWith('g-') ? undefined : g.id;
          const matchedPool =
            (goalId ? existingPools.find((p) => p.id === goalId) : undefined) ||
            existingPools.find(
              (p) => p.envelopeType === 'GOAL' && p.name.trim().toLowerCase() === g.name.trim().toLowerCase()
            );
          const resolvedGoalId = goalId || matchedPool?.id;
          const isOngoing = g.fundingMode === 'RECURRING' || (!g.dueDate && Boolean(g.budgetFrequency));
          const fundingMode: 'TARGET_BALANCE' | 'RECURRING' =
            g.fundingMode || (isOngoing ? 'RECURRING' : 'TARGET_BALANCE');
          const rawAmt =
            g.enteredAmount !== undefined && g.enteredAmount !== null
              ? g.enteredAmount
              : (g.monthlyAmount || g.targetAmount || 0);
          const computedMonthly = isOngoing
            ? g.budgetFrequency === 'WEEKLY'
              ? (rawAmt * 52) / 12
              : g.budgetFrequency === 'FORTNIGHTLY'
              ? (rawAmt * 26) / 12
              : g.budgetFrequency === 'QUARTERLY'
              ? (rawAmt * 4) / 12
              : g.budgetFrequency === 'ANNUALLY'
              ? rawAmt / 12
              : rawAmt
            : (g.monthlyAmount || (g.targetAmount ? g.targetAmount / 12 : 100));

          const isSurplus =
            hasExplicitSurplusGoal || hasExplicitSurplusBill
              ? Boolean(g.isSurplusTarget)
              : idx === effectiveFallbackGoalIdx;

          return {
            id: resolvedGoalId,
            bankAccountId: g.bankAccountId || matchedPool?.bankAccountId || primaryBankAccountId,
            name: g.name,
            envelopeType: 'GOAL' as const,
            fundingMode,
            targetAmount: (isOngoing
              ? g.targetAmount !== undefined && g.targetAmount !== null && g.targetAmount > 0
                ? g.targetAmount
                : (g.enteredAmount || g.monthlyAmount || 0)
              : (g.targetAmount || g.monthlyAmount * 12 || 1000)
            ).toFixed(2),
            monthlyAmount: computedMonthly.toFixed(2),
            endDate: isOngoing ? null : (g.dueDate || null),
            enteredAmount:
              g.enteredAmount !== undefined && g.enteredAmount !== null
                ? g.enteredAmount.toFixed(2)
                : g.monthlyAmount
                ? g.monthlyAmount.toFixed(2)
                : undefined,
            budgetFrequency: g.budgetFrequency || (isOngoing ? 'MONTHLY' : undefined),
            startDate: g.startDate,
            rrule: g.rrule,
            isSurplusTarget: isSurplus,
            isPriority: g.isPriority ?? true,
            isPrivate: matchedPool?.isPrivate ?? Boolean(g.isPrivate),
            orderIndex: billCategories.length + 1 + idx,
          };
        }),
      ];

      const incomesPayload = incomes.map((inc) => {
        const incType: 'SALARY' | 'FREELANCE' | 'INVESTMENT' | 'OTHER' =
          inc.type === 'BUSINESS' ? 'FREELANCE' : inc.type === 'SALARY' || inc.type === 'OTHER' ? inc.type : 'SALARY';
        const freq: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | 'CUSTOM' =
          inc.frequency === 'WEEKLY' ||
          inc.frequency === 'FORTNIGHTLY' ||
          inc.frequency === 'MONTHLY' ||
          inc.frequency === 'QUARTERLY' ||
          inc.frequency === 'ANNUALLY'
            ? inc.frequency
            : 'CUSTOM';
        const rrule =
          inc.rrule ||
          (freq !== 'CUSTOM'
            ? buildRecurrenceRule(freq, inc.interval ?? 1)
            : 'FREQ=MONTHLY');
        return {
          id: inc.id?.startsWith('inc-') ? undefined : inc.id,
          name: inc.name,
          type: incType,
          amount: (inc.amount || 0).toFixed(2),
          frequency: freq,
          rrule,
          receivingAccountId: inc.receivingAccountId || null,
          startDate: inc.startDate || null,
        };
      });

      const archivedEnvelopeIds = isRerun
        ? Array.from(
            new Set([
              ...Array.from(archivedGoalIds),
              ...existingPools
                .filter(
                  (env) =>
                    removedCategoryNames.has(env.name) ||
                    (env.envelopeType === 'GOAL' && !finalGoalsPayload.some((g) => g.id === env.id))
                )
                .map((env) => env.id),
            ])
          )
        : [];

      const result = await saveSetupBudgetMut.mutateAsync({
        incomes: incomesPayload,
        bankAccounts:
          accountsPayload.length > 0
            ? accountsPayload
            : [
                {
                  name: 'Other Financial Institution (Everyday)',
                  bankProvider: 'Other',
                  accountType: 'EVERYDAY',
                  lastKnownBalance: '1000.00',
                  unbudgetedBuffer: '0.00',
                  isPrivate: false,
                },
              ],
        envelopes:
          envelopesPayload.length > 0
            ? envelopesPayload
            : [
                {
                  name: 'Everyday',
                  envelopeType: 'EVERYDAY',
                  bankAccountId: accountsPayload[0]?.id,
                  monthlyAmount: '1000.00',
                  isPriority: false,
                  fundingMode: 'TARGET_BALANCE',
                },
              ],
        archivedEnvelopeIds,
        archivedAccountIds: Array.from(archivedAccountIds),
        archivedIncomeIds: Array.from(archivedIncomeIds),
      });

      utils.getTenantStatus.setData(undefined, (old) =>
        old ? { ...old, setupCompleted: true, setupStatus: 'COMPLETED' } : undefined
      );
      await utils.getTenantStatus.refetch();
      await utils.invalidate();

      const sweptTotal = result.persistedCounts?.sweptTotalAmount ?? 0;
      if (sweptTotal > 0.005) {
        toast.success(t('setup.surplusSwept', { amount: formatMobileCurrency(sweptTotal) }));
      } else if (isRerun) {
        toast.success(t('setup.recalibrateSuccess'));
      } else {
        toast.success(t('toasts.setupSaved'));
      }
      router.replace('/(app)/home');
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
