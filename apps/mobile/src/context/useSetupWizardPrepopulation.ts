import { useEffect } from 'react';
import { trpc } from '../lib/trpc';
import { IncomeItem, UserGoalItem, EstimatedCategoryItem } from '@money-matters/types';
import { getMobileLocaleConfig } from '../lib/format';

interface PrepopulationProps {
  isRerun: boolean;
  setIncomes: React.Dispatch<React.SetStateAction<IncomeItem[]>>;
  setGoals: React.Dispatch<React.SetStateAction<UserGoalItem[]>>;
  setCustomCategories: React.Dispatch<React.SetStateAction<EstimatedCategoryItem[]>>;
}

export function useSetupWizardPrepopulation({
  isRerun,
  setIncomes,
  setGoals,
  setCustomCategories,
}: PrepopulationProps) {
  const tz = getMobileLocaleConfig().timezone;
  const incomeSourcesQuery = trpc.listIncomeSources.useQuery(undefined, { enabled: isRerun });
  const poolsQuery = trpc.listPools.useQuery(undefined, { enabled: isRerun });
  const categoriesQuery = trpc.listCategories.useQuery(undefined, { enabled: isRerun });

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
        };
      })
    );
  }, [isRerun, incomeSourcesQuery.data, setIncomes]);

  // Pre-populate goal pools if in rerun mode
  useEffect(() => {
    if (!isRerun || !poolsQuery.data || poolsQuery.data.length === 0) return;
    const goalPools = poolsQuery.data.filter((p) => p.poolType === 'GOAL');
    if (goalPools.length > 0) {
      setGoals(
        goalPools.map((g) => ({
          id: g.id,
          name: g.name,
          monthlyAmount: Math.round(parseFloat(g.targetAmount || '1000') / 12),
          icon: '🎯',
          targetAmount: parseFloat(g.targetAmount || '1000'),
          dueDate:
            g.targetDate ||
            new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(
              new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            ),
        }))
      );
    }
  }, [isRerun, poolsQuery.data, setGoals, tz]);

  // Pre-populate existing categories if in rerun mode
  useEffect(() => {
    if (!isRerun || !categoriesQuery.data || categoriesQuery.data.length === 0) return;
    setCustomCategories(
      categoriesQuery.data.map((c) => ({
        id: c.id,
        name: c.name,
        type: (c.poolType === 'EVERYDAY' || c.poolType === 'GOAL' ? c.poolType : 'REGULAR') as
          | 'REGULAR'
          | 'GOAL'
          | 'EVERYDAY',
        monthlyAud: parseFloat(c.monthlyAmount || '0'),
        icon: c.icon || '📌',
      }))
    );
  }, [isRerun, categoriesQuery.data, setCustomCategories]);

  return {
    rawPools: poolsQuery.data || [],
    rawCategories: categoriesQuery.data || [],
    isLoading: incomeSourcesQuery.isLoading || poolsQuery.isLoading || categoriesQuery.isLoading,
  };
}
