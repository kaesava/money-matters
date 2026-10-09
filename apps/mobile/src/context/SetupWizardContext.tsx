import React, { createContext, useContext, useState, useMemo } from 'react';
import { useGlobalSearchParams } from 'expo-router';
import {
  HousingType,
  VehicleConfig,
  ChildConfig,
  IncomeItem,
  UserGoalItem,
  EstimatedCategoryItem,
} from '@money-matters/types';
import { SetupWizardContextValue } from './setup-wizard-types';
import { formatIsoDate } from '../lib/format';
import { useSetupWizardPrepopulation } from './useSetupWizardPrepopulation';
import { useSetupWizardCalculations } from './useSetupWizardCalculations';

const SetupWizardContext = createContext<SetupWizardContextValue | null>(null);

export function SetupWizardProvider({ children: reactChildren }: { children: React.ReactNode }) {
  const globalParams = useGlobalSearchParams<{ mode?: string }>();
  const isRerun = globalParams.mode === 'rerun';
  const totalSteps = isRerun ? 3 : 5;

  const [incomes, setIncomes] = useState<IncomeItem[]>([
    { id: 'inc-1', name: 'Primary Income', amount: 3200, frequency: 'FORTNIGHTLY', type: 'SALARY' },
  ]);

  const [goals, setGoals] = useState<UserGoalItem[]>([
    {
      id: 'g-1',
      name: 'Emergency Reserve (3-6 Months)',
      monthlyAmount: 300,
      icon: '🛡️',
      targetAmount: 10000,
      dueDate: formatIsoDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
    },
    {
      id: 'g-2',
      name: 'Annual Family Holiday',
      monthlyAmount: 250,
      icon: '✈️',
      targetAmount: 5000,
      dueDate: formatIsoDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
    },
  ]);

  const [housingType, setHousingType] = useState<HousingType>('RENT_SOLO');
  const [hasCars, setHasCars] = useState(true);
  const [vehicles, setVehicles] = useState<VehicleConfig[]>([{ id: 'veh-1', name: 'Vehicle 1', size: 'MID_SUV' }]);
  const [usePublicTransport, setUsePublicTransport] = useState(true);
  const [useRideshare, setUseRideshare] = useState(false);
  const [hasKids, setHasKids] = useState(false);
  const [children, setChildren] = useState<ChildConfig[]>([{ id: 'child-1', name: 'Child 1', stage: 'PRIMARY', type: 'PUBLIC' }]);
  const [hasPrivateHealth, setHasPrivateHealth] = useState(true);
  const [hasGym, setHasGym] = useState(false);
  const [hasMedicalOutofPocket, setHasMedicalOutofPocket] = useState(false);
  const [hasDebt, setHasDebt] = useState(false);
  const [debtMonthlyRepayment, setDebtMonthlyRepayment] = useState(0);
  const [hasPets, setHasPets] = useState(false);
  const [petsCount, setPetsCount] = useState(1);
  const [hasCharityGiving, setHasCharityGiving] = useState(false);
  const [charityMonthlyAmount, setCharityMonthlyAmount] = useState(0);
  const [weeklyGroceries, setWeeklyGroceries] = useState(270);
  const [weeklyDining, setWeeklyDining] = useState(240);
  const [weeklyPersonal, setWeeklyPersonal] = useState(100);

  const [customCategories, setCustomCategories] = useState<EstimatedCategoryItem[]>([]);
  const [removedCategoryNames, setRemovedCategoryNames] = useState<Set<string>>(new Set());
  const [amountOverrides, setAmountOverrides] = useState<Record<string, number>>({});
  const [categoryFrequencies, setCategoryFrequencies] = useState<
    Record<string, 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'YEARLY'>
  >({});
  const [autoCreateExpenseSchedules, setAutoCreateExpenseSchedules] = useState(true);

  // Balance Sweep & Archival state
  const [sweepQueue, setSweepQueue] = useState<Array<{ poolId: string; sweepDestinationPoolId?: string | null }>>([]);
  const [activeSweepPool, setActiveSweepPool] = useState<{ id: string; name: string; balance: number } | null>(null);
  const [selectedSweepDest, setSelectedSweepDest] = useState<string>('');

  const { rawPools, isLoading: isLoadingExistingData } = useSetupWizardPrepopulation({
    isRerun,
    setIncomes,
    setGoals,
    setCustomCategories,
  });

  const availablePools = useMemo(
    () => rawPools.map((p) => ({ id: p.id, name: p.name, isSurplusTarget: p.isSurplusTarget })),
    [rawPools]
  );

  const handleRemoveGoal = (id: string) => {
    const existingPool = rawPools.find((p) => p.id === id);
    const balance = existingPool?.currentBalance || 0;
    if (balance > 0.005) {
      setActiveSweepPool({ id, name: existingPool?.name || 'Goal', balance });
      const availableDests = rawPools.filter((p) => p.id !== id);
      const defaultDest = availableDests.find((p) => p.isSurplusTarget)?.id || availableDests[0]?.id || '';
      setSelectedSweepDest(defaultDest);
    } else {
      setGoals((prev) => prev.filter((g) => g.id !== id));
      if (!id.startsWith('g-')) {
        setSweepQueue((prev) => [...prev, { poolId: id }]);
      }
    }
  };

  const confirmSweepAndRemove = () => {
    if (!activeSweepPool) return;
    setSweepQueue((prev) => [
      ...prev,
      { poolId: activeSweepPool.id, sweepDestinationPoolId: selectedSweepDest },
    ]);
    setGoals((prev) => prev.filter((g) => g.id !== activeSweepPool.id));
    setActiveSweepPool(null);
  };

  const calculations = useSetupWizardCalculations({
    isRerun,
    incomes,
    housingType,
    hasCars,
    vehicles,
    usePublicTransport,
    useRideshare,
    hasKids,
    children,
    hasPrivateHealth,
    hasGym,
    hasPets,
    petsCount,
    debtMonthlyRepayment,
    hasCharityGiving,
    charityMonthlyAmount,
    weeklyGroceries,
    weeklyDining,
    weeklyPersonal,
    customCategories,
    removedCategoryNames,
    amountOverrides,
  });

  return (
    <SetupWizardContext.Provider
      value={{
        isRerun,
        totalSteps,
        isLoadingExistingData,
        incomes,
        setIncomes,
        goals,
        setGoals,
        housingType,
        setHousingType,
        hasCars,
        setHasCars,
        vehicles,
        setVehicles,
        usePublicTransport,
        setUsePublicTransport,
        useRideshare,
        setUseRideshare,
        hasKids,
        setHasKids,
        children,
        setChildren,
        hasPrivateHealth,
        setHasPrivateHealth,
        hasGym,
        setHasGym,
        hasMedicalOutofPocket,
        setHasMedicalOutofPocket,
        hasDebt,
        setHasDebt,
        debtMonthlyRepayment,
        setDebtMonthlyRepayment,
        hasPets,
        setHasPets,
        petsCount,
        setPetsCount,
        hasCharityGiving,
        setHasCharityGiving,
        charityMonthlyAmount,
        setCharityMonthlyAmount,
        weeklyGroceries,
        setWeeklyGroceries,
        weeklyDining,
        setWeeklyDining,
        weeklyPersonal,
        setWeeklyPersonal,
        customCategories,
        setCustomCategories,
        removedCategoryNames,
        setRemovedCategoryNames,
        amountOverrides,
        setAmountOverrides,
        categoryFrequencies,
        setCategoryFrequencies,
        autoCreateExpenseSchedules,
        setAutoCreateExpenseSchedules,
        sweepQueue,
        activeSweepPool,
        setActiveSweepPool,
        selectedSweepDest,
        setSelectedSweepDest,
        availablePools,
        handleRemoveGoal,
        confirmSweepAndRemove,
        ...calculations,
      }}
    >
      {reactChildren}
    </SetupWizardContext.Provider>
  );
}

export function useSetupWizard() {
  const ctx = useContext(SetupWizardContext);
  if (!ctx) throw new Error('useSetupWizard must be used within SetupWizardProvider');
  return ctx;
}

export * from './setup-wizard-types';
