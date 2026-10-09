import React from 'react';
import {
  HousingType,
  VehicleConfig,
  ChildConfig,
  IncomeItem,
  UserGoalItem,
  EstimatedCategoryItem,
  calculateQuizEstimates,
} from '@money-matters/types';

export interface SetupWizardContextValue {
  isRerun: boolean;
  totalSteps: number;
  isLoadingExistingData: boolean;
  incomes: IncomeItem[];
  setIncomes: React.Dispatch<React.SetStateAction<IncomeItem[]>>;
  goals: UserGoalItem[];
  setGoals: React.Dispatch<React.SetStateAction<UserGoalItem[]>>;
  housingType: HousingType;
  setHousingType: (v: HousingType) => void;
  hasCars: boolean;
  setHasCars: (v: boolean) => void;
  vehicles: VehicleConfig[];
  setVehicles: React.Dispatch<React.SetStateAction<VehicleConfig[]>>;
  usePublicTransport: boolean;
  setUsePublicTransport: (v: boolean) => void;
  useRideshare: boolean;
  setUseRideshare: (v: boolean) => void;
  hasKids: boolean;
  setHasKids: (v: boolean) => void;
  children: ChildConfig[];
  setChildren: React.Dispatch<React.SetStateAction<ChildConfig[]>>;
  hasPrivateHealth: boolean;
  setHasPrivateHealth: (v: boolean) => void;
  hasGym: boolean;
  setHasGym: (v: boolean) => void;
  hasMedicalOutofPocket: boolean;
  setHasMedicalOutofPocket: (v: boolean) => void;
  hasDebt: boolean;
  setHasDebt: (v: boolean) => void;
  debtMonthlyRepayment: number;
  setDebtMonthlyRepayment: (v: number) => void;
  hasPets: boolean;
  setHasPets: (v: boolean) => void;
  petsCount: number;
  setPetsCount: (v: number) => void;
  hasCharityGiving: boolean;
  setHasCharityGiving: (v: boolean) => void;
  charityMonthlyAmount: number;
  setCharityMonthlyAmount: (v: number) => void;
  weeklyGroceries: number;
  setWeeklyGroceries: (v: number) => void;
  weeklyDining: number;
  setWeeklyDining: (v: number) => void;
  weeklyPersonal: number;
  setWeeklyPersonal: (v: number) => void;
  customCategories: EstimatedCategoryItem[];
  setCustomCategories: React.Dispatch<React.SetStateAction<EstimatedCategoryItem[]>>;
  removedCategoryNames: Set<string>;
  setRemovedCategoryNames: React.Dispatch<React.SetStateAction<Set<string>>>;
  amountOverrides: Record<string, number>;
  setAmountOverrides: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  categoryFrequencies: Record<string, 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'YEARLY'>;
  setCategoryFrequencies: React.Dispatch<
    React.SetStateAction<Record<string, 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'YEARLY'>>
  >;
  estimation: ReturnType<typeof calculateQuizEstimates>;
  activeCategories: EstimatedCategoryItem[];
  activeEveryday: EstimatedCategoryItem[];
  activeRegular: EstimatedCategoryItem[];
  activeGoals: EstimatedCategoryItem[];
  totalEverydayMonthly: number;
  totalRegularMonthly: number;
  totalGoalMonthly: number;
  totalAllocatedMonthly: number;
  sweepQueue: Array<{ poolId: string; sweepDestinationPoolId?: string | null }>;
  activeSweepPool: { id: string; name: string; balance: number } | null;
  setActiveSweepPool: (pool: { id: string; name: string; balance: number } | null) => void;
  selectedSweepDest: string;
  setSelectedSweepDest: (id: string) => void;
  availablePools: Array<{ id: string; name: string; isSurplusTarget?: boolean | null }>;
  handleRemoveGoal: (id: string) => void;
  confirmSweepAndRemove: () => void;
  autoCreateExpenseSchedules: boolean;
  setAutoCreateExpenseSchedules: React.Dispatch<React.SetStateAction<boolean>>;
}
