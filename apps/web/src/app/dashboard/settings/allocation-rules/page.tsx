"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { t } from "@money-matters/i18n";
import {
  Button,
  useToast,
  ConfirmDialog,
  InfoTooltip,
  GenericSelectField,
} from "@money-matters/ui/web";
import { trpc } from "../../../../lib/trpc";
import { AllocationStepType } from "@money-matters/types";
import { useAppFeatures } from "../../../../hooks/useAppFeatures";

interface EditableStep {
  id?: string;
  orderIndex: number;
  stepType: AllocationStepType;
  targetEnvelopeId?: string | null;
  config?: Record<string, unknown> | null;
}

function AllocationRulesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPrivateMode } = useAppFeatures();
  const scope = (searchParams.get("scope") === "personal" && hasPrivateMode) ? "personal" : "household";
  const isPersonal = scope === "personal";

  const toast = useToast();
  const utils = trpc.useUtils();

  const govQuery = trpc.getHouseholdGovernanceInfo.useQuery();
  const isOwner = govQuery.data?.isOwner ?? true;
  const canEdit = isPersonal || isOwner;

  const strategyQuery = trpc.getActiveAllocationStrategy.useQuery({
    isPrivate: isPersonal,
  });
  const envelopesQuery = trpc.listPools.useQuery();
  const updateStepsMut = trpc.updateAllocationStrategySteps.useMutation();
  const applyPresetMut = trpc.applyAllocationPreset.useMutation();

  const [steps, setSteps] = useState<EditableStep[]>([]);
  const [initialSteps, setInitialSteps] = useState<EditableStep[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Eligible envelopes for surplus sweep target based on scope
  const eligibleEnvelopes = useMemo(() => {
    const list = envelopesQuery.data || [];
    return isPersonal ? list.filter((e) => e.isPrivate) : list.filter((e) => !e.isPrivate);
  }, [envelopesQuery.data, isPersonal]);

  useEffect(() => {
    if (strategyQuery.data?.steps) {
      const mapped: EditableStep[] = strategyQuery.data.steps.map((s, idx) => ({
        id: s.id,
        orderIndex: idx,
        stepType: s.stepType as AllocationStepType,
        targetEnvelopeId: s.targetEnvelopeId,
        config: s.config as Record<string, unknown> | null,
      }));
      setSteps(mapped);
      setInitialSteps(mapped);
      setIsDirty(false);
    }
  }, [strategyQuery.data]);

  const checkIfDirty = (newSteps: EditableStep[]) => {
    if (newSteps.length !== initialSteps.length) return true;
    for (let i = 0; i < newSteps.length; i++) {
      const a = newSteps[i];
      const b = initialSteps[i];
      if (a.stepType !== b.stepType) return true;
      if (a.targetEnvelopeId !== b.targetEnvelopeId) return true;
    }
    return false;
  };

  const handleMove = (index: number, direction: "UP" | "DOWN") => {
    const targetIndex = direction === "UP" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;

    const next = [...steps];
    const item = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = item;

    const reindexed = next.map((s, idx) => ({ ...s, orderIndex: idx }));
    setSteps(reindexed);
    setIsDirty(checkIfDirty(reindexed));
  };

  const handleUpdateSurplusTarget = (index: number, targetEnvelopeId: string | null) => {
    const next = [...steps];
    next[index] = { ...next[index], targetEnvelopeId };
    setSteps(next);
    setIsDirty(checkIfDirty(next));
  };

  const handleSave = async () => {
    if (!strategyQuery.data?.id) return;
    setSubmitting(true);
    try {
      await updateStepsMut.mutateAsync({
        strategyId: strategyQuery.data.id,
        steps: steps.map((s, idx) => ({
          orderIndex: idx,
          stepType: s.stepType,
          targetEnvelopeId: s.targetEnvelopeId || null,
          config: s.config || null,
        })),
      });
      await utils.getActiveAllocationStrategy.invalidate();
      toast.success(t("settings.paydayRules.saveSuccess"));
      setIsDirty(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save payday rules.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetToRecommended = async () => {
    try {
      await applyPresetMut.mutateAsync({
        presetKey: "BALANCED",
        isPrivate: isPersonal,
      });
      await utils.getActiveAllocationStrategy.invalidate();
      toast.success(t("settings.paydayRules.saveSuccess"));
      setShowResetConfirm(false);
      setIsDirty(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to reset rules.");
    }
  };

  const handleBack = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      router.push("/dashboard/settings?tab=household");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <button
            type="button"
            onClick={handleBack}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors mb-2 inline-flex items-center gap-1 cursor-pointer"
          >
            <span>←</span>
            <span>{t("settings.title")}</span>
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#1B2B4B] dark:text-white">
              {isPersonal
                ? t("settings.paydayRules.tabs.personal")
                : t("settings.paydayRules.pageTitle")}
            </h1>
            <InfoTooltip content={t("settings.paydayRules.pageSubtitle")} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <Button
              variant="secondary"
              onClick={() => setShowResetConfirm(true)}
              className="text-xs h-9 cursor-pointer"
            >
              {t("settings.paydayRules.resetToRecommended")}
            </Button>
          )}

          {canEdit && (
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!isDirty || submitting}
              loading={submitting}
              className="text-xs h-9 cursor-pointer"
            >
              {t("settings.paydayRules.saveChanges")}
            </Button>
          )}
        </div>
      </div>

      {!canEdit && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          {t("settings.paydayRules.onlyOwnerCanChange")}
        </div>
      )}

      {/* 7 Streamlined Rules Stack */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const isFirst = index === 0;
          const isLast = index === steps.length - 1;
          const stepName = t(`settings.paydayRules.stepTypes.${step.stepType}`);
          const stepDesc = t(`settings.paydayRules.stepDescriptions.${step.stepType}`);

          return (
            <div
              key={`${step.stepType}-${index}`}
              className="p-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
            >
              <div className="flex items-start gap-3.5 flex-1">
                <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 font-bold font-mono text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {index + 1}
                </span>

                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-[#1B2B4B] dark:text-white">
                      {stepName}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400">
                      Step {index + 1}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {stepDesc}
                  </p>

                  {/* Envelope selector specifically for SURPLUS_SWEEP */}
                  {step.stepType === "SURPLUS_SWEEP" && (
                    <div className="pt-2 w-64">
                      <GenericSelectField
                        label={t("settings.paydayRules.targetEnvelopeLabel")}
                        value={step.targetEnvelopeId || ""}
                        options={[
                          { value: "", label: t("categories.mainPool") },
                          ...eligibleEnvelopes.map((env) => ({
                            value: env.id,
                            label: env.name,
                          })),
                        ]}
                        disabled={!canEdit}
                        onChange={(val) => handleUpdateSurplusTarget(index, val || null)}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons for Reordering */}
              {canEdit && (
                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    disabled={isFirst}
                    onClick={() => handleMove(index, "UP")}
                    aria-label={t("settings.paydayRules.moveUp")}
                    className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-xs text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={isLast}
                    onClick={() => handleMove(index, "DOWN")}
                    aria-label={t("settings.paydayRules.moveDown")}
                    className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-xs text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    ↓
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <ConfirmDialog
          isOpen={showResetConfirm}
          title={t("settings.paydayRules.resetConfirmTitle")}
          description={t("settings.paydayRules.resetConfirmMessage")}
          confirmLabel={t("common.confirm")}
          cancelLabel={t("common.cancel")}
          variant="primary"
          onConfirm={handleResetToRecommended}
          onClose={() => setShowResetConfirm(false)}
        />
      )}

      {/* Discard Confirmation Dialog */}
      {showDiscardConfirm && (
        <ConfirmDialog
          isOpen={showDiscardConfirm}
          title={t("modals.discardChanges.title")}
          description={t("modals.discardChanges.description")}
          confirmLabel={t("modals.discardChanges.discard")}
          cancelLabel={t("modals.discardChanges.cancel")}
          variant="danger"
          onConfirm={() => {
            setShowDiscardConfirm(false);
            router.push("/dashboard/settings?tab=household");
          }}
          onClose={() => setShowDiscardConfirm(false)}
        />
      )}
    </div>
  );
}

export default function AllocationRulesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">{t("common.loading")}</div>}>
      <AllocationRulesContent />
    </Suspense>
  );
}
