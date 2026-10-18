import { useEffect } from 'react';
import { trpc } from '../lib/trpc';
import { IncomeItem, UserGoalItem, EstimatedCategoryItem } from '@money-matters/types';
import { getMobileLocaleConfig } from '../lib/format';
import { MobileBankAccountItem } from './setup-wizard-types';

interface PrepopulationProps {
  isRerun: boolean;
  setIncomes: React.Dispatch<React.SetStateAction<IncomeItem[]>>;
  setBankAccounts: React.Dispatch<React.SetStateAction<MobileBankAccountItem[]>>;
  setGoals: React.Dispatch<React.SetStateAction<UserGoalItem[]>>;
  setCustomCategories: React.Dispatch<React.SetStateAction<EstimatedCategoryItem[]>>;
}

export function useSetupWizardPrepopulation({
  isRerun,
  setIncomes,
  setBankAccounts,
  setGoals,
  setCustomCategories,
}: PrepopulationProps) {
  const tz = getMobileLocaleConfig().timezone;
  const incomeSourcesQuery = trpc.listIncomeSources.useQuery(undefined, { enabled: isRerun });
  const bankAccountsQuery = trpc.getBankAccountsWithMappings.useQuery(undefined, { enabled: isRerun });
  const poolsQuery = trpc.listPools.useQuery(undefined, { enabled: isRerun });

  // Pre-populate incomes if in rerun mode
  useEffect(() => {
    if (!isRerun || !incomeSourcesQuery.data || incomeSourcesQuery.data.length === 0) return;
    setIncomes(
      incomeSourcesQuery.data.map((inc) => {
        let freq: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'CUSTOM' = 'FORTNIGHTLY';
        if (inc.rrule?.includes('INTERVAL=2')) freq = 'FORTNIGHTLY';
        else if (inc.rrule?.includes('WEEKLY')) freq = 'WEEKLY';
        else if (inc.rrule?.includes('MONTHLY')) freq = 'MONTHLY';
        return {
          id: inc.id,
          name: inc.name,
          amount: parseFloat(inc.amount || '0'),
          frequency: freq,
          type: 'SALARY',
          receivingAccountId: inc.receivingAccountId,
          startDate: inc.startDate ? String(inc.startDate) : new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date()),
        };
      })
    );
  }, [isRerun, incomeSourcesQuery.data, setIncomes, tz]);

  // Pre-populate bank accounts if in rerun mode
  useEffect(() => {
    if (!isRerun || !bankAccountsQuery.data || bankAccountsQuery.data.length === 0) return;
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
  }, [isRerun, bankAccountsQuery.data, setBankAccounts]);

  // Pre-populate goal pools if in rerun mode
  useEffect(() => {
    if (!isRerun || !poolsQuery.data || poolsQuery.data.length === 0) return;
    const goalPools = poolsQuery.data.filter((p) => p.envelopeType === 'TARGET_GOAL' || p.envelopeType === 'ONGOING_GOAL');
    if (goalPools.length > 0) {
      setGoals(
        goalPools.map((g) => {
          const isOngoing = g.envelopeType === 'ONGOING_GOAL' || g.goalMode === 'ONGOING';
          const amt = parseFloat(g.targetAmount || '1000');
          return {
            id: g.id,
            name: g.name,
            goalMode: isOngoing ? ('ONGOING' as const) : ('TARGET_DATE' as const),
            monthlyAmount: isOngoing ? amt : Math.round(amt / 12),
            icon: 'target',
            targetAmount: amt,
            enteredAmount: g.enteredAmount ? parseFloat(g.enteredAmount) : amt,
            budgetFrequency: (g.budgetFrequency as 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY' | null) || undefined,
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
    const nonGoalEnvelopes = poolsQuery.data.filter((p) => p.envelopeType !== 'TARGET_GOAL' && p.envelopeType !== 'ONGOING_GOAL');
    setCustomCategories(
      nonGoalEnvelopes.map((c) => ({
        id: c.id,
        name: c.name,
        type: (c.envelopeType === 'EVERYDAY' ? 'EVERYDAY' : 'REGULAR') as 'REGULAR' | 'GOAL' | 'EVERYDAY',
        monthlyAud: parseFloat(c.monthlyAmount || c.targetAmount || '0'),
        icon: c.envelopeType === 'EVERYDAY' ? 'wallet' : 'pin',
      }))
    );
  }, [isRerun, poolsQuery.data, setCustomCategories]);

  return {
    rawPools: poolsQuery.data || [],
    rawCategories: [] as unknown[],
    isLoading: incomeSourcesQuery.isLoading || poolsQuery.isLoading || bankAccountsQuery.isLoading,
  };
}
