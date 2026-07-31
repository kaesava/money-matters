"use client";

import React, { useState } from "react";
import { t } from "@money-matters/i18n";

export const PaycheckSimulator: React.FC = () => {
  const [paycheckAmount, setPaycheckAmount] = useState(2500);

  const rentAlloc = Math.min(1200, paycheckAmount * 0.48);
  const utilitiesAlloc = Math.min(300, Math.max(0, (paycheckAmount - rentAlloc) * 0.25));
  const emergencyAlloc = Math.min(500, Math.max(0, (paycheckAmount - rentAlloc - utilitiesAlloc) * 0.35));
  const everydayAlloc = Math.max(0, paycheckAmount - rentAlloc - utilitiesAlloc - emergencyAlloc);

  return (
    <section id="simulator" className="bg-white border-y border-[#e2e4e0] py-20">
      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-12 gap-12 items-center">
        <div className="md:col-span-5 flex flex-col gap-6">
          <h2 className="text-3xl font-bold tracking-tight text-[#1B2B4B]">
            {t("landing.simulatorTitle")}
          </h2>
          <p className="text-zinc-600 leading-relaxed">
            {t("landing.simulatorDescription")}
          </p>
          <div className="bg-[#fbf9f1] p-6 rounded-xl border border-[#e2e4e0] flex flex-col gap-4">
            <div className="flex justify-between font-bold text-sm">
              <span>{t("landing.simulatedPaycheck")}</span>
              <span className="text-[#8a9a5b]">${paycheckAmount.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min="500"
              max="5000"
              step="100"
              value={paycheckAmount}
              onChange={(e) => setPaycheckAmount(Number(e.target.value))}
              className="w-full accent-[#8a9a5b] cursor-pointer"
            />
            <div className="flex justify-between text-xs text-zinc-400">
              <span>$500</span>
              <span>$5,000</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-7 bg-[#fbf9f1] p-6 rounded-2xl border border-[#e2e4e0] shadow-sm flex flex-col gap-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">{t("landing.realTimeRecs")}</h3>

          <div className="bg-white p-4 rounded-xl border border-[#e2e4e0] flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-zinc-800 text-sm">{t("landing.rentMortgage")}</span>
              <span className="text-emerald-600 font-bold text-sm">${rentAlloc.toFixed(0)} / $1,200</span>
            </div>
            <div className="w-full bg-[#fbf9f1] h-3.5 rounded-full overflow-hidden border border-zinc-100">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${(rentAlloc / 1200) * 100}%` }}
              />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#e2e4e0] flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-zinc-800 text-sm">{t("landing.electricityBills")}</span>
              <span className={`${utilitiesAlloc >= 300 ? "text-emerald-600" : "text-amber-500"} font-bold text-sm`}>
                ${utilitiesAlloc.toFixed(0)} / $300
              </span>
            </div>
            <div className="w-full bg-[#fbf9f1] h-3.5 rounded-full overflow-hidden border border-zinc-100">
              <div
                className={`${utilitiesAlloc >= 300 ? "bg-emerald-500" : "bg-amber-400"} h-full rounded-full transition-all duration-300`}
                style={{ width: `${(utilitiesAlloc / 300) * 100}%` }}
              />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#e2e4e0] flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-zinc-800 text-sm">{t("landing.emergencySavings")}</span>
              <span className={`${emergencyAlloc >= 500 ? "text-emerald-600" : "text-amber-500"} font-bold text-sm`}>
                ${emergencyAlloc.toFixed(0)} / $500
              </span>
            </div>
            <div className="w-full bg-[#fbf9f1] h-3.5 rounded-full overflow-hidden border border-zinc-100">
              <div
                className={`${emergencyAlloc >= 500 ? "bg-emerald-500" : "bg-amber-400"} h-full rounded-full transition-all duration-300`}
                style={{ width: `${(emergencyAlloc / 500) * 100}%` }}
              />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#e2e4e0] flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-zinc-800 text-sm">{t("landing.everydaySpending")}</span>
              <span className="text-zinc-600 font-bold text-sm">${everydayAlloc.toFixed(0)}</span>
            </div>
            <div className="w-full bg-[#fbf9f1] h-3.5 rounded-full overflow-hidden border border-zinc-100">
              <div
                className="bg-[#8a9a5b] h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (everydayAlloc / 1000) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
