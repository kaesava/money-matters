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
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);

  const updateUserPrefMut = trpc.updateUserPreferences.useMutation({
    onSuccess: () => {
      utils.getUserPreferences.invalidate();
      setSaveMessage("Preferences saved ✓");
      setTimeout(() => setSaveMessage(null), 3000);
    },
  });

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--dash-muted)" }}>
          {t("settings.title")}
        </p>
        {saveMessage && (
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md animate-in fade-in duration-200">
            {saveMessage}
          </span>
        )}
      </div>
      <div
        className="p-4 rounded-xl flex flex-col gap-4"
        style={{ backgroundColor: "var(--dash-surface)", border: "1px solid var(--dash-border)" }}
      >
        {/* Timezone Preference */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#1B2B4B]">Timezone</p>
            <p className="text-[11px] text-zinc-500">Active regional timezone for schedules and dates</p>
          </div>
          <select
            value={currentTimezone}
            onChange={(e) => updateUserPrefMut.mutate({ timezone: e.target.value })}
            className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-zinc-200 bg-white text-zinc-800"
          >
            <option value="Australia/Sydney">Sydney / Melbourne (AEST/AEDT)</option>
            <option value="Australia/Brisbane">Brisbane (AEST)</option>
            <option value="Australia/Adelaide">Adelaide (ACST/ACDT)</option>
            <option value="Australia/Perth">Perth (AWST)</option>
            <option value="Europe/London">London (GMT/BST)</option>
            <option value="America/New_York">New York (EST/EDT)</option>
            <option value="Asia/Tokyo">Tokyo (JST)</option>
            <option value="UTC">UTC (Universal Coordinated Time)</option>
          </select>
        </div>

        {/* UI Visual Icons Toggle Switch */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
          <div>
            <p className="text-xs font-bold text-[#1B2B4B]">Show Visual Icons</p>
            <p className="text-[11px] text-zinc-500">Control visual icon badges across web and mobile views</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showIcons}
            onClick={() => {
              const nextVal = !showIcons;
              setShowIcons(nextVal);
              updateUserPrefMut.mutate({ appPreferences: { ui: { showIcons: nextVal } } });
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              showIcons ? "bg-[#00B4A6]" : "bg-zinc-300"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                showIcons ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>
    </section>
  );
}
