"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../../lib/trpc";
import { useIconVisibility } from "@money-matters/ui";

interface PreferencesSectionProps {
  currentTimezone: string;
}

export function PreferencesSection({ currentTimezone }: PreferencesSectionProps) {
  const { showIcons, setShowIcons } = useIconVisibility();
  const utils = trpc.useUtils();
  const updateUserPrefMut = trpc.updateUserPreferences.useMutation({
    onSuccess: () => utils.getUserPreferences.invalidate(),
  });

  return (
    <section className="flex flex-col gap-2">
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--dash-muted)" }}>
        {t("settings.title")}
      </p>
      <div
        className="p-4 rounded-xl flex flex-col gap-4"
        style={{ backgroundColor: "var(--dash-surface)", border: "1px solid var(--dash-border)" }}
      >
        {/* Timezone Preference */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#1B2B4B]">Timezone</p>
            <p className="text-[11px] text-zinc-500">Australian Eastern Standard Time (AEST)</p>
          </div>
          <select
            value={currentTimezone}
            onChange={(e) => updateUserPrefMut.mutate({ timezone: e.target.value })}
            className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-zinc-200 bg-white"
          >
            <option value="Australia/Sydney">Sydney / Melbourne (AEST/AEDT)</option>
            <option value="Australia/Brisbane">Brisbane (AEST)</option>
            <option value="Australia/Adelaide">Adelaide (ACST/ACDT)</option>
            <option value="Australia/Perth">Perth (AWST)</option>
          </select>
        </div>

        {/* UI Icons Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
          <div>
            <p className="text-xs font-bold text-[#1B2B4B]">Show Category Icons</p>
            <p className="text-[11px] text-zinc-500">Toggle emoji and symbol badges across dashboards</p>
          </div>
          <input
            type="checkbox"
            checked={showIcons}
            onChange={(e) => {
              setShowIcons(e.target.checked);
              updateUserPrefMut.mutate({ appPreferences: { ui: { showIcons: e.target.checked } } });
            }}

            className="w-4 h-4 text-[#2563eb] rounded-md accent-[#2563eb] cursor-pointer"
          />
        </div>
      </div>
    </section>
  );
}
