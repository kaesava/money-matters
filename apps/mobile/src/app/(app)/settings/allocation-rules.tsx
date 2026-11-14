import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import {
  DESIGN_TOKENS,
  MobileButton,
  showMobileConfirm,
  useMobileToast,
} from '@money-matters/ui/mobile';
import { trpc } from '../../../lib/trpc';
import { AppScreenWrapper } from '../../../components/AppScreenWrapper';
import { AllocationStepType } from '@money-matters/types';
import { useAppFeatures } from '../../../context/useAppFeatures';
import {
  AllocationRuleStepCard,
  type EditableAllocationStep,
} from '../../../components/settings/AllocationRuleStepCard';

type EditableStep = EditableAllocationStep;

export default function MobileAllocationRulesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ scope?: string }>();
  const { hasPrivateMode, hasCustomAllocationRules } = useAppFeatures();
  const isPersonal = params.scope === 'personal' && hasPrivateMode;
  const toast = useMobileToast();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!hasCustomAllocationRules) {
      router.replace('/(app)/settings' as Href);
    }
  }, [hasCustomAllocationRules, router]);

  const govQuery = trpc.getHouseholdGovernanceInfo.useQuery(undefined, {
    enabled: hasCustomAllocationRules,
  });
  const isOwner = govQuery.data?.isOwner ?? true;
  const canEdit = isPersonal || isOwner;

  const strategyQuery = trpc.getActiveAllocationStrategy.useQuery(
    { isPrivate: isPersonal },
    { enabled: hasCustomAllocationRules }
  );
  const envelopesQuery = trpc.listEnvelopes.useQuery(undefined, {
    enabled: hasCustomAllocationRules,
  });
  const updateStepsMut = trpc.updateAllocationStrategySteps.useMutation();
  const applyPresetMut = trpc.applyAllocationPreset.useMutation();

  const [steps, setSteps] = useState<EditableStep[]>([]);
  const [initialSteps, setInitialSteps] = useState<EditableStep[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const handleMove = (index: number, direction: 'UP' | 'DOWN') => {
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;
    if (
      steps[index]?.stepType === 'SURPLUS_SWEEP' ||
      steps[targetIndex]?.stepType === 'SURPLUS_SWEEP'
    ) {
      return;
    }

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

  const handleResetToRecommended = () => {
    showMobileConfirm({
      title: t('settings.paydayRules.resetConfirmTitle'),
      message: t('settings.paydayRules.resetConfirmMessage'),
      confirmText: t('settings.paydayRules.resetToRecommended'),
      cancelText: t('common.cancel'),
      onConfirm: async () => {
        try {
          await applyPresetMut.mutateAsync({
            presetKey: 'BALANCED',
            isPrivate: isPersonal,
          });
          await Promise.all([
            utils.getActiveAllocationStrategy.invalidate(),
            utils.previewPayday.invalidate(),
            utils.getHorizonProjectionData.invalidate(),
            utils.listAllAllocationPlans.invalidate(),
            utils.getHomeSummary.invalidate(),
          ]);
          toast.success(t('settings.paydayRules.saveSuccess'));
          setIsDirty(false);
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
      await Promise.all([
        utils.getActiveAllocationStrategy.invalidate(),
        utils.previewPayday.invalidate(),
        utils.getHorizonProjectionData.invalidate(),
        utils.listAllAllocationPlans.invalidate(),
        utils.getHomeSummary.invalidate(),
      ]);
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

  if (!hasCustomAllocationRules) {
    return null;
  }

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

  const pageTitle = isPersonal
    ? t('settings.paydayRules.tabs.personal')
    : t('settings.paydayRules.pageTitle');

  return (
    <AppScreenWrapper
      title={pageTitle}
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
          {canEdit && (
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
          )}
        </View>

        {!canEdit && (
          <View style={styles.readOnlyBanner}>
            <Text style={styles.readOnlyBannerText}>
              {t('settings.paydayRules.onlyOwnerCanChange')}
            </Text>
          </View>
        )}

        {/* Steps List */}
        <View style={styles.stepsContainer}>
          {steps.map((step, index) => {
            const isFirst = index === 0;
            const isBeforeSweep = steps[index + 1]?.stepType === 'SURPLUS_SWEEP';
            const isLastMovable = index === steps.length - 1 || isBeforeSweep;

            return (
              <AllocationRuleStepCard
                key={`${step.stepType}-${index}`}
                step={step}
                index={index}
                isFirst={isFirst}
                isLastMovable={isLastMovable}
                canEdit={canEdit}
                eligibleEnvelopes={eligibleEnvelopes}
                onMove={handleMove}
                onUpdateSurplusTarget={handleUpdateSurplusTarget}
              />
            );
          })}
        </View>

        {/* Bottom Save Action */}
        {canEdit && (
          <View style={styles.footerContainer}>
            <MobileButton
              title={t('settings.paydayRules.saveChanges')}
              variant="primary"
              loading={submitting}
              disabled={!isDirty || submitting}
              onPress={handleSave}
            />
          </View>
        )}
      </View>
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
  readOnlyBanner: {
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  readOnlyBannerText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  footerContainer: {
    paddingTop: 8,
    paddingBottom: 24,
  },
});
