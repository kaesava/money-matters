import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import {
  DESIGN_TOKENS,
  MobileButton,
  MobileInput,
  AmountInput,
  FormLabel,
  showMobileConfirm,
  useMobileToast,
} from '@money-matters/ui/mobile';
import { trpc } from '../../../lib/trpc';
import { AppScreenWrapper } from '../../../components/AppScreenWrapper';
import { AllocationStepType } from '@money-matters/types';

interface EditableStep {
  id?: string;
  orderIndex: number;
  stepType: AllocationStepType;
  targetEnvelopeId?: string | null;
  config?: Record<string, unknown> | null;
}

export default function MobileAllocationRulesScreen() {
  const router = useRouter();
  const toast = useMobileToast();
  const utils = trpc.useUtils();

  const strategyQuery = trpc.getActiveAllocationStrategy.useQuery();
  const envelopesQuery = trpc.listPools.useQuery();
  const updateStepsMut = trpc.updateAllocationStrategySteps.useMutation();
  const applyPresetMut = trpc.applyAllocationPreset.useMutation();

  const [steps, setSteps] = useState<EditableStep[]>([]);
  const [initialSteps, setInitialSteps] = useState<EditableStep[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

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

  const handleMove = (index: number, direction: 'UP' | 'DOWN') => {
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
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

  const handleAddStep = (stepType: AllocationStepType) => {
    const newStep: EditableStep = {
      orderIndex: steps.length,
      stepType,
      targetEnvelopeId: sharedEnvelopes[0]?.id || null,
      config:
        stepType === 'FIXED_AMOUNT'
          ? { amount: '100.00' }
          : stepType === 'PERCENTAGE_SPLIT'
          ? { percentage: 20 }
          : null,
    };
    const next = [...steps, newStep];
    setSteps(next);
    setIsDirty(checkIfDirty(next));
    setShowAddModal(false);
  };

  const handleResetToRecommended = () => {
    showMobileConfirm({
      title: t('settings.paydayRules.resetConfirmTitle'),
      message: t('settings.paydayRules.resetConfirmMessage'),
      confirmText: t('settings.paydayRules.resetToRecommended'),
      cancelText: t('common.cancel'),
      onConfirm: async () => {
        try {
          await applyPresetMut.mutateAsync({ presetKey: 'BALANCED' });
          await utils.getActiveAllocationStrategy.invalidate();
          toast.success(t('settings.paydayRules.saveSuccess'));
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t('common.errorTryAgain'));
        }
      },
    });
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
      setIsDirty(false);
      toast.success(t('settings.paydayRules.saveSuccess'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.errorTryAgain'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackPress = () => {
    if (isDirty) {
      showMobileConfirm({
        title: t('modals.discardChanges.title'),
        message: t('modals.discardChanges.description'),
        confirmText: t('modals.discardChanges.discard'),
        cancelText: t('modals.discardChanges.cancel'),
        isDestructive: true,
        onConfirm: () => {
          router.back();
        },
      });
    } else {
      router.back();
    }
  };

  const availableStepTypes: AllocationStepType[] = [
    'FIXED_AMOUNT',
    'PERCENTAGE_SPLIT',
    'COMMITTED_GOALS',
    'STANDARD_GOALS',
  ];

  if (strategyQuery.isLoading) {
    return (
      <AppScreenWrapper
        title={t('settings.paydayRules.title')}
        showBack={true}
        onBackPress={handleBackPress}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={DESIGN_TOKENS.colors.sereneBlue} />
        </View>
      </AppScreenWrapper>
    );
  }

  return (
    <AppScreenWrapper
      title={t('settings.paydayRules.title')}
      showBack={true}
      onBackPress={handleBackPress}
      scrollable={true}
    >
      <View style={styles.container}>
        {/* Banner with Reset link */}
        <View style={styles.bannerCard}>
          <Text style={styles.bannerSubtitle}>
            {t('settings.paydayRules.pageSubtitle')}
          </Text>
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={handleResetToRecommended}
            activeOpacity={0.7}
          >
            <Feather name="rotate-ccw" size={13} color={DESIGN_TOKENS.colors.sereneBlue} />
            <Text style={styles.resetBtnText}>
              {t('settings.paydayRules.resetToRecommended')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Steps List */}
        <View style={styles.stepsContainer}>
          {steps.map((step, index) => {
            const isFirst = index === 0;
            const isLast = index === steps.length - 1;
            const isCustom = step.stepType === 'FIXED_AMOUNT' || step.stepType === 'PERCENTAGE_SPLIT';

            return (
              <View key={`${step.stepType}-${index}`} style={styles.stepCard}>
                <View style={styles.stepHeader}>
                  <View style={styles.stepTitleRow}>
                    <View style={styles.orderBadge}>
                      <Text style={styles.orderBadgeText}>{index + 1}</Text>
                    </View>
                    <View style={styles.stepTitleTextContainer}>
                      <Text style={styles.stepTypeName}>
                        {t(`settings.paydayRules.stepTypes.${step.stepType}` as Parameters<typeof t>[0])}
                      </Text>
                      <Text style={styles.stepTypeDesc}>
                        {t(`settings.paydayRules.stepDescriptions.${step.stepType}` as Parameters<typeof t>[0])}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stepActionButtons}>
                    <TouchableOpacity
                      disabled={isFirst}
                      onPress={() => handleMove(index, 'UP')}
                      style={[styles.moveBtn, isFirst && styles.moveBtnDisabled]}
                    >
                      <Feather
                        name="chevron-up"
                        size={16}
                        color={isFirst ? DESIGN_TOKENS.colors.slate[300] : DESIGN_TOKENS.colors.slate[700]}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={isLast}
                      onPress={() => handleMove(index, 'DOWN')}
                      style={[styles.moveBtn, isLast && styles.moveBtnDisabled]}
                    >
                      <Feather
                        name="chevron-down"
                        size={16}
                        color={isLast ? DESIGN_TOKENS.colors.slate[300] : DESIGN_TOKENS.colors.slate[700]}
                      />
                    </TouchableOpacity>
                    {isCustom && (
                      <TouchableOpacity
                        onPress={() => handleRemoveStep(index)}
                        style={styles.deleteBtn}
                      >
                        <Feather name="trash-2" size={14} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Optional Configuration inputs for Fixed and Percentage steps */}
                {isCustom && (
                  <View style={styles.configContainer}>
                    <View style={styles.configField}>
                      <FormLabel>{t('settings.paydayRules.targetEnvelopeLabel')}</FormLabel>
                      <View style={styles.envelopePillsRow}>
                        {sharedEnvelopes.map((env) => {
                          const isEnvSelected = (step.targetEnvelopeId || sharedEnvelopes[0]?.id) === env.id;
                          return (
                            <TouchableOpacity
                              key={env.id}
                              style={[styles.envelopePill, isEnvSelected && styles.envelopePillSelected]}
                              onPress={() => handleUpdateStepConfig(index, { targetEnvelopeId: env.id })}
                            >
                              <Text
                                style={[
                                  styles.envelopePillText,
                                  isEnvSelected && styles.envelopePillTextSelected,
                                ]}
                              >
                                {env.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    {step.stepType === 'FIXED_AMOUNT' && (
                      <View style={styles.configField}>
                        <AmountInput
                          label={t('settings.paydayRules.amountLabel')}
                          value={String((step.config?.amount as string) || '100.00')}
                          onChangeText={(val) =>
                            handleUpdateStepConfig(index, {
                              config: { ...step.config, amount: val },
                            })
                          }
                        />
                      </View>
                    )}

                    {step.stepType === 'PERCENTAGE_SPLIT' && (
                      <View style={styles.configField}>
                        <MobileInput
                          label={t('settings.paydayRules.percentageLabel')}
                          keyboardType="numeric"
                          value={String((step.config?.percentage as number) || 20)}
                          onChangeText={(val) =>
                            handleUpdateStepConfig(index, {
                              config: { ...step.config, percentage: Number(val) || 0 },
                            })
                          }
                        />
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Add Rule Button */}
        <TouchableOpacity
          style={styles.addRuleBtn}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.7}
        >
          <Feather name="plus" size={16} color={DESIGN_TOKENS.colors.sereneBlue} />
          <Text style={styles.addRuleBtnText}>{t('settings.paydayRules.addRuleButton')}</Text>
        </TouchableOpacity>

        {/* Bottom Save Action */}
        <View style={styles.footerContainer}>
          <MobileButton
            title={t('settings.paydayRules.saveChanges')}
            variant="primary"
            loading={submitting}
            disabled={!isDirty || submitting}
            onPress={handleSave}
          />
        </View>
      </View>

      {/* Add Custom Step Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('settings.paydayRules.addRuleButton')}</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Feather name="x" size={20} color={DESIGN_TOKENS.colors.slate[500]} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalOptionsList}>
              {availableStepTypes.map((typeKey) => (
                <TouchableOpacity
                  key={typeKey}
                  style={styles.modalOptionCard}
                  onPress={() => handleAddStep(typeKey)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalOptionTitle}>
                    {t(`settings.paydayRules.stepTypes.${typeKey}` as Parameters<typeof t>[0])}
                  </Text>
                  <Text style={styles.modalOptionDesc}>
                    {t(`settings.paydayRules.stepDescriptions.${typeKey}` as Parameters<typeof t>[0])}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    padding: 16,
    gap: 16,
  },
  bannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    gap: 12,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[600],
    lineHeight: 18,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
  stepsContainer: {
    gap: 12,
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    gap: 12,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  stepTitleRow: {
    flexDirection: 'row',
    gap: 10,
    flex: 1,
  },
  orderBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: DESIGN_TOKENS.colors.sereneBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  stepTitleTextContainer: {
    flex: 1,
    gap: 2,
  },
  stepTypeName: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  stepTypeDesc: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[500],
    lineHeight: 15,
  },
  stepActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  moveBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveBtnDisabled: {
    opacity: 0.4,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  configContainer: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.colors.slate[100],
    gap: 10,
  },
  configField: {
    gap: 6,
  },
  envelopePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  envelopePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
  },
  envelopePillSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: DESIGN_TOKENS.colors.sereneBlue,
  },
  envelopePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[700],
  },
  envelopePillTextSelected: {
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
  addRuleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
  },
  addRuleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
  footerContainer: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  modalOptionsList: {
    gap: 10,
  },
  modalOptionCard: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    gap: 4,
  },
  modalOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  modalOptionDesc: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[500],
    lineHeight: 15,
  },
});
