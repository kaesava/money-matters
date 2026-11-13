import React, { createContext, useContext, useState, useMemo, useEffect, useRef } from 'react';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import {
  IncomeItem,
  UserGoalItem,
  EstimatedCategoryItem,
  getTotalSetupSteps,
} from '@money-matters/types';
import { SetupWizardContextValue } from './setup-wizard-types';
import { formatIsoDate, getMobileLocaleConfig } from '../lib/format';
import { useSetupWizardPrepopulation } from './useSetupWizardPrepopulation';
import { useSetupWizardCalculations } from './useSetupWizardCalculations';
import { useSetupWizardLifestyleState } from './useSetupWizardLifestyleState';
import { useSetupWizardAccountsState } from './useSetupWizardAccountsState';
import { authClient } from '../lib/auth';
import { trpc } from '../lib/trpc';

const SetupWizardContext = createContext<SetupWizardContextValue | null>(null);

export function SetupWizardProvider({ children: reactChildren }: { children: React.ReactNode }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: session } = authClient.useSession();
  const tenantStatusQuery = trpc.getTenantStatus.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const createTenantMut = trpc.createTenant.useMutation();
  const hasTenant = tenantStatusQuery.data?.hasTenant === true;
  const userPrefQuery = trpc.getUserPreferences.useQuery(undefined, {
    enabled: !!session?.user && hasTenant,
  });
  const tenantQuery = trpc.getTenant.useQuery(undefined, {
    enabled: !!session?.user && hasTenant,
  });

  const tz = getMobileLocaleConfig().timezone;

  // Auto-provision tenant for authenticated users without a household
  const isCreatingTenantRef = useRef(false);
  useEffect(() => {
    if (
      tenantStatusQuery.data &&
      !tenantStatusQuery.data.hasTenant &&
      !isCreatingTenantRef.current
    ) {
      isCreatingTenantRef.current = true;
      createTenantMut
        .mutateAsync({
          name: 'My Household',
          country: 'AU',
          currency: 'AUD',
          timezone: tz,
        })
        .then(async () => {
          await tenantStatusQuery.refetch();
          await utils.invalidate();
        })
        .catch(() => {
          isCreatingTenantRef.current = false;
        });
    }
  }, [tenantStatusQuery.data, createTenantMut, tenantStatusQuery, utils, tz]);

  const globalParams = useGlobalSearchParams<{ mode?: string }>();
  const isRerunParam = globalParams.mode === 'rerun';
  const setupAlreadyCompleted = userPrefQuery.data?.setupStatus === 'COMPLETED';
  const [isRerun, setIsRerun] = useState<boolean>(() => isRerunParam || setupAlreadyCompleted);
  const totalSteps = getTotalSetupSteps(isRerun);
  const initialSetupCompletedRef = useRef<boolean | null>(null);

  const isAud = tenantQuery.data?.currency ? tenantQuery.data.currency === 'AUD' : true;

  useEffect(() => {
    if (initialSetupCompletedRef.current === null && userPrefQuery.data !== undefined) {
      initialSetupCompletedRef.current = userPrefQuery.data?.setupStatus === 'COMPLETED';
      if (initialSetupCompletedRef.current && !isRerunParam) {
        setIsRerun(true);
        router.replace({ pathname: '/(setup)/income', params: { mode: 'rerun' } });
      }
    }
  }, [userPrefQuery.data, isRerunParam, router]);

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
        prev.map((acc) =>
          acc.id === 'acc-default' && acc.lastKnownBalance === '1000.00'
            ? { ...acc, lastKnownBalance: '0.00' }
            : acc
        )
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
      startDate: new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date()),
    },
  ]);
  const [archivedIncomeIds, setArchivedIncomeIds] = useState<Set<string>>(new Set());
  const [archivedGoalIds, setArchivedGoalIds] = useState<Set<string>>(new Set());

  const [goals, setGoals] = useState<UserGoalItem[]>([
    {
      id: 'g-1',
      name: 'Emergency Reserve',
      fundingMode: 'RECURRING',
      monthlyAmount: 300,
      icon: 'shield',
      targetAmount: 10000,
      budgetFrequency: 'MONTHLY',
      isPriority: false,
      isSurplusTarget: true,
    },
    {
      id: 'g-2',
      name: 'Annual Family Holiday',
      fundingMode: 'TARGET_BALANCE',
      monthlyAmount: 250,
      icon: 'plane',
      targetAmount: 3000,
      dueDate: formatIsoDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
      isPriority: false,
    },
  ]);

  const [customCategories, setCustomCategories] = useState<EstimatedCategoryItem[]>([]);
  const [removedCategoryNames, setRemovedCategoryNames] = useState<Set<string>>(new Set());
  const [amountOverrides, setAmountOverrides] = useState<Record<string, number>>({});
  const [billTypeOverrides, setBillTypeOverrides] = useState<
    Record<string, 'RECURRING' | 'TARGET_BALANCE'>
  >({});
  const [categoryFrequencies, setCategoryFrequencies] = useState<
    Record<string, 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'>
  >({});

  const { isLoading: isLoadingExistingData } = useSetupWizardPrepopulation({
    isRerun,
    enabled: !!session?.user && hasTenant,
    setIncomes,
    setBankAccounts: accounts.setBankAccounts,
    setGoals,
    setCustomCategories,
    setCategoryFrequencies,
  });

  const handleUpdateIncomeField = <K extends keyof IncomeItem>(id: string, field: K, val: IncomeItem[K]) => {
    setIncomes((prev) => prev.map((inc) => (inc.id === id ? { ...inc, [field]: val } : inc)));
  };

  const handleUpdateGoalField = (id: string, field: keyof UserGoalItem, val: string | number) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, [field]: val } : g)));
  };

  const handleRemoveIncome = (id: string) => {
    if (!id.startsWith('inc-')) {
      setArchivedIncomeIds((prev) => new Set(prev).add(id));
    }
    setIncomes((prev) => prev.filter((item) => item.id !== id));
  };

  const handleRemoveGoal = (id: string) => {
    if (!id.startsWith('g-')) {
      setArchivedGoalIds((prev) => new Set(prev).add(id));
    }
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const calculations = useSetupWizardCalculations({
    country: lifestyle.country,
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
    hasMedicalOutofPocket: lifestyle.hasMedicalOutofPocket,
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
      archivedGoalIds,
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
      handleUpdateIncomeField,
      handleUpdateGoalField,
      handleRemoveGoal,
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
      archivedGoalIds,
      goals,
      customCategories,
      removedCategoryNames,
      amountOverrides,
      billTypeOverrides,
      categoryFrequencies,
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
