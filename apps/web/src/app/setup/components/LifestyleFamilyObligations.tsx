"use client";

import React from "react";
import { SchoolType, SchoolStage, ChildConfig } from "@money-matters/types";
import { AmountField } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";

interface LifestyleFamilyObligationsProps {
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
}

export function LifestyleFamilyObligations({
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
}: LifestyleFamilyObligationsProps) {
  return (
    <div className="flex flex-col gap-4">
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
            {t("setup.lifestyle.dependentsTitle")}
          </label>
        </div>

        {hasKids && (
          <div className="flex flex-col gap-3 pt-2">
            {childrenList.map((ch, idx) => (
              <div key={ch.id} className="p-3 bg-white rounded-xl border border-zinc-200 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1B2B4B]">Child #{idx + 1}</span>
                  {childrenList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveChild(ch.id)}
                      className="text-[11px] font-bold text-red-500 hover:text-red-700 cursor-pointer"
                    >
                      {t("common.remove")}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={ch.name}
                    onChange={(e) => onUpdateChild(ch.id, "name", e.target.value)}
                    placeholder="Name / Label"
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200"
                  />
                  <select
                    value={ch.stage}
                    onChange={(e) => onUpdateChild(ch.id, "stage", e.target.value as SchoolStage)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200 bg-white"
                  >
                    <option value="DAYCARE">{t("setup.lifestyle.stageDaycare")}</option>
                    <option value="PRIMARY">{t("setup.lifestyle.stagePrimary")}</option>
                    <option value="HIGH_SCHOOL">{t("setup.lifestyle.stageHighSchool")}</option>
                  </select>
                  <select
                    value={ch.type}
                    onChange={(e) => onUpdateChild(ch.id, "type", e.target.value as SchoolType)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200 bg-white"
                  >
                    <option value="PUBLIC">{t("setup.lifestyle.schoolPublic")}</option>
                    <option value="PRIVATE">{t("setup.lifestyle.schoolPrivate")}</option>
                  </select>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={onAddChild}
              className="py-1.5 px-3 bg-white text-zinc-700 text-xs font-bold rounded-lg hover:bg-slate-100 border border-zinc-200 transition-colors cursor-pointer"
            >
              + {t("setup.lifestyle.addChild")}
            </button>
          </div>
        )}
      </div>

      {/* Health, Fitness & Out of Pocket */}
      <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl border border-zinc-200/60">
        <span className="text-xs font-black text-[#1B2B4B]">
          {t("setup.lifestyle.healthcarePetsTitle")}
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex items-center gap-2 text-xs font-bold bg-white p-3 rounded-xl border border-zinc-200 cursor-pointer">
            <input
              type="checkbox"
              checked={hasPrivateHealth}
              onChange={(e) => setHasPrivateHealth(e.target.checked)}
              className="w-4 h-4 text-[#2563eb] rounded-md"
            />
            {t("setup.lifestyle.privateHealth")}
          </label>
          <label className="flex items-center gap-2 text-xs font-bold bg-white p-3 rounded-xl border border-zinc-200 cursor-pointer">
            <input
              type="checkbox"
              checked={hasGym}
              onChange={(e) => setHasGym(e.target.checked)}
              className="w-4 h-4 text-[#2563eb] rounded-md"
            />
            Gym &amp; Fitness
          </label>
          <label className="flex items-center gap-2 text-xs font-bold bg-white p-3 rounded-xl border border-zinc-200 cursor-pointer">
            <input
              type="checkbox"
              checked={hasMedicalOutofPocket}
              onChange={(e) => setHasMedicalOutofPocket?.(e.target.checked)}
              className="w-4 h-4 text-[#2563eb] rounded-md"
            />
            Medical &amp; Prescriptions
          </label>
        </div>
      </div>

      {/* Other Obligations (Debt, Pets, Charity & Family Support) */}
      <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl border border-zinc-200/60">
        <span className="text-xs font-black text-[#1B2B4B]">{t("setup.lifestyle.debtTitle")}</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 bg-white rounded-xl border border-zinc-200 flex flex-col gap-2">
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={hasDebt}
                onChange={(e) => setHasDebt?.(e.target.checked)}
                className="w-4 h-4 text-[#2563eb] rounded-md"
              />
              {t("setup.lifestyle.haveDebt")}
            </label>
            {hasDebt && (
              <div className="mt-1">
                <AmountField
                  placeholder="Monthly Repayment ($)"
                  value={debtMonthlyRepayment ? String(debtMonthlyRepayment) : ""}
                  onChange={(val) => setDebtMonthlyRepayment?.(parseFloat(val) || 0)}
                  allowNegative={false}
                />
              </div>
            )}
          </div>

          <div className="p-3 bg-white rounded-xl border border-zinc-200 flex flex-col gap-2">
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={hasPets}
                onChange={(e) => setHasPets?.(e.target.checked)}
                className="w-4 h-4 text-[#2563eb] rounded-md"
              />
              {t("setup.lifestyle.pets")}
            </label>
            {hasPets && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold">{t("common.count")}:</span>
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

          <div className="p-3 bg-white rounded-xl border border-zinc-200 flex flex-col gap-2 sm:col-span-2">
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={hasCharityGiving}
                onChange={(e) => setHasCharityGiving?.(e.target.checked)}
                className="w-4 h-4 text-[#2563eb] rounded-md"
              />
              Charity Donations &amp; Family Support
            </label>
            {hasCharityGiving && (
              <div className="mt-1 max-w-xs">
                <AmountField
                  placeholder="Monthly Contribution ($)"
                  value={charityMonthlyAmount ? String(charityMonthlyAmount) : ""}
                  onChange={(val) => setCharityMonthlyAmount?.(parseFloat(val) || 0)}
                  allowNegative={false}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
