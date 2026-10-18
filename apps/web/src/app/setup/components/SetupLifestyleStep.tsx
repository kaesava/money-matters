"use client";

import React from "react";
import { HousingType, VehicleConfig, ChildConfig } from "@money-matters/types";
import { InfoTooltip } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { LifestyleHousingTransport } from "./LifestyleHousingTransport";
import { LifestyleFamilyObligations } from "./LifestyleFamilyObligations";
import { LifestyleDiscretionarySliders } from "./LifestyleDiscretionarySliders";

interface SetupLifestyleStepProps {
  country?: "AU" | "NZ" | "OTHER";
  housingType: HousingType;
  setHousingType: (val: HousingType) => void;
  hasCars: boolean;
  setHasCars: (val: boolean) => void;
  vehicles: VehicleConfig[];
  onAddVehicle: () => void;
  onUpdateVehicle: <K extends keyof VehicleConfig>(id: string, field: K, value: VehicleConfig[K]) => void;
  onRemoveVehicle: (id: string) => void;
  usePublicTransport: boolean;
  setUsePublicTransport: (val: boolean) => void;
  useRideshare: boolean;
  setUseRideshare: (val: boolean) => void;
  hasKids: boolean;
  setHasKids: (val: boolean) => void;
  childrenList: ChildConfig[];
  onAddChild: () => void;
  onUpdateChild: <K extends keyof ChildConfig>(id: string, field: K, value: ChildConfig[K]) => void;
  onRemoveChild: (id: string) => void;
  hasPrivateHealth: boolean;
  setHasPrivateHealth: (val: boolean) => void;
  hasGym: boolean;
  setHasGym: (val: boolean) => void;
  hasMedicalOutofPocket?: boolean;
  setHasMedicalOutofPocket?: (val: boolean) => void;
  hasDebt?: boolean;
  setHasDebt?: (val: boolean) => void;
  debtMonthlyRepayment?: number;
  setDebtMonthlyRepayment?: (val: number) => void;
  hasPets?: boolean;
  setHasPets?: (val: boolean) => void;
  petsCount?: number;
  setPetsCount?: (val: number) => void;
  hasCharityGiving?: boolean;
  setHasCharityGiving?: (val: boolean) => void;
  charityMonthlyAmount?: number;
  setCharityMonthlyAmount?: (val: number) => void;
  weeklyGroceries: number;
  setWeeklyGroceries: (val: number) => void;
  weeklyDining: number;
  setWeeklyDining: (val: number) => void;
  weeklyPersonal: number;
  setWeeklyPersonal: (val: number) => void;
  onBack: () => void;
  onNext: () => void;
  totalSteps?: number;
}

export function SetupLifestyleStep({
  country = "AU",
  housingType,
  setHousingType,
  hasCars,
  setHasCars,
  vehicles,
  onAddVehicle,
  onUpdateVehicle,
  onRemoveVehicle,
  usePublicTransport,
  setUsePublicTransport,
  useRideshare,
  setUseRideshare,
  hasKids,
  setHasKids,
  childrenList,
  onAddChild,
  onUpdateChild,
  onRemoveChild,
  hasPrivateHealth,
  setHasPrivateHealth,
  hasGym,
  setHasGym,
  hasMedicalOutofPocket = false,
  setHasMedicalOutofPocket,
  hasDebt = false,
  setHasDebt,
  debtMonthlyRepayment = 0,
  setDebtMonthlyRepayment,
  hasPets = false,
  setHasPets,
  petsCount = 1,
  setPetsCount,
  hasCharityGiving = false,
  setHasCharityGiving,
  charityMonthlyAmount = 0,
  setCharityMonthlyAmount,
  weeklyGroceries,
  setWeeklyGroceries,
  weeklyDining,
  setWeeklyDining,
  weeklyPersonal,
  setWeeklyPersonal,
  onBack,
  onNext,
  totalSteps = 4,
}: SetupLifestyleStepProps) {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200 max-h-[60vh] overflow-y-auto pr-1">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-[#1B2B4B]">
              {t("setup.lifestyle.title")}
            </h2>
            {country === "AU" && (
              <InfoTooltip
                title={t("setup.lifestyle.benchmarksTitle")}
                content={t("setup.lifestyle.benchmarksContent")}
              />
            )}
          </div>
          <span className="text-xs font-bold text-zinc-400 bg-slate-100 px-3 py-1 rounded-full border border-zinc-200">
            {t("setup.stepOf", { step: 4, total: totalSteps })}
          </span>
        </div>
        <p className="text-xs text-zinc-500 font-semibold mt-1">
          {country === "AU"
            ? t("setup.lifestyle.benchmarksContent")
            : t("setup.lifestyle.subtitle")}
        </p>
      </div>

      <LifestyleHousingTransport
        housingType={housingType}
        setHousingType={setHousingType}
        hasCars={hasCars}
        setHasCars={setHasCars}
        vehicles={vehicles}
        onAddVehicle={onAddVehicle}
        onUpdateVehicle={onUpdateVehicle}
        onRemoveVehicle={onRemoveVehicle}
        usePublicTransport={usePublicTransport}
        setUsePublicTransport={setUsePublicTransport}
        useRideshare={useRideshare}
        setUseRideshare={setUseRideshare}
      />

      <LifestyleFamilyObligations
        hasKids={hasKids}
        setHasKids={setHasKids}
        childrenList={childrenList}
        onAddChild={onAddChild}
        onUpdateChild={onUpdateChild}
        onRemoveChild={onRemoveChild}
        hasPrivateHealth={hasPrivateHealth}
        setHasPrivateHealth={setHasPrivateHealth}
        hasGym={hasGym}
        setHasGym={setHasGym}
        hasMedicalOutofPocket={hasMedicalOutofPocket}
        setHasMedicalOutofPocket={setHasMedicalOutofPocket}
        hasDebt={hasDebt}
        setHasDebt={setHasDebt}
        debtMonthlyRepayment={debtMonthlyRepayment}
        setDebtMonthlyRepayment={setDebtMonthlyRepayment}
        hasPets={hasPets}
        setHasPets={setHasPets}
        petsCount={petsCount}
        setPetsCount={setPetsCount}
        hasCharityGiving={hasCharityGiving}
        setHasCharityGiving={setHasCharityGiving}
        charityMonthlyAmount={charityMonthlyAmount}
        setCharityMonthlyAmount={setCharityMonthlyAmount}
      />

      <LifestyleDiscretionarySliders
        weeklyGroceries={weeklyGroceries}
        setWeeklyGroceries={setWeeklyGroceries}
        weeklyDining={weeklyDining}
        setWeeklyDining={setWeeklyDining}
        weeklyPersonal={weeklyPersonal}
        setWeeklyPersonal={setWeeklyPersonal}
        isZeroBased={country !== "AU"}
      />

      <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-700 cursor-pointer"
        >
          {t("common.back")}
        </button>
        <button
          type="button"
          onClick={onNext}
          className="px-6 py-3 text-xs font-bold rounded-xl bg-[#2563eb] text-white hover:bg-blue-700 transition-all shadow-md cursor-pointer"
        >
          {t("common.next")} →
        </button>
      </div>
    </div>
  );
}
