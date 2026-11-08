"use client";

import React from "react";
import Link from "next/link";
import { t } from "@money-matters/i18n";
import { useToast, ConfirmDialog } from "@money-matters/ui/web";
import { trpc } from "../../../../lib/trpc";

export function AllocationStrategySection() {
  const toast = useToast();
  const utils = trpc.useUtils();

  const strategyQuery = trpc.getActiveAllocationStrategy.useQuery();
  const applyPresetMut = trpc.applyAllocationPreset.useMutation();

  const [confirmPreset, setConfirmPreset] = React.useState<"BALANCED" | "BILLS_FORTRESS" | "PAY_YOURSELF_FIRST" | null>(null);

  const activePreset = strategyQuery.data?.presetKey || "BALANCED";

  const handleApplyPreset = async (presetKey: "BALANCED" | "BILLS_FORTRESS" | "PAY_YOURSELF_FIRST") => {
    try {
      await applyPresetMut.mutateAsync({ presetKey });
      await utils.getActiveAllocationStrategy.invalidate();
      toast.success(t("settings.paydayRules.saveSuccess"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to apply preset.");
    } finally {
      setConfirmPreset(null);
    }
  };

  const presetsList: Array<{
    key: "BALANCED" | "BILLS_FORTRESS" | "PAY_YOURSELF_FIRST";
    nameKey: string;
    descKey: string;
  }> = [
    {
      key: "BALANCED",
      nameKey: "settings.paydayRules.presets.balanced.name",
      descKey: "settings.paydayRules.presets.balanced.description",
    },
    {
      key: "BILLS_FORTRESS",
      nameKey: "settings.paydayRules.presets.billsFortress.name",
      descKey: "settings.paydayRules.presets.billsFortress.description",
    },
    {
      key: "PAY_YOURSELF_FIRST",
      nameKey: "settings.paydayRules.presets.payYourselfFirst.name",
      descKey: "settings.paydayRules.presets.payYourselfFirst.description",
    },
  ];

  return (
    <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="font-bold text-[#1B2B4B] dark:text-white text-base">
              {t("settings.paydayRules.title")}
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
              {activePreset === "CUSTOM"
                ? t("settings.paydayRules.presets.custom.name")
                : t(`settings.paydayRules.presets.${activePreset === "BILLS_FORTRESS" ? "billsFortress" : activePreset === "PAY_YOURSELF_FIRST" ? "payYourselfFirst" : "balanced"}.name`)}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t("settings.paydayRules.description")}
          </p>
        </div>

        <Link
          href="/dashboard/settings/allocation-rules"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#2563eb] bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 dark:text-blue-400 transition-colors shrink-0"
        >
          <span>⚙️</span>
          <span>{t("settings.paydayRules.customizeButton")}</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
        {presetsList.map((p) => {
          const isSelected = activePreset === p.key;
          return (
            <button
              key={p.key}
              type="button"
              disabled={applyPresetMut.isPending}
              onClick={() => {
                if (!isSelected) {
                  setConfirmPreset(p.key);
                }
              }}
              className={`text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                isSelected
                  ? "border-[#2563eb] bg-blue-50/50 dark:bg-blue-950/20 shadow-xs ring-1 ring-[#2563eb]"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white/40 dark:bg-zinc-800/40"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-xs text-[#1B2B4B] dark:text-white">
                    {t(p.nameKey)}
                  </h4>
                  {isSelected && (
                    <span className="text-[11px] font-bold text-[#2563eb] dark:text-blue-400">
                      ✓ Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {t(p.descKey)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {confirmPreset && (
        <ConfirmDialog
          isOpen={!!confirmPreset}
          title={t("settings.paydayRules.resetConfirmTitle")}
          description={t("settings.paydayRules.resetConfirmMessage")}
          confirmLabel={t("common.confirm")}
          cancelLabel={t("common.cancel")}
          variant="primary"
          onConfirm={() => handleApplyPreset(confirmPreset)}
          onClose={() => setConfirmPreset(null)}
        />
      )}
    </div>
  );
}
