"use client";

import React, { useState } from "react";
import { t } from "@money-matters/i18n";
import { useLocale } from "../../providers/LocaleProvider";
import { ModalDialog } from "@money-matters/ui/web";

export interface InteractivePaydayEngineProps {
  onAuthClick: (tab: "signIn" | "signUp") => void;
}

export function InteractivePaydayEngine({ onAuthClick }: InteractivePaydayEngineProps) {
  const { currencySymbol } = useLocale();
  const [activeTab, setActiveTab] = useState<"waterfall" | "afford">("waterfall");
  const [netIncome, setNetIncome] = useState<number>(2800);
  const [cadence, setCadence] = useState<"weekly" | "fortnightly" | "monthly">("fortnightly");

  // Afford simulator state
  const [testAmount, setTestAmount] = useState<string>("180");
  const [testCategory, setTestCategory] = useState<"everyday" | "goal">("everyday");
  const [verdict, setVerdict] = useState<{
    status: "safe" | "pacing" | "goal" | "wait" | "no";
    title: string;
    desc: string;
  } | null>(null);

  // Transfer Modal state for interactive simulation
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferFrom, setTransferFrom] = useState<string>("everyday");
  const [transferAmount, setTransferAmount] = useState<string>("50");

  // Mathematical dynamic allocation based on netIncome
  const billsTarget = Math.round(netIncome * 0.50);
  const everydayTarget = Math.round(netIncome * 0.25);
  const goalsTarget = Math.round(netIncome * 0.18);
  const surplusOffset = Math.max(0, netIncome - billsTarget - everydayTarget - goalsTarget);

  const handleRunAffordTest = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(testAmount) || 0;

    if (amount <= 0) return;

    if (amount <= everydayTarget * 0.4) {
      setVerdict({
        status: "safe",
        title: t("landing.affordVerdictSafeTitle"),
        desc: t("landing.affordVerdictSafeDesc"),
      });
    } else if (amount <= everydayTarget * 0.75) {
      setVerdict({
        status: "pacing",
        title: t("landing.affordVerdictPacingTitle"),
        desc: t("landing.affordVerdictPacingDesc"),
      });
    } else if (amount <= everydayTarget) {
      setVerdict({
        status: "goal",
        title: t("landing.affordVerdictGoalTitle"),
        desc: t("landing.affordVerdictGoalDesc"),
      });
    } else if (amount <= netIncome) {
      setVerdict({
        status: "wait",
        title: t("landing.affordVerdictWaitTitle"),
        desc: t("landing.affordVerdictWaitDesc"),
      });
    } else {
      setVerdict({
        status: "no",
        title: t("landing.affordVerdictNoTitle"),
        desc: t("landing.affordVerdictNoDesc"),
      });
    }
  };

  return (
    <section
      id="simulator"
      className="bg-white border-y border-slate-200/90 py-20 scroll-mt-14"
      aria-label="Interactive Payday Engine"
    >
      <div className="max-w-6xl mx-auto px-6 flex flex-col gap-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb] tracking-wider uppercase shadow-2xs">
            {t("landing.calcBadge")}
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#1B2B4B]">
            {t("landing.calcTitle")}
          </h2>
          <p className="text-slate-600 leading-relaxed text-sm sm:text-base font-medium">
            {t("landing.calcSubtitle")}
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex justify-center">
          <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveTab("waterfall")}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === "waterfall"
                  ? "bg-white text-[#1B2B4B] shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {t("landing.calcTabWaterfall")}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("afford")}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === "afford"
                  ? "bg-white text-[#1B2B4B] shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {t("landing.calcTabAfford")}
            </button>
          </div>
        </div>

        {activeTab === "waterfall" ? (
          <div className="space-y-8">
            {/* Control Strip: Income slider & presets */}
            <div className="p-6 rounded-3xl bg-[#F7F8FA] border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 w-full md:w-1/2">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-black text-[#1B2B4B] uppercase tracking-wider">
                    {t("landing.calcNetIncomeLabel")}
                  </label>
                  <span className="text-xl font-black font-mono text-[#2563eb] tabular-nums">
                    {currencySymbol}{netIncome.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min="1200"
                  max="6000"
                  step="100"
                  value={netIncome}
                  onChange={(e) => setNetIncome(Number(e.target.value))}
                  className="w-full accent-[#2563eb] cursor-pointer"
                />
                <div className="flex gap-2 pt-1">
                  {[1800, 2500, 3200, 4500].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setNetIncome(val)}
                      className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${
                        netIncome === val
                          ? "bg-[#2563eb] text-white border-[#2563eb]"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {currencySymbol}{val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cadence Selector */}
              <div className="space-y-2 w-full md:w-auto">
                <label className="text-xs font-black text-[#1B2B4B] uppercase tracking-wider block">
                  {t("landing.calcCadenceLabel")}
                </label>
                <div className="inline-flex p-1 bg-white rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setCadence("weekly")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      cadence === "weekly"
                        ? "bg-[#1B2B4B] text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {t("landing.calcCadenceWeekly")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCadence("fortnightly")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      cadence === "fortnightly"
                        ? "bg-[#1B2B4B] text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {t("landing.calcCadenceFortnightly")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCadence("monthly")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      cadence === "monthly"
                        ? "bg-[#1B2B4B] text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {t("landing.calcCadenceMonthly")}
                  </button>
                </div>
              </div>
            </div>

            {/* 4-Envelope Allocation Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Envelope 1: Upcoming Bills Ring-Fence */}
              <div className="p-5 rounded-2xl bg-white border border-blue-200/90 shadow-2xs flex flex-col justify-between gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold font-mono text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                      {t("landing.step2Badge")}
                    </span>
                    <span className="text-xs font-black text-[#1B2B4B]">
                      {t("landing.heroBentoBillsTitle")}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTransferFrom("bills");
                      setIsTransferModalOpen(true);
                    }}
                    className="text-[10px] font-bold text-slate-400 hover:text-[#2563eb] cursor-pointer"
                  >
                    ⇄ {t("landing.simTransferAction")}
                  </button>
                </div>
                <div>
                  <div className="text-2xl font-black font-mono text-[#2563eb] tabular-nums">
                    {currencySymbol}{billsTarget.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">
                    {t("landing.heroBentoBillsDue")}
                  </p>
                </div>
                <div className="text-[11px] font-bold text-blue-700 bg-blue-50 p-2 rounded-xl border border-blue-100">
                  {t("landing.protectedOnPayday")}
                </div>
              </div>

              {/* Envelope 2: Everyday Safe-to-Spend */}
              <div className="p-5 rounded-2xl bg-white border-2 border-[#22c55e] shadow-2xs flex flex-col justify-between gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                      {t("landing.step3Badge")}
                    </span>
                    <span className="text-xs font-black text-[#1B2B4B]">
                      {t("landing.heroBentoEverydayTitle")}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTransferFrom("everyday");
                      setIsTransferModalOpen(true);
                    }}
                    className="text-[10px] font-bold text-slate-400 hover:text-[#22c55e] cursor-pointer"
                  >
                    ⇄ {t("landing.simTransferAction")}
                  </button>
                </div>
                <div>
                  <div className="text-2xl font-black font-mono text-[#22c55e] tabular-nums">
                    {currencySymbol}{everydayTarget.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">
                    {t("landing.heroBentoEverydaySubtitle")}
                  </p>
                </div>
                <div className="text-[11px] font-bold text-emerald-800 bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                  {t("landing.spendFreelyNoGuilt")}
                </div>
              </div>

              {/* Envelope 3: Committed Savings Goals */}
              <div className="p-5 rounded-2xl bg-white border border-indigo-200/90 shadow-2xs flex flex-col justify-between gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold font-mono text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                      {t("landing.step3Badge")}
                    </span>
                    <span className="text-xs font-black text-[#1B2B4B]">
                      {t("landing.heroBentoGoalsTitle")}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTransferFrom("goals");
                      setIsTransferModalOpen(true);
                    }}
                    className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 cursor-pointer"
                  >
                    ⇄ {t("landing.simTransferAction")}
                  </button>
                </div>
                <div>
                  <div className="text-2xl font-black font-mono text-indigo-700 tabular-nums">
                    {currencySymbol}{goalsTarget.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">
                    {t("landing.heroBentoGoalsSubtitle")}
                  </p>
                </div>
                <div className="text-[11px] font-bold text-indigo-800 bg-indigo-50 p-2 rounded-xl border border-indigo-100">
                  {t("landing.automaticGoalGrowth")}
                </div>
              </div>

              {/* Envelope 4: Surplus Offset Sweep */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {t("landing.step4Badge")}
                    </span>
                    <span className="text-xs font-black text-[#1B2B4B]">
                      {t("landing.waterfallStep4")}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTransferFrom("surplus");
                      setIsTransferModalOpen(true);
                    }}
                    className="text-[10px] font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    ⇄ {t("landing.simTransferAction")}
                  </button>
                </div>
                <div>
                  <div className="text-2xl font-black font-mono text-slate-800 tabular-nums">
                    +{currencySymbol}{surplusOffset.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">
                    {t("landing.surplusOffset")}
                  </p>
                </div>
                <div className="text-[11px] font-bold text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  {t("landing.reducesMortgageInterest")}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Tab 2: "Can I Afford This?" Instant Simulator */
          <div className="max-w-2xl mx-auto w-full p-8 rounded-3xl bg-[#F7F8FA] border border-slate-200/80 shadow-sm space-y-6">
            <div className="space-y-1 text-center">
              <h3 className="text-xl font-black text-[#1B2B4B]">
                {t("landing.heroBentoSimTitle")}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {t("landing.affordSimSubtitle", { currencySymbol, amount: everydayTarget.toLocaleString() })}
              </p>
            </div>

            <form onSubmit={handleRunAffordTest} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  {t("landing.affordAmountLabel")}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400 font-mono">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    value={testAmount}
                    onChange={(e) => setTestAmount(e.target.value)}
                    placeholder="180"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  {t("landing.affordCategoryLabel")}
                </label>
                <select
                  value={testCategory}
                  onChange={(e) => setTestCategory(e.target.value as "everyday" | "goal")}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                >
                  <option value="everyday">{t("landing.affordEverydayOption")}</option>
                  <option value="goal">{t("landing.affordGoalOption")}</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#1B2B4B] hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {t("landing.affordTestBtn")}
              </button>
            </form>

            {verdict && (
              <div
                className={`p-4 rounded-2xl border space-y-1 ${
                  verdict.status === "safe"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                    : verdict.status === "pacing"
                    ? "bg-amber-50 border-amber-200 text-amber-950"
                    : verdict.status === "goal"
                    ? "bg-orange-50 border-orange-200 text-orange-950"
                    : verdict.status === "wait"
                    ? "bg-blue-50 border-blue-200 text-blue-950"
                    : "bg-rose-50 border-rose-200 text-rose-950"
                }`}
              >
                <div className="font-extrabold text-sm flex items-center gap-2">
                  <span>{verdict.title}</span>
                </div>
                <p className="text-xs leading-relaxed opacity-90">{verdict.desc}</p>
              </div>
            )}
          </div>
        )}

        {/* High-Intent Conversion Bar Directly Underneath Calculator */}
        <div className="p-6 rounded-3xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-0.5">
            <div className="text-sm font-black text-[#1B2B4B]">
              {t("landing.calcCtaPrompt")}
            </div>
            <div className="text-xs text-slate-600 font-medium">
              {t("landing.calcCtaSubtitle")}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onAuthClick("signUp")}
            className="bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-black px-6 py-3.5 rounded-xl shadow-xs hover:shadow-md transition-all active:scale-98 cursor-pointer shrink-0"
          >
            {t("landing.calcCtaBtn")}
          </button>
        </div>
      </div>

      {/* Interactive Simulation Transfer Modal */}
      <ModalDialog
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title={t("landing.simTransferModalTitle")}
        isDirty={false}
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-slate-500">
            {t("landing.simTransferSubtitle")}
          </p>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              {t("landing.simTransferSource")}
            </label>
            <input
              type="text"
              readOnly
              value={transferFrom.toUpperCase()}
              className="w-full px-3 py-2 bg-slate-100 rounded-lg text-xs font-mono font-bold text-slate-700 border border-slate-200"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              {t("landing.simTransferAmount")}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-mono font-bold text-slate-400">
                {currencySymbol}
              </span>
              <input
                type="number"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2 bg-white rounded-lg text-xs font-mono font-bold text-slate-900 border border-slate-300"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              {t("landing.simTransferCancel")}
            </button>
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-white bg-[#2563eb] hover:bg-blue-700 rounded-lg cursor-pointer"
            >
              {t("landing.simTransferConfirm")}
            </button>
          </div>
        </div>
      </ModalDialog>
    </section>
  );
}
