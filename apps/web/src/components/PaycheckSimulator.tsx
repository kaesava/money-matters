"use client";

import React, { useState, useEffect, useCallback } from "react";
import { t } from "@money-matters/i18n";
import { computeSimulationState } from "./simulator/simulationData";
import { SimulatorTimelineBar } from "./simulator/SimulatorTimelineBar";
import { SimulatorEventCallout } from "./simulator/SimulatorEventCallout";
import { SimulatorPoolCard } from "./simulator/SimulatorPoolCard";
import { PaydayCheckpointBanner } from "./simulator/PaydayCheckpointBanner";
import { PoolTransferModal } from "./simulator/PoolTransferModal";
import { PoolTransfer } from "./simulator/types";

export const PaycheckSimulator: React.FC = () => {
  const [day, setDay] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [incomeAmount, setIncomeAmount] = useState<number>(2500);
  const [transfers, setTransfers] = useState<PoolTransfer[]>([]);
  const [transferModalOpen, setTransferModalOpen] = useState<boolean>(false);
  const [transferFromPool, setTransferFromPool] = useState<
    "everyday" | "bills" | "goals" | "surplus"
  >("everyday");

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setDay((prev) => {
        const next = prev >= 28 ? 0 : prev + 1;
        if (next === 14) {
          setIsPlaying(false);
        }
        return next;
      });
    }, 1400);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleDayChange = useCallback((newDay: number) => {
    setDay(newDay);
    setIsPlaying(false);
  }, []);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleReset = useCallback(() => {
    setDay(0);
    setIsPlaying(false);
    setTransfers([]);
    setIncomeAmount(2500);
  }, []);

  const handleOpenTransfer = useCallback((poolId: "everyday" | "bills" | "goals" | "surplus") => {
    setTransferFromPool(poolId);
    setTransferModalOpen(true);
  }, []);

  const handleAddTransfer = useCallback(
    (item: {
      fromPoolId: "everyday" | "bills" | "goals" | "surplus";
      toPoolId: "everyday" | "bills" | "goals" | "surplus";
      amount: number;
    }) => {
      setTransfers((prev) => [
        ...prev,
        {
          id: `t-${Date.now()}`,
          ...item,
          day,
        },
      ]);
    },
    [day]
  );

  const state = computeSimulationState(day, incomeAmount, transfers);
  const isPaydayCheckpoint = (day === 0 || day === 14) && !isPlaying;

  return (
    <section id="simulator" className="bg-white border-y border-[#e2e4e0] py-20">
      <div className="max-w-6xl mx-auto px-6 flex flex-col gap-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb] tracking-wider uppercase">
            {t("landing.simTimelineBadge")}
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#1B2B4B]">
            {t("landing.simTimelineTitle")}
          </h2>
          <p className="text-zinc-600 leading-relaxed text-sm sm:text-base font-medium">
            {t("landing.simTimelineSubtitle")}
          </p>
        </div>

        {/* Full-Width Timeline Track */}
        <SimulatorTimelineBar
          day={day}
          isPlaying={isPlaying}
          onDayChange={handleDayChange}
          onTogglePlay={handleTogglePlay}
          onReset={handleReset}
        />

        {/* Interactive Payday Checkpoint Banner */}
        {isPaydayCheckpoint && (
          <PaydayCheckpointBanner
            incomeAmount={incomeAmount}
            onIncomeChange={setIncomeAmount}
            onResume={() => setIsPlaying(true)}
            day={day}
          />
        )}

        {/* Live Financial Narrative Bar */}
        <SimulatorEventCallout milestone={state.activeMilestone} commentary={state.commentary} />

        {/* 4-Column Responsive Pool Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <SimulatorPoolCard pool={state.bills} onOpenTransfer={handleOpenTransfer} />
          <SimulatorPoolCard pool={state.everyday} onOpenTransfer={handleOpenTransfer} />
          <SimulatorPoolCard pool={state.goals} onOpenTransfer={handleOpenTransfer} />

          {/* STEP 4: SURPLUS SWEEP */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold font-mono text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
                  STEP 4
                </span>
                <span className="font-extrabold text-[#1B2B4B] text-sm">
                  {t("landing.waterfallStep4")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleOpenTransfer("surplus")}
                className="text-[10px] font-bold text-slate-500 hover:text-[#2563eb] bg-slate-100 hover:bg-blue-50 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                title={t("landing.simTransferAction")}
              >
                ⇄ {t("landing.simTransferAction")}
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-slate-500 font-semibold">Offset Buffer</span>
                <span className="text-[#22c55e] font-mono font-extrabold text-base tabular-nums">
                  +${state.surplusOffset} AUD
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/60">
                <div
                  className="bg-[#22c55e] h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${Math.min(100, (state.surplusOffset / 1200) * 100)}%` }}
                />
              </div>
            </div>

            <div className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100">
              {t("landing.surplusOffset")}: <span className="font-mono font-bold">${state.surplusOffset}</span>
            </div>
          </div>
        </div>

        {/* Quick Pool Transfer Modal */}
        <PoolTransferModal
          isOpen={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          onTransfer={handleAddTransfer}
          initialFromPool={transferFromPool}
        />
      </div>
    </section>
  );
};
