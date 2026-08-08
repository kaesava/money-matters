'use client';

import React from 'react';

export interface DonutRingProps {
  readonly timeElapsedPct: number;
  readonly consumedPct: number;
  readonly centerLabel: string;
  readonly subLabel?: string;
  readonly size?: number;
  readonly strokeWidth?: number;
}

export const DonutRing: React.FC<DonutRingProps> = ({
  timeElapsedPct,
  consumedPct,
  centerLabel,
  subLabel = 'Everyday Balance',
  size = 140,
  strokeWidth = 10,
}) => {
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;

  const timeStrokeOffset = circumference - (Math.min(100, Math.max(0, timeElapsedPct)) / 100) * circumference;
  const consumedStrokeOffset = circumference - (Math.min(100, Math.max(0, consumedPct)) / 100) * circumference;

  // Determine consumed stroke color based on comparison with time elapsed
  let consumedColor = '#22c55e'; // Green
  if (consumedPct > timeElapsedPct + 15) {
    consumedColor = '#ba1a1a'; // Red
  } else if (consumedPct > timeElapsedPct + 5) {
    consumedColor = '#f59e0b'; // Amber
  }

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="#f1f5f9"
          strokeWidth={strokeWidth}
        />

        {/* Time Elapsed Arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="#2563eb"
          strokeWidth={strokeWidth / 2}
          strokeDasharray={circumference}
          strokeDashoffset={timeStrokeOffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-out opacity-40"
        />

        {/* Consumed Arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke={consumedColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={consumedStrokeOffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-out"
        />
      </svg>

      {/* Center Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider line-clamp-1">{subLabel}</span>
        <span className="text-xl font-black text-gray-900 font-mono tracking-tight">{centerLabel}</span>
        <span className="text-[10px] font-bold text-gray-400 mt-0.5">{consumedPct}% spent</span>
      </div>
    </div>
  );
};

export default DonutRing;
