"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { t } from "@money-matters/i18n";
import { useToast, ConfirmDialog, InfoTooltip } from "@money-matters/ui/web";
import { trpc } from "../../../../lib/trpc";
import { useAppFeatures } from "../../../../hooks/useAppFeatures";

export function AllocationStrategySection() {
  const toast = useToast();
  const utils = trpc.useUtils();
  const { hasPrivateMode, hasCustomAllocationRules } = useAppFeatures();

  const [activeTab, setActiveTab] = useState<"household" | "personal">("household");

  const govQuery = trpc.getHouseholdGovernanceInfo.useQuery();
  const envelopesQuery = trpc.listPools.useQuery();
  const isOwner = govQuery.data?.isOwner ?? true;

  const hasPrivateEnvelopes = useMemo(
    () => hasPrivateMode && (envelopesQuery.data || []).some((e) => e.isPrivate),
    [envelopesQuery.data, hasPrivateMode]
  );

  const isPersonalScope = activeTab === "personal";

  const strategyQuery = trpc.getActiveAllocationStrategy.useQuery({
    isPrivate: isPersonalScope,
  });
  const applyPresetMut = trpc.applyAllocationPreset.useMutation();

  const [confirmPreset, setConfirmPreset] = useState<
    "BALANCED" | "BILLS_FORTRESS" | "PAY_YOURSELF_FIRST" | null
  >(null);

  const activePreset = strategyQuery.data?.presetKey || "BALANCED";

  const handleApplyPreset = async (
    presetKey: "BALANCED" | "BILLS_FORTRESS" | "PAY_YOURSELF_FIRST"
  ) => {
    try {
      await applyPresetMut.mutateAsync({
        presetKey,
        isPrivate: isPersonalScope,
      });
      await Promise.all([
        utils.getActiveAllocationStrategy.invalidate(),
        utils.previewPayday.invalidate(),
        utils.getMatrixProjectionData.invalidate(),
        utils.listAllAllocationPlans.invalidate(),
        utils.getHomeSummary.invalidate(),
      ]);
      toast.success(t("settings.paydayRules.saveSuccess"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("common.errorTryAgain"));
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

  const canEdit = isPersonalScope || isOwner;

  const confirmPresetName = confirmPreset
    ? t(
        confirmPreset === "BILLS_FORTRESS"
          ? "settings.paydayRules.presets.billsFortress.name"
          : confirmPreset === "PAY_YOURSELF_FIRST"
          ? "settings.paydayRules.presets.payYourselfFirst.name"
          : "settings.paydayRules.presets.balanced.name"
      )
    : "";

  return (
    <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 space-y-5">
      {/* Scope Sub-Tabs when user has Private Envelopes */}
      {hasPrivateEnvelopes && (
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("household")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === "household"
                ? "bg-[#1B2B4B] text-white"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
            }`}
          >
            {t("settings.paydayRules.tabs.household")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("personal")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === "personal"
                ? "bg-[#1B2B4B] text-white"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
            }`}
          >
            {t("settings.paydayRules.tabs.personal")}
          </button>
        </div>
      )}

      {/* Header (Pill tag removed) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="font-bold text-[#1B2B4B] dark:text-white text-base">
              {isPersonalScope
                ? t("settings.paydayRules.tabs.personal")
                : t("settings.paydayRules.title")}
            </h3>
            {!canEdit && (
              <InfoTooltip content={t("settings.paydayRules.onlyOwnerCanChange")} />
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t("settings.paydayRules.description")}
          </p>
        </div>

        {hasCustomAllocationRules && (
          canEdit ? (
            <Link
              href={`/dashboard/settings/allocation-rules?scope=${activeTab}`}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#2563eb] bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 dark:text-blue-400 transition-colors shrink-0 cursor-pointer"
            >
              <span>⚙️</span>
              <span>{t("settings.paydayRules.customizeButton")}</span>
            </Link>
          ) : (
            <span
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-400 bg-slate-100 dark:bg-zinc-800 dark:text-slate-500 cursor-not-allowed shrink-0"
              title={t("settings.paydayRules.onlyOwnerCanChange")}
            >
              <span>⚙️</span>
              <span>{t("settings.paydayRules.customizeButton")}</span>
            </span>
          )
        )}
      </div>

      {/* Presets Grid: Balanced, Bills Fortress, Pay Yourself First (and Custom if enabled) */}
      <div className={`grid grid-cols-1 ${hasCustomAllocationRules ? "md:grid-cols-4" : "md:grid-cols-3"} gap-3 pt-2`}>
        {presetsList.map((p) => {
          const isSelected = activePreset === p.key;
          return (
            <button
              key={p.key}
              type="button"
              disabled={!canEdit || applyPresetMut.isPending}
              onClick={() => {
                if (canEdit && !isSelected) {
                  setConfirmPreset(p.key);
                }
              }}
              className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                !canEdit ? "opacity-75 cursor-not-allowed" : "cursor-pointer"
              } ${
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
                      ✓ {t("settings.paydayRules.activeBadge")}
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

        {/* 4th Preset Card: Custom Rules (rendered only if customAllocationRules is enabled) */}
        {hasCustomAllocationRules && (
          <div
            className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
              activePreset === "CUSTOM"
                ? "border-[#2563eb] bg-blue-50/50 dark:bg-blue-950/20 shadow-xs ring-1 ring-[#2563eb]"
                : "border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-zinc-800/40"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-xs text-[#1B2B4B] dark:text-white">
                  {t("settings.paydayRules.presets.custom.name")}
                </h4>
                {activePreset === "CUSTOM" ? (
                  <span className="text-[11px] font-bold text-[#2563eb] dark:text-blue-400">
                    ✓ {t("settings.paydayRules.activeBadge")}
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-slate-400">
                    {t("settings.paydayRules.customiseToActivate")}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {t("settings.paydayRules.presets.custom.description")}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Confirmation Dialog on Preset Switch */}
      {confirmPreset && (
        <ConfirmDialog
          isOpen={!!confirmPreset}
          title={t("settings.paydayRules.switchPresetConfirmTitle", {
            presetName: confirmPresetName,
          })}
          description={t("settings.paydayRules.switchPresetConfirmMessage", {
            presetName: confirmPresetName,
          })}
          confirmLabel={t("settings.paydayRules.switchPresetAction", {
            presetName: confirmPresetName,
          })}
          cancelLabel={t("common.cancel")}
          variant="primary"
          onConfirm={() => handleApplyPreset(confirmPreset)}
          onClose={() => setConfirmPreset(null)}
        />
      )}
    </div>
  );
}
