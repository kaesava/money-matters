"use client";

import { useState } from "react";
import {
  HousingType,
  VehicleConfig,
  ChildConfig,
} from "@money-matters/types";

export function useSetupLifestyleState(initialCountry: "AU" | "NZ" | "OTHER" = "AU") {
  const [country, setCountry] = useState<"AU" | "NZ" | "OTHER">(initialCountry);
  const [housingType, setHousingType] = useState<HousingType>("RENT_SOLO");
  const [hasCars, setHasCars] = useState(true);
  const [vehicles, setVehicles] = useState<VehicleConfig[]>([{ id: "veh-1", name: "Vehicle 1", size: "MID_SUV" }]);
  const [usePublicTransport, setUsePublicTransport] = useState(true);
  const [useRideshare, setUseRideshare] = useState(false);
  const [hasKids, setHasKids] = useState(false);
  const [children, setChildren] = useState<ChildConfig[]>([{ id: "child-1", name: "Child 1", stage: "PRIMARY", type: "PUBLIC" }]);
  const [hasPrivateHealth, setHasPrivateHealth] = useState(true);
  const [hasGym, setHasGym] = useState(false);
  const [hasMedicalOutofPocket, setHasMedicalOutofPocket] = useState(false);
  const [hasDebt, setHasDebt] = useState(false);
  const [debtMonthlyRepayment, setDebtMonthlyRepayment] = useState(0);
  const [hasPets, setHasPets] = useState(false);
  const [petsCount, setPetsCount] = useState(1);
  const [hasCharityGiving, setHasCharityGiving] = useState(false);
  const [charityMonthlyAmount, setCharityMonthlyAmount] = useState(0);
  const [weeklyGroceries, setWeeklyGroceries] = useState(initialCountry === "AU" ? 270 : 0);
  const [weeklyDining, setWeeklyDining] = useState(initialCountry === "AU" ? 240 : 0);
  const [weeklyPersonal, setWeeklyPersonal] = useState(initialCountry === "AU" ? 100 : 0);

  return {
    country,
    setCountry,
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
  };
}
