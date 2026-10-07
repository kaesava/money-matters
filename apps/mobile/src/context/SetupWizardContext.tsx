import React, { createContext, useContext, useState, useMemo } from 'react';
import {
  HousingType,
  VehicleConfig,
  ChildConfig,
  IncomeItem,
  UserGoalItem,
  EstimatedCategoryItem,
  QuizAnswers,
  calculateQuizEstimates,
} from '@money-matters/types';
import { SetupWizardContextValue } from './setup-wizard-types';
import { formatIsoDate } from '../lib/format';

const SetupWizardContext = createContext<SetupWizardContextValue | null>(null);

export function SetupWizardProvider({ children: reactChildren }: { children: React.ReactNode }) {
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

  const quizAnswers: QuizAnswers = useMemo(
    () => ({
      incomes,
      housingType,
      hasCars,
      vehicles,
      usePublicTransport,
      useRideshare,
      hasKids,
      children,
      hasPrivateHealth,
      hasMedicalOutofPocket,
      hasGym,
      hasPets,
      petsCount,
      activeDebtMonthlyRepayment: debtMonthlyRepayment,
      givesCharity: hasCharityGiving,
      familySupportMonthlyAmount: charityMonthlyAmount,
      weeklyGroceries,
      weeklyDining,
      weeklyPersonal,
    }),
    [
      incomes,
      housingType,
      hasCars,
      vehicles,
      usePublicTransport,
      useRideshare,
      hasKids,
      children,
      hasPrivateHealth,
      hasMedicalOutofPocket,
      hasGym,
      hasPets,
      petsCount,
      debtMonthlyRepayment,
      hasCharityGiving,
      charityMonthlyAmount,
      weeklyGroceries,
      weeklyDining,
      weeklyPersonal,
    ]
  );

  const estimation = useMemo(() => calculateQuizEstimates(quizAnswers), [quizAnswers]);

  const activeCategories = useMemo(() => {
    const combined = [
      ...estimation.regularBills,
      ...estimation.goalSinkingFunds,
      ...estimation.everydayCategories,
      ...customCategories,
    ];

    return combined
      .filter((cat) => !removedCategoryNames.has(cat.name))
      .map((cat) => {
        const override = amountOverrides[cat.name];
        return {
          ...cat,
          monthlyAud: override !== undefined ? override : cat.monthlyAud,
        };
      });
  }, [
    estimation.regularBills,
    estimation.goalSinkingFunds,
    estimation.everydayCategories,
    customCategories,
    removedCategoryNames,
    amountOverrides,
  ]);

  const activeEveryday = useMemo(
    () => activeCategories.filter((c) => c.type === 'EVERYDAY'),
    [activeCategories]
  );
  const activeRegular = useMemo(
    () => activeCategories.filter((c) => c.type === 'REGULAR'),
    [activeCategories]
  );
  const activeGoals = useMemo(
    () => activeCategories.filter((c) => c.type === 'GOAL'),
    [activeCategories]
  );

  const totalEverydayMonthly = useMemo(
    () => activeEveryday.reduce((acc, c) => acc + c.monthlyAud, 0),
    [activeEveryday]
  );
  const totalRegularMonthly = useMemo(
    () => activeRegular.reduce((acc, c) => acc + c.monthlyAud, 0),
    [activeRegular]
  );
  const totalGoalMonthly = useMemo(
    () => activeGoals.reduce((acc, c) => acc + c.monthlyAud, 0),
    [activeGoals]
  );
  const totalAllocatedMonthly = useMemo(
    () => totalEverydayMonthly + totalRegularMonthly + totalGoalMonthly,
    [totalEverydayMonthly, totalRegularMonthly, totalGoalMonthly]
  );

  return (
    <SetupWizardContext.Provider
      value={{
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
        estimation,
        activeCategories,
        activeEveryday,
        activeRegular,
        activeGoals,
        totalEverydayMonthly,
        totalRegularMonthly,
        totalGoalMonthly,
        totalAllocatedMonthly,
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
