"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { TimelineMilestone } from "./types";

interface SimulatorEventCalloutProps {
  milestone: TimelineMilestone;
  commentary?: string;
}

export const SimulatorEventCallout: React.FC<SimulatorEventCalloutProps> = ({
  milestone,
  commentary,
}) => {
  return (
    <div className="p-4 md:p-5 bg-gradient-to-r from-blue-50/80 via-indigo-50/30 to-emerald-50/40 rounded-2xl border border-blue-200/80 flex items-start gap-3.5 shadow-2xs">
      <span className="text-2xl p-2 bg-white rounded-xl shadow-2xs border border-blue-100 flex-shrink-0">
        {milestone.icon}
      </span>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold font-mono text-[#2563eb] bg-white border border-blue-200 px-2 py-0.5 rounded-md">
            {t(milestone.labelKey as Parameters<typeof t>[0])}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900/70">
            {t("landing.simMilestoneBadge")}
          </span>
        </div>
        <p className="text-xs sm:text-sm font-medium text-slate-700 leading-relaxed">
          {commentary || t(milestone.eventDescKey as Parameters<typeof t>[0])}
        </p>
      </div>
    </div>
  );
};
