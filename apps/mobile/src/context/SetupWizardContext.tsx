import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import {
  IncomeItem,
  UserGoalItem,
  EstimatedCategoryItem,
} from '@money-matters/types';
import { SetupWizardContextValue } from './setup-wizard-types';
import { formatIsoDate } from '../lib/format';
import { useSetupWizardPrepopulation } from './useSetupWizardPrepopulation';
import { useSetupWizardCalculations } from './useSetupWizardCalculations';
import { useSetupWizardLifestyleState } from './useSetupWizardLifestyleState';
import { useSetupWizardAccountsState } from './useSetupWizardAccountsState';
import { trpc } from '../lib/trpc';

const SetupWizardContext = createContext<SetupWizardContextValue | null>(null);

export function SetupWizardProvider({ children: reactChildren }: { children: React.ReactNode }) {
  const router = useRouter();
  const userPrefQuery = trpc.getUserPreferences.useQuery();
  const tenantQuery = trpc.getTenant.useQuery();

  const globalParams = useGlobalSearchParams<{ mode?: string }>();
  const isRerunParam = globalParams.mode === 'rerun';
  const setupAlreadyCompleted = Boolean(userPrefQuery.data?.setupCompleted);
  const [isRerun, setIsRerun] = useState<boolean>(() => isRerunParam || setupAlreadyCompleted);
  const totalSteps = isRerun ? 2 : 4;

  const isAud = tenantQuery.data?.currency ? tenantQuery.data.currency === 'AUD' : true;

  useEffect(() => {
    if (setupAlreadyCompleted && !isRerunParam) {
      router.replace({ pathname: '/(setup)/income', params: { mode: 'rerun' } });
    }
  }, [setupAlreadyCompleted, isRerunParam, router]);

  const lifestyle = useSetupWizardLifestyleState();
  const accounts = useSetupWizardAccountsState();

  useEffect(() => {
    const tenantCountry = tenantQuery.data?.country;
    if (tenantCountry) {
      const normalizedCountry: 'AU' | 'NZ' | 'OTHER' =
        tenantCountry === 'AU' || tenantCountry === 'NZ' ? tenantCountry : 'OTHER';
      lifestyle.setCountry(normalizedCountry);
      if (normalizedCountry !== 'AU') {
        lifestyle.setWeeklyGroceries(0);
        lifestyle.setWeeklyDining(0);
        lifestyle.setWeeklyPersonal(0);
      }
    }
    const tenantCurrency = tenantQuery.data?.currency;
    if (tenantCurrency && tenantCurrency !== 'AUD' && !isRerun) {
      setIncomes((prev) =>
        prev.map((inc) => (inc.id === 'inc-1' && inc.amount === 3200 ? { ...inc, amount: 0 } : inc))
      );
      accounts.setBankAccounts((prev) =>
        prev.map((acc) => (acc.id === 'acc-default' && acc.lastKnownBalance === '1000.00' ? { ...acc, lastKnownBalance: '0.00' } : acc))
      );
      setGoals((prev) =>
        prev.map((g) => {
          if (g.id === 'g-1' && (g.targetAmount === 10000 || g.monthlyAmount === 300)) {
            return { ...g, monthlyAmount: 0, targetAmount: 0, enteredAmount: 0 };
          }
          if (g.id === 'g-2' && (g.targetAmount === 3000 || g.monthlyAmount === 250)) {
            return { ...g, monthlyAmount: 0, targetAmount: 0 };
          }
          return g;
        })
      );
      lifestyle.setWeeklyGroceries(0);
      lifestyle.setWeeklyDining(0);
      lifestyle.setWeeklyPersonal(0);
    }
  }, [tenantQuery.data?.country, tenantQuery.data?.currency, isRerun]);

  const [incomes, setIncomes] = useState<IncomeItem[]>([
    {
      id: 'inc-1',
      name: 'Primary Income',
      amount: 3200,
      frequency: 'FORTNIGHTLY',
      type: 'SALARY',
      startDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date()),
    },
  ]);
  const [archivedIncomeIds, setArchivedIncomeIds] = useState<Set<string>>(new Set());

  const [goals, setGoals] = useState<UserGoalItem[]>([
    {
      id: 'g-1',
      name: 'Emergency Reserve',
      goalMode: 'ONGOING',
      monthlyAmount: 300,
      icon: 'shield',
      targetAmount: 10000,
      budgetFrequency: 'MONTHLY',
    },
    {
      id: 'g-2',
      name: 'Annual Family Holiday',
      goalMode: 'TARGET_DATE',
      monthlyAmount: 250,
      icon: 'plane',
      targetAmount: 3000,
      dueDate: formatIsoDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
    },
  ]);

  const [customCategories, setCustomCategories] = useState<EstimatedCategoryItem[]>([]);
  const [removedCategoryNames, setRemovedCategoryNames] = useState<Set<string>>(new Set());
  const [amountOverrides, setAmountOverrides] = useState<Record<string, number>>({});
  const [billTypeOverrides, setBillTypeOverrides] = useState<
    Record<string, 'SCHEDULED_BILL' | 'FLEXIBLE_BILL'>
  >({});
  const [categoryFrequencies, setCategoryFrequencies] = useState<
    Record<string, 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'YEARLY'>
  >({});

  // Balance Sweep & Archival state
  const [sweepQueue, setSweepQueue] = useState<Array<{ poolId: string; sweepDestinationPoolId?: string | null }>>([]);
  const [activeSweepPool, setActiveSweepPool] = useState<{ id: string; name: string; balance: number } | null>(null);
  const [selectedSweepDest, setSelectedSweepDest] = useState<string>('');

  const { rawPools, isLoading: isLoadingExistingData } = useSetupWizardPrepopulation({
    isRerun,
    setIncomes,
    setBankAccounts: accounts.setBankAccounts,
    setGoals,
    setCustomCategories,
  });

  const availablePools = useMemo(
    () => rawPools.map((p) => ({ id: p.id, name: p.name, isSurplusTarget: p.isSurplusTarget })),
    [rawPools]
  );

  const [dirtyIncomeIds, setDirtyIncomeIds] = useState<Set<string>>(new Set());
  const [dirtyGoalIds, setDirtyGoalIds] = useState<Set<string>>(new Set());

  const updateIncomeMut = trpc.updateIncomeSource.useMutation();
  const archiveIncomeMut = trpc.archiveIncomeSource.useMutation();
  const updatePoolMut = trpc.updatePool.useMutation();
  const archivePoolMut = trpc.archivePool.useMutation();

  const handleUpdateIncomeField = <K extends keyof IncomeItem>(id: string, field: K, val: IncomeItem[K]) => {
    setIncomes((prev) => prev.map((inc) => (inc.id === id ? { ...inc, [field]: val } : inc)));
    if (!id.startsWith('inc-')) {
      setDirtyIncomeIds((prev) => new Set(prev).add(id));
    }
  };

  const handleSaveIncomeImmediate = async (id: string) => {
    if (id.startsWith('inc-')) return;
    const target = incomes.find((inc) => inc.id === id);
    if (!target) return;
    const rawFreq = target.frequency as string;
    const frequencyVal: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY' =
      rawFreq === 'WEEKLY' || rawFreq === 'FORTNIGHTLY' ? rawFreq : 'MONTHLY';
    await updateIncomeMut.mutateAsync({
      id,
      data: {
        name: target.name,
        amount: String(target.amount || 0),
        frequency: frequencyVal,
        startDate: target.startDate || undefined,
      },
    });
    setDirtyIncomeIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleUpdateGoalField = (id: string, field: keyof UserGoalItem, val: string | number) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, [field]: val } : g)));
    if (!id.startsWith('g-')) {
      setDirtyGoalIds((prev) => new Set(prev).add(id));
    }
  };

  const handleSaveGoalImmediate = async (id: string) => {
    if (id.startsWith('g-')) return;
    const target = goals.find((g) => g.id === id);
    if (!target) return;
    const isOngoing = target.goalMode === 'ONGOING';
    const amtStr = String(isOngoing ? target.monthlyAmount || target.targetAmount || 0 : target.targetAmount || 0);
    await updatePoolMut.mutateAsync({
      poolId: id,
      data: {
        name: target.name,
        targetAmount: amtStr,
        monthlyAmount: String(target.monthlyAmount || 0),
        enteredAmount: target.enteredAmount ? String(target.enteredAmount) : amtStr,
        budgetFrequency: target.budgetFrequency || 'MONTHLY',
        endDate: isOngoing ? null : target.dueDate || null,
        goalMode: target.goalMode,
      },
    });
    setDirtyGoalIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleRemoveIncome = async (id: string) => {
    if (!id.startsWith('inc-')) {
      if (isRerun) {
        await archiveIncomeMut.mutateAsync({ id });
      }
      setArchivedIncomeIds((prev) => new Set(prev).add(id));
    }
    setIncomes((prev) => prev.filter((item) => item.id !== id));
  };

  const handleRemoveGoal = async (id: string) => {
    const pool = rawPools.find((p) => p.id === id);
    const balance = pool ? parseFloat((pool as unknown as { currentBalance?: string }).currentBalance || '0') : 0;
    if (balance > 0.005 && pool) {
      setActiveSweepPool({ id: pool.id, name: pool.name, balance });
      const dest = availablePools.find((p) => p.id !== pool.id)?.id || '';
      setSelectedSweepDest(dest);
    } else {
      if (pool && isRerun) {
        await archivePoolMut.mutateAsync({ poolId: id });
      }
      setGoals((prev) => prev.filter((g) => g.id !== id));
      if (pool) {
        setSweepQueue((prev) => [...prev, { poolId: pool.id, sweepDestinationPoolId: null }]);
      }
    }
  };

  const confirmSweepAndRemove = () => {
    if (!activeSweepPool) return;
    setSweepQueue((prev) => [
      ...prev,
      { poolId: activeSweepPool.id, sweepDestinationPoolId: selectedSweepDest || null },
    ]);
    setGoals((prev) => prev.filter((g) => g.id !== activeSweepPool.id));
    setActiveSweepPool(null);
  };

  const calculations = useSetupWizardCalculations({
    isRerun,
    incomes,
    housingType: lifestyle.housingType,
    hasCars: lifestyle.hasCars,
    vehicles: lifestyle.vehicles,
    usePublicTransport: lifestyle.usePublicTransport,
    useRideshare: lifestyle.useRideshare,
    hasKids: lifestyle.hasKids,
    children: lifestyle.children,
    hasPrivateHealth: lifestyle.hasPrivateHealth,
    hasGym: lifestyle.hasGym,
    hasPets: lifestyle.hasPets,
    petsCount: lifestyle.petsCount,
    debtMonthlyRepayment: lifestyle.debtMonthlyRepayment,
    hasCharityGiving: lifestyle.hasCharityGiving,
    charityMonthlyAmount: lifestyle.charityMonthlyAmount,
    weeklyGroceries: lifestyle.weeklyGroceries,
    weeklyDining: lifestyle.weeklyDining,
    weeklyPersonal: lifestyle.weeklyPersonal,
    goals,
    customCategories,
    removedCategoryNames,
    amountOverrides,
    billTypeOverrides,
  });

  const value = useMemo<SetupWizardContextValue>(
    () => ({
      isRerun,
      isAud,
      totalSteps,
      isLoadingExistingData,
      ...lifestyle,
      incomes,
      setIncomes,
      handleRemoveIncome,
      ...accounts,
      archivedIncomeIds,
      goals,
      setGoals,
      customCategories,
      setCustomCategories,
      removedCategoryNames,
      setRemovedCategoryNames,
      amountOverrides,
      setAmountOverrides,
      billTypeOverrides,
      setBillTypeOverrides,
      categoryFrequencies,
      setCategoryFrequencies,
      sweepQueue,
      activeSweepPool,
      setActiveSweepPool,
      selectedSweepDest,
      setSelectedSweepDest,
      availablePools,
      dirtyIncomeIds,
      dirtyGoalIds,
      handleUpdateIncomeField,
      handleSaveIncomeImmediate,
      handleUpdateGoalField,
      handleSaveGoalImmediate,
      handleRemoveGoal,
      confirmSweepAndRemove,
      ...calculations,
    }),
    [
      isRerun,
      isAud,
      totalSteps,
      isLoadingExistingData,
      lifestyle,
      incomes,
      accounts,
      archivedIncomeIds,
      goals,
      customCategories,
      removedCategoryNames,
      amountOverrides,
      categoryFrequencies,
      sweepQueue,
      activeSweepPool,
      selectedSweepDest,
      availablePools,
      dirtyIncomeIds,
      dirtyGoalIds,
      calculations,
    ]
  );

  return <SetupWizardContext.Provider value={value}>{reactChildren}</SetupWizardContext.Provider>;
}

export function useSetupWizard() {
  const context = useContext(SetupWizardContext);
  if (!context) {
    throw new Error('useSetupWizard must be used within a SetupWizardProvider');
  }
  return context;
}
