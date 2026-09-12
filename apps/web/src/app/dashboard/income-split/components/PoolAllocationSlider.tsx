"use client";

import React, { useId } from "react";
import { t } from "@money-matters/i18n";

export interface PoolAllocationSliderProps {
  readonly value: number;
  readonly min?: number;
  readonly max: number;
  readonly step?: number;
  readonly proposedValue?: number;
  readonly targetValue?: number;
  readonly onChange: (value: number) => void;
  readonly disabled?: boolean;
  readonly onResetProposed?: () => void;
}

export function PoolAllocationSlider({
  value,
  min = 0,
  max,
  step = 5,
  proposedValue,
  targetValue,
  onChange,
  disabled = false,
  onResetProposed,
}: PoolAllocationSliderProps) {
  const sliderId = useId();
  const safeMax = Math.max(min + 1, max);
  const clampedVal = Math.min(Math.max(min, value), safeMax);
  const percent = safeMax > min ? ((clampedVal - min) / (safeMax - min)) * 100 : 0;

  const proposedPercent =
    proposedValue !== undefined && proposedValue >= min && proposedValue <= safeMax
      ? ((proposedValue - min) / (safeMax - min)) * 100
      : null;

  const targetPercent =
    targetValue !== undefined && targetValue >= min && targetValue <= safeMax
      ? ((targetValue - min) / (safeMax - min)) * 100
      : null;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseFloat(e.target.value);
    onChange(isNaN(raw) ? 0 : raw);
  };

  return (
    <div className="relative w-full flex flex-col gap-1 select-none">
      {/* Track & Input */}
      <div className="relative flex items-center h-6">
        {/* Milestone Marker for Proposed */}
        {proposedPercent !== null && (
          <button
            type="button"
            disabled={disabled}
            onClick={onResetProposed}
            style={{ left: `${proposedPercent}%` }}
            title={t("paydayDrawer.resetPoolTooltip", { defaultValue: "Reset to proposed amount" })}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-3.5 bg-blue-400/80 hover:bg-blue-600 rounded-xs z-10 cursor-pointer transition-colors"
          />
        )}

        {/* Milestone Marker for Target */}
        {targetPercent !== null && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(targetValue!)}
            style={{ left: `${targetPercent}%` }}
            title={t("paydayDrawer.snapTargetTooltip", { defaultValue: "Snap to target" })}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-3.5 bg-amber-400/90 hover:bg-amber-500 rounded-xs z-10 cursor-pointer transition-colors"
          />
        )}

        <input
          id={sliderId}
          type="range"
          min={min}
          max={safeMax}
          step={step}
          value={clampedVal}
          onChange={handleSliderChange}
          disabled={disabled}
          style={{
            background: `linear-gradient(to right, #2563eb ${percent}%, #e2e8f0 ${percent}%)`,
          }}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed accent-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40"
        />
      </div>

      {/* Ticks and subtle range limits */}
      <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono px-0.5">
        <span>$0</span>
        <div className="flex items-center gap-2">
          {proposedValue !== undefined && Math.abs(proposedValue - value) > 0.01 && onResetProposed && (
            <button
              type="button"
              onClick={onResetProposed}
              disabled={disabled}
              className="text-[#2563eb] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
            >
              <span>⟲</span>
              <span>Auto ${proposedValue.toFixed(2)}</span>
            </button>
          )}
          {targetValue !== undefined && targetValue > 0 && Math.abs(targetValue - value) > 0.01 && (
            <button
              type="button"
              onClick={() => onChange(targetValue)}
              disabled={disabled}
              className="text-amber-600 hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
            >
              <span>Target ${targetValue.toFixed(2)}</span>
            </button>
          )}
        </div>
        <span>${safeMax.toLocaleString("en-AU", { maximumFractionDigits: 0 })}</span>
      </div>
    </div>
  );
}
