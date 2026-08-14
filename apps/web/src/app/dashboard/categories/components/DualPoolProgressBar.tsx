"use client";

import React from "react";

interface DualPoolProgressBarProps {
  elapsedPct: number;
  consumedPct: number;
}

export function DualPoolProgressBar({ elapsedPct, consumedPct }: DualPoolProgressBarProps) {
  let consumedColor = "bg-emerald-500";
  if (consumedPct > elapsedPct + 15) consumedColor = "bg-rose-500";
  else if (consumedPct > elapsedPct + 5) consumedColor = "bg-amber-500";

  return (
    <div className="w-full mt-3 space-y-1">
      <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500">
        <span>Pacing Progress</span>
        <span>Spent: {consumedPct}% | Month: {elapsedPct}%</span>
      </div>
      <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden flex flex-col gap-0.5">
        <div
          className="h-0.5 bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${elapsedPct}%` }}
          title={`Month elapsed: ${elapsedPct}%`}
        />
        <div
          className={`h-1 ${consumedColor} rounded-full transition-all duration-300`}
          style={{ width: `${consumedPct}%` }}
          title={`Pool spent: ${consumedPct}%`}
        />
      </div>
    </div>
  );
}
