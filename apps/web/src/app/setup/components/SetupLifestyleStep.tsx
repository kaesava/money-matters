"use client";

import React from "react";
import { HousingType, CarSize, SchoolType, SchoolStage, VehicleConfig, ChildConfig } from "@money-matters/types";
import { InfoTooltip } from "@money-matters/ui";

interface SetupLifestyleStepProps {
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
  showIcons?: boolean;
}

export function SetupLifestyleStep({
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
  showIcons = true,
}: SetupLifestyleStepProps) {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200 max-h-[60vh] overflow-y-auto pr-1">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-[#1B2B4B]">
              {showIcons ? "🏡 " : ""}Lifestyle Setup
            </h2>
            <InfoTooltip
              title="Australian Lifestyle Benchmarks"
              content="We use official 2025/2026 Australian Bureau of Statistics (ABS) & RACQ benchmark statistics to calculate initial bill estimates tailored specifically for your lifestyle."
            />
          </div>
          <span className="text-xs font-bold text-zinc-400 bg-slate-100 px-3 py-1 rounded-full border border-zinc-200">
            Step 3 of 3
          </span>
        </div>
        <p className="text-xs text-zinc-500 font-semibold mt-1">
          Tell us a few details about your living setup so we can auto-estimate baseline bill costs.
        </p>
      </div>

      {/* Housing Setup */}
      <div className="flex flex-col gap-2 p-4 bg-slate-50 rounded-2xl border border-zinc-200/60">
        <div className="flex items-center gap-2">
          <label className="text-xs font-black text-[#1B2B4B]">🏡 Housing Setup</label>
          <InfoTooltip
            title="Why Rent Solo vs Sharehouse matters"
            content="Renting solo means you cover 100% of the property lease and utility connections. In a Sharehouse, rent is split and utility bills are shared among housemates, lowering your baseline obligation."
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
          {[
            { id: "RENT_SOLO", label: "Rent (Solo)" },
            { id: "RENT_SHARE", label: "Sharehouse" },
            { id: "OWN_MORTGAGE", label: "Mortgage" },
            { id: "OWN_OUTRIGHT", label: "Own Outright" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setHousingType(opt.id as HousingType)}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                housingType === opt.id
                  ? "bg-[#2563eb] text-white border-[#2563eb] shadow-xs"
                  : "bg-white text-[#1B2B4B] border-zinc-200 hover:border-zinc-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transport & Vehicles */}
      <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl border border-zinc-200/60">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-[#1B2B4B]">🚗 Transport &amp; Vehicles</span>
          <InfoTooltip
            title="RACQ Vehicle Benchmarks"
            content="Different vehicle sizes have different rego, fuel, insurance and maintenance cost benchmarks in Australia. Adding multiple vehicles calculates accurate bills for each."
          />
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={hasCars}
              onChange={(e) => setHasCars(e.target.checked)}
              className="w-4 h-4 text-[#2563eb] rounded-md"
            />
            Own Vehicle(s)
          </label>
          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={usePublicTransport}
              onChange={(e) => setUsePublicTransport(e.target.checked)}
              className="w-4 h-4 text-[#2563eb] rounded-md"
            />
            Public Transport
          </label>
          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={useRideshare}
              onChange={(e) => setUseRideshare(e.target.checked)}
              className="w-4 h-4 text-[#2563eb] rounded-md"
            />
            Rideshare / Taxi
          </label>
        </div>

        {hasCars && (
          <div className="flex flex-col gap-3 pt-2">
            {vehicles.map((v, idx) => (
              <div key={v.id} className="p-3 bg-white rounded-xl border border-zinc-200 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1B2B4B]">Vehicle #{idx + 1}</span>
                  {vehicles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveVehicle(v.id)}
                      className="text-[11px] font-bold text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={v.name}
                    onChange={(e) => onUpdateVehicle(v.id, "name", e.target.value)}
                    placeholder="Label (e.g. My SUV, Car 1)"
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200"
                  />
                  <select
                    value={v.size}
                    onChange={(e) => onUpdateVehicle(v.id, "size", e.target.value as CarSize)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200 bg-white"
                  >
                    <option value="SMALL">Small / Hatchback</option>
                    <option value="MID_SUV">Mid-size SUV / Sedan</option>
                    <option value="LUXURY">4WD / Performance</option>
                  </select>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={onAddVehicle}
              className="py-1.5 px-3 bg-white text-zinc-700 text-xs font-bold rounded-lg hover:bg-slate-100 border border-zinc-200 transition-colors"
            >
              + Add Another Vehicle
            </button>
          </div>
        )}
      </div>

      {/* Dependents & Children */}
      <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl border border-zinc-200/60">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-black text-[#1B2B4B] cursor-pointer">
            <input
              type="checkbox"
              checked={hasKids}
              onChange={(e) => setHasKids(e.target.checked)}
              className="w-4 h-4 text-[#2563eb] rounded-md"
            />
            👨‍👩‍👧 Dependents / Children
          </label>
          <InfoTooltip
            title="Schooling & Childcare"
            content="Child tuition and early learning benchmarks are dynamically scaled based on public, catholic, or private schooling choices."
          />
        </div>

        {hasKids && (
          <div className="flex flex-col gap-3 pt-2">
            {childrenList.map((c, idx) => (
              <div key={c.id} className="p-3 bg-white rounded-xl border border-zinc-200 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1B2B4B]">Child #{idx + 1}</span>
                  {childrenList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveChild(c.id)}
                      className="text-[11px] font-bold text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={c.name}
                    onChange={(e) => onUpdateChild(c.id, "name", e.target.value)}
                    placeholder="Child Name / Label"
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200"
                  />
                  <select
                    value={c.stage}
                    onChange={(e) => onUpdateChild(c.id, "stage", e.target.value as SchoolStage)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200 bg-white"
                  >
                    <option value="CHILDCARE">Childcare / Daycare</option>
                    <option value="PRIMARY">Primary School</option>
                    <option value="SECONDARY">High School</option>
                  </select>
                  <select
                    value={c.type}
                    onChange={(e) => onUpdateChild(c.id, "type", e.target.value as SchoolType)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200 bg-white"
                  >
                    <option value="PUBLIC">Public</option>
                    <option value="CATHOLIC">Systemic / Catholic</option>
                    <option value="PRIVATE">Independent / Private</option>
                  </select>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={onAddChild}
              className="py-1.5 px-3 bg-white text-zinc-700 text-xs font-bold rounded-lg hover:bg-slate-100 border border-zinc-200 transition-colors"
            >
              + Add Another Child
            </button>
          </div>
        )}
      </div>

      {/* Health & Wellbeing */}
      <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl border border-zinc-200/60">
        <span className="text-xs font-black text-[#1B2B4B]">🏥 Health &amp; Wellbeing</span>
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={hasPrivateHealth}
              onChange={(e) => setHasPrivateHealth(e.target.checked)}
              className="w-4 h-4 text-[#2563eb] rounded-md"
            />
            Private Health Cover
          </label>
          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={hasGym}
              onChange={(e) => setHasGym(e.target.checked)}
              className="w-4 h-4 text-[#2563eb] rounded-md"
            />
            Gym / Fitness
          </label>
          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={hasMedicalOutofPocket}
              onChange={(e) => setHasMedicalOutofPocket?.(e.target.checked)}
              className="w-4 h-4 text-[#2563eb] rounded-md"
            />
            Out-of-Pocket Medical / Pharmacy
          </label>
        </div>
      </div>

      {/* Other Obligations (Debt, Pets, Charity & Family Support) */}
      <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl border border-zinc-200/60">
        <span className="text-xs font-black text-[#1B2B4B]">💳 Other Obligations</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Active Debt */}
          <div className="p-3 bg-white rounded-xl border border-zinc-200 flex flex-col gap-2">
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={hasDebt}
                onChange={(e) => setHasDebt?.(e.target.checked)}
                className="w-4 h-4 text-[#2563eb] rounded-md"
              />
              💳 Active Debt Repayments
            </label>
            {hasDebt && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold">$</span>
                <input
                  type="number"
                  placeholder="Monthly Repayment ($)"
                  value={debtMonthlyRepayment || ""}
                  onChange={(e) => setDebtMonthlyRepayment?.(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1 text-xs border border-zinc-200 rounded-lg font-mono"
                />
              </div>
            )}
          </div>

          {/* Pets */}
          <div className="p-3 bg-white rounded-xl border border-zinc-200 flex flex-col gap-2">
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={hasPets}
                onChange={(e) => setHasPets?.(e.target.checked)}
                className="w-4 h-4 text-[#2563eb] rounded-md"
              />
              🐾 Pets (Dogs/Cats/Other)
            </label>
            {hasPets && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold">Count:</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={petsCount || 1}
                  onChange={(e) => setPetsCount?.(parseInt(e.target.value) || 1)}
                  className="w-20 px-2 py-1 text-xs border border-zinc-200 rounded-lg font-mono text-center"
                />
              </div>
            )}
          </div>

          {/* Charity & Family Support */}
          <div className="p-3 bg-white rounded-xl border border-zinc-200 flex flex-col gap-2 sm:col-span-2">
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={hasCharityGiving}
                onChange={(e) => setHasCharityGiving?.(e.target.checked)}
                className="w-4 h-4 text-[#2563eb] rounded-md"
              />
              ❤️ Charity Donations &amp; 🤝 Family Support
            </label>
            {hasCharityGiving && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold">$</span>
                <input
                  type="number"
                  placeholder="Monthly Contribution ($)"
                  value={charityMonthlyAmount || ""}
                  onChange={(e) => setCharityMonthlyAmount?.(parseFloat(e.target.value) || 0)}
                  className="w-full max-w-xs px-2.5 py-1 text-xs border border-zinc-200 rounded-lg font-mono"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Weekly Discretionary Spending Sliders */}
      <div className="flex flex-col gap-4 p-4 bg-slate-50 rounded-2xl border border-zinc-200/60">
        <span className="text-xs font-black uppercase tracking-wider text-zinc-400">
          Weekly Discretionary Spending Estimates
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5 bg-white p-3 rounded-xl border border-zinc-200">
            <div className="flex justify-between items-center text-xs font-bold text-[#1B2B4B]">
              <span>🛒 Groceries</span>
              <span className="text-[#2563eb] font-mono">${weeklyGroceries}/wk</span>
            </div>
            <input
              type="range"
              min="100"
              max="600"
              step="10"
              value={weeklyGroceries}
              onChange={(e) => setWeeklyGroceries(parseInt(e.target.value))}
              className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#2563eb]"
            />
          </div>

          <div className="flex flex-col gap-1.5 bg-white p-3 rounded-xl border border-zinc-200">
            <div className="flex justify-between items-center text-xs font-bold text-[#1B2B4B]">
              <span>☕ Dining &amp; Fun</span>
              <span className="text-[#2563eb] font-mono">${weeklyDining}/wk</span>
            </div>
            <input
              type="range"
              min="50"
              max="500"
              step="10"
              value={weeklyDining}
              onChange={(e) => setWeeklyDining(parseInt(e.target.value))}
              className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#2563eb]"
            />
          </div>

          <div className="flex flex-col gap-1.5 bg-white p-3 rounded-xl border border-zinc-200">
            <div className="flex justify-between items-center text-xs font-bold text-[#1B2B4B]">
              <span>🛍️ Personal &amp; Buffer</span>
              <span className="text-[#2563eb] font-mono">${weeklyPersonal}/wk</span>
            </div>
            <input
              type="range"
              min="30"
              max="400"
              step="10"
              value={weeklyPersonal}
              onChange={(e) => setWeeklyPersonal(parseInt(e.target.value))}
              className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#2563eb]"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-700"
        >
          ← Back to Goals
        </button>
        <button
          type="button"
          onClick={onNext}
          className="px-6 py-3 text-xs font-bold rounded-xl bg-[#2563eb] text-white hover:bg-blue-700 transition-all shadow-md"
        >
          Review Budget Summary →
        </button>
      </div>
    </div>
  );
}
