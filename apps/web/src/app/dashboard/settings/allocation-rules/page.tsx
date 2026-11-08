"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import {
  Button,
  useToast,
  ConfirmDialog,
  InfoTooltip,
  GenericSelectField,
  AmountField,
  Input,
} from "@money-matters/ui/web";
import { trpc } from "../../../../lib/trpc";
import { AllocationStepType } from "@money-matters/types";

interface EditableStep {
  id?: string;
  orderIndex: number;
  stepType: AllocationStepType;
  targetEnvelopeId?: string | null;
  config?: Record<string, unknown> | null;
}

export default function AllocationRulesPage() {
  const router = useRouter();
  const toast = useToast();
  const utils = trpc.useUtils();

  const strategyQuery = trpc.getActiveAllocationStrategy.useQuery();
  const envelopesQuery = trpc.listPools.useQuery();
  const updateStepsMut = trpc.updateAllocationStrategySteps.useMutation();
  const applyPresetMut = trpc.applyAllocationPreset.useMutation();

  const [steps, setSteps] = useState<EditableStep[]>([]);
  const [initialSteps, setInitialSteps] = useState<EditableStep[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filter envelopes to only shared envelopes (shared strategy cannot leak or target private envelopes)
  const sharedEnvelopes = (envelopesQuery.data || []).filter((e) => !e.isPrivate);

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
      if (JSON.stringify(a.config) !== JSON.stringify(b.config)) return true;
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

  const handleUpdateStepConfig = (index: number, updates: Partial<EditableStep>) => {
    const next = [...steps];
    next[index] = { ...next[index], ...updates };
    setSteps(next);
    setIsDirty(checkIfDirty(next));
  };

  const handleRemoveStep = (index: number) => {
    const next = steps.filter((_, idx) => idx !== index).map((s, idx) => ({ ...s, orderIndex: idx }));
    setSteps(next);
    setIsDirty(checkIfDirty(next));
  };

  const handleAddRule = (stepType: AllocationStepType) => {
    const newStep: EditableStep = {
      orderIndex: steps.length,
      stepType,
      targetEnvelopeId: sharedEnvelopes[0]?.id || null,
      config: stepType === "FIXED_AMOUNT" ? { amount: 100 } : stepType === "PERCENTAGE_SPLIT" ? { percentage: 20 } : null,
    };
    const next = [...steps, newStep];
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
      await applyPresetMut.mutateAsync({ presetKey: "BALANCED" });
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
              {t("settings.paydayRules.pageTitle")}
            </h1>
            <InfoTooltip content={t("settings.paydayRules.pageSubtitle")} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => setShowResetConfirm(true)}
            className="text-xs h-9 cursor-pointer"
          >
            {t("settings.paydayRules.resetToRecommended")}
          </Button>

          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!isDirty || submitting}
            loading={submitting}
            className="text-xs h-9 cursor-pointer"
          >
            {t("settings.paydayRules.saveChanges")}
          </Button>
        </div>
      </div>

      {/* Rules Stack */}
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

                  {/* Config controls for configurable step types */}
                  {(step.stepType === "FIXED_AMOUNT" || step.stepType === "PERCENTAGE_SPLIT" || step.stepType === "SURPLUS_SWEEP") && (
                    <div className="pt-2 flex items-center gap-3 flex-wrap">
                      <div className="w-52">
                        <GenericSelectField
                          label={t("settings.paydayRules.targetEnvelopeLabel")}
                          value={step.targetEnvelopeId || ""}
                          options={sharedEnvelopes.map((env) => ({
                            value: env.id,
                            label: env.name,
                          }))}
                          onChange={(val) => handleUpdateStepConfig(index, { targetEnvelopeId: val })}
                        />
                      </div>

                      {step.stepType === "FIXED_AMOUNT" && (
                        <div className="w-36">
                          <AmountField
                            label={t("settings.paydayRules.amountLabel")}
                            value={String(step.config?.amount ?? "100")}
                            onChange={(val) =>
                              handleUpdateStepConfig(index, {
                                config: { ...step.config, amount: parseFloat(val) || 0 },
                              })
                            }
                          />
                        </div>
                      )}

                      {step.stepType === "PERCENTAGE_SPLIT" && (
                        <div className="w-28">
                          <Input
                            label={t("settings.paydayRules.percentageLabel")}
                            type="number"
                            value={String(step.config?.percentage ?? "20")}
                            onChange={(e) =>
                              handleUpdateStepConfig(index, {
                                config: { ...step.config, percentage: parseFloat(e.target.value) || 0 },
                              })
                            }
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
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
                {(step.stepType === "FIXED_AMOUNT" || step.stepType === "PERCENTAGE_SPLIT") && (
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(index)}
                    aria-label={t("settings.paydayRules.removeRule")}
                    className="w-8 h-8 rounded-lg border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 flex items-center justify-center text-xs transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Custom Rule Dropdown/Buttons */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => handleAddRule("FIXED_AMOUNT")}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-dashed border-slate-300 dark:border-slate-700 hover:border-[#2563eb] text-slate-700 dark:text-slate-300 hover:text-[#2563eb] transition-colors cursor-pointer"
        >
          + {t("settings.paydayRules.stepTypes.FIXED_AMOUNT")}
        </button>
        <button
          type="button"
          onClick={() => handleAddRule("PERCENTAGE_SPLIT")}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-dashed border-slate-300 dark:border-slate-700 hover:border-[#2563eb] text-slate-700 dark:text-slate-300 hover:text-[#2563eb] transition-colors cursor-pointer"
        >
          + {t("settings.paydayRules.stepTypes.PERCENTAGE_SPLIT")}
        </button>
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
