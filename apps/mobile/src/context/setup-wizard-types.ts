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

export interface MobileBankAccountItem {
  id: string;
  name: string;
  bankProvider: string;
  accountType?: string | null;
  lastKnownBalance: string;
  unbudgetedBuffer?: string | null;
  isPrivate?: boolean | null;
}

export interface SetupWizardContextValue {
  isRerun: boolean;
  totalSteps: number;
  isLoadingExistingData: boolean;
  country: 'AU' | 'NZ' | 'OTHER';
  setCountry: (c: 'AU' | 'NZ' | 'OTHER') => void;
  incomes: IncomeItem[];
  setIncomes: React.Dispatch<React.SetStateAction<IncomeItem[]>>;
  handleRemoveIncome: (id: string) => void;
  bankAccounts: MobileBankAccountItem[];
  setBankAccounts: React.Dispatch<React.SetStateAction<MobileBankAccountItem[]>>;
  handleAddAccount: () => void;
  handleUpdateAccount: (
    acc: MobileBankAccountItem,
    field: 'name' | 'bankProvider' | 'accountType' | 'lastKnownBalance' | 'unbudgetedBuffer' | 'isPrivate',
    val: string | boolean
  ) => void;
  handleRemoveAccount: (id: string) => void;
  archivedAccountIds: Set<string>;
  archivedIncomeIds: Set<string>;
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
