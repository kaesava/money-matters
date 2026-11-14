import { useEffect } from 'react';
import { trpc } from '../lib/trpc';
import { IncomeItem, UserGoalItem, EstimatedCategoryItem } from '@money-matters/types';
import { parseRecurrenceRule } from '@money-matters/ui/mobile';
import { getMobileLocaleConfig } from '../lib/format';
import { MobileBankAccountItem } from './setup-wizard-types';

interface PrepopulationProps {
  isRerun: boolean;
  enabled?: boolean;
  setIncomes: React.Dispatch<React.SetStateAction<IncomeItem[]>>;
  setBankAccounts: React.Dispatch<React.SetStateAction<MobileBankAccountItem[]>>;
  setGoals: React.Dispatch<React.SetStateAction<UserGoalItem[]>>;
  setCustomCategories: React.Dispatch<React.SetStateAction<EstimatedCategoryItem[]>>;
  setCategoryFrequencies: React.Dispatch<
    React.SetStateAction<Record<string, 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'>>
  >;
}

export function useSetupWizardPrepopulation({
  isRerun,
  enabled = true,
  setIncomes,
  setBankAccounts,
  setGoals,
  setCustomCategories,
  setCategoryFrequencies,
}: PrepopulationProps) {
  const tz = getMobileLocaleConfig().timezone;
  const incomeSourcesQuery = trpc.listIncomeSources.useQuery(undefined, { enabled });
  const bankAccountsQuery = trpc.getBankAccountsWithMappings.useQuery(undefined, { enabled });
  const poolsQuery = trpc.listEnvelopes.useQuery(undefined, { enabled });

  // Pre-populate incomes if in rerun mode (or if existing income sources exist)
  useEffect(() => {
    if (!incomeSourcesQuery.data || incomeSourcesQuery.data.length === 0) return;
    setIncomes(
      incomeSourcesQuery.data.map((inc) => {
        const parsed = parseRecurrenceRule(inc.rrule);
        return {
          id: inc.id,
          name: inc.name,
          amount: parseFloat(inc.amount || '0'),
          frequency: parsed.frequency,
          interval: parsed.interval ?? 1,
          rrule: inc.rrule,
          type: 'SALARY',
          receivingAccountId: inc.receivingAccountId,
          startDate: inc.startDate
            ? String(inc.startDate)
            : new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date()),
        };
      })
    );
  }, [incomeSourcesQuery.data, setIncomes, tz]);

  // Pre-populate bank accounts (both in normal mode and rerun)
  useEffect(() => {
    if (!bankAccountsQuery.data || bankAccountsQuery.data.length === 0) return;
    setBankAccounts(
      bankAccountsQuery.data.map((acc) => ({
        id: acc.id,
        name: acc.name,
        bankProvider: acc.bankProvider || 'Other',
        accountType: acc.accountType || 'EVERYDAY',
        lastKnownBalance: String(acc.lastKnownBalance || '0.00'),
        unbudgetedBuffer: String(acc.unbudgetedBuffer || '0.00'),
        isPrivate: Boolean(acc.isPrivate),
      }))
    );
  }, [bankAccountsQuery.data, setBankAccounts]);

  // Pre-populate goal pools if in rerun mode
  useEffect(() => {
    if (!isRerun || !poolsQuery.data || poolsQuery.data.length === 0) return;
    const goalPools = poolsQuery.data.filter((p) => p.envelopeType === 'GOAL');
    if (goalPools.length > 0) {
      setGoals(
        goalPools.map((g) => {
          const isOngoing = g.fundingMode === 'RECURRING';
          const targetAmt = parseFloat(g.targetAmount || '0');
          const monthlyAmt = g.monthlyAmount ? parseFloat(g.monthlyAmount) : 0;
          const enteredAmt = g.enteredAmount ? parseFloat(g.enteredAmount) : (monthlyAmt || targetAmt);
          return {
            id: g.id,
            name: g.name,
            fundingMode: isOngoing ? ('RECURRING' as const) : ('TARGET_BALANCE' as const),
            isPriority: g.isPriority ?? true,
            isSurplusTarget: g.isSurplusTarget ?? false,
            isPrivate: g.isPrivate ?? false,
            bankAccountId: g.bankAccountId,
            currentBalance:
              typeof g.currentBalance === 'number'
                ? g.currentBalance
                : parseFloat(String(g.currentBalance || '0')),
            monthlyAmount: isOngoing ? monthlyAmt : (monthlyAmt || (targetAmt > 0 ? Math.round(targetAmt / 12) : 0)),
            icon: 'target',
            targetAmount: targetAmt,
            enteredAmount: enteredAmt,
            budgetFrequency: (g.budgetFrequency as 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | null) || undefined,
            startDate: g.startDate,
            rrule: g.rrule,
            dueDate: isOngoing
              ? null
              : g.endDate ||
                new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(
                  new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                ),
          };
        })
      );
    }
  }, [isRerun, poolsQuery.data, setGoals, tz]);

  // Pre-populate existing categories/envelopes if in rerun mode
  useEffect(() => {
    if (!isRerun || !poolsQuery.data || poolsQuery.data.length === 0) return;
    const nonGoalEnvelopes = poolsQuery.data.filter((p) => p.envelopeType !== 'GOAL');
    const freqMap: Record<string, 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'> = {};
    setCustomCategories(
      nonGoalEnvelopes.map((c) => {
        const rawFreq = c.budgetFrequency as string | null | undefined;
        if (rawFreq) {
          freqMap[c.name] =
            rawFreq === 'ANNUALLY'
              ? 'YEARLY'
              : (rawFreq as 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY');
        }
        return {
          id: c.id,
          name: c.name,
          type: (c.envelopeType === 'EVERYDAY' ? 'EVERYDAY' : 'BILL') as 'BILL' | 'GOAL' | 'EVERYDAY',
          envelopeType: c.envelopeType as 'EVERYDAY' | 'BILL' | 'GOAL',
          fundingMode: (c.fundingMode || (c.envelopeType === 'BILL' ? 'RECURRING' : 'TARGET_BALANCE')) as
            | 'RECURRING'
            | 'TARGET_BALANCE',
          isPriority: c.isPriority ?? (c.envelopeType === 'BILL'),
          isSurplusTarget: c.isSurplusTarget ?? false,
          isPrivate: c.isPrivate ?? false,
          bankAccountId: c.bankAccountId,
          safetyBufferFloor: parseFloat(c.safetyBufferFloor || '0'),
          enteredAmount: c.enteredAmount ? parseFloat(c.enteredAmount) : parseFloat(c.monthlyAmount || c.targetAmount || '0'),
          targetAmount: c.targetAmount ? parseFloat(c.targetAmount) : null,
          currentBalance:
            typeof c.currentBalance === 'number'
              ? c.currentBalance
              : parseFloat(String(c.currentBalance || '0')),
          monthlyAud: parseFloat(c.monthlyAmount || c.targetAmount || '0'),
          budgetFrequency: (c.budgetFrequency as 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | null) || undefined,
          startDate: c.startDate,
          endDate: c.endDate,
          rrule: c.rrule,
          generateEvents: (c as { generateEvents?: boolean }).generateEvents ?? c.hasScheduledEvents ?? (c.envelopeType === 'BILL' && c.fundingMode === 'RECURRING'),
          hasScheduledEvents: c.hasScheduledEvents ?? false,
          icon: c.envelopeType === 'EVERYDAY' ? '🛒' : '📌',
        };
      })
    );
    if (Object.keys(freqMap).length > 0) {
      setCategoryFrequencies((prev) => ({ ...freqMap, ...prev }));
    }
  }, [isRerun, poolsQuery.data, setCustomCategories, setCategoryFrequencies]);

  return {
    rawPools: poolsQuery.data || [],
    isLoading: incomeSourcesQuery.isLoading || poolsQuery.isLoading || bankAccountsQuery.isLoading,
  };
}
