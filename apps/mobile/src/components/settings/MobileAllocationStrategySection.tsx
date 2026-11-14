import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, showMobileConfirm, useMobileToast } from '@money-matters/ui/mobile';
import { trpc } from '../../lib/trpc';
import { useAppFeatures } from '../../context/useAppFeatures';

export function MobileAllocationStrategySection() {
  const router = useRouter();
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const { hasPrivateMode, hasCustomAllocationRules } = useAppFeatures();

  const [activeTab, setActiveTab] = useState<'household' | 'personal'>('household');

  const govQuery = trpc.getHouseholdGovernanceInfo.useQuery();
  const envelopesQuery = trpc.listEnvelopes.useQuery();
  const isOwner = govQuery.data?.isOwner ?? true;

  const hasPrivateEnvelopes = useMemo(
    () => hasPrivateMode && (envelopesQuery.data || []).some((e) => e.isPrivate),
    [envelopesQuery.data, hasPrivateMode]
  );

  const isPersonalScope = activeTab === 'personal';
  const canEdit = isPersonalScope || isOwner;

  const strategyQuery = trpc.getActiveAllocationStrategy.useQuery({
    isPrivate: isPersonalScope,
  });
  const applyPresetMut = trpc.applyAllocationPreset.useMutation();

  const activePreset = strategyQuery.data?.presetKey || 'BALANCED';

  const presetsList: Array<{
    key: 'BALANCED' | 'BILLS_FORTRESS' | 'PAY_YOURSELF_FIRST';
    nameKey: string;
    descKey: string;
  }> = [
    {
      key: 'BALANCED',
      nameKey: 'settings.paydayRules.presets.balanced.name',
      descKey: 'settings.paydayRules.presets.balanced.description',
    },
    {
      key: 'BILLS_FORTRESS',
      nameKey: 'settings.paydayRules.presets.billsFortress.name',
      descKey: 'settings.paydayRules.presets.billsFortress.description',
    },
    {
      key: 'PAY_YOURSELF_FIRST',
      nameKey: 'settings.paydayRules.presets.payYourselfFirst.name',
      descKey: 'settings.paydayRules.presets.payYourselfFirst.description',
    },
  ];

  const handleApplyPreset = (presetKey: 'BALANCED' | 'BILLS_FORTRESS' | 'PAY_YOURSELF_FIRST') => {
    if (!canEdit) {
      toast.error(t('settings.paydayRules.onlyOwnerCanChange'));
      return;
    }
    const presetName = t(
      presetKey === 'BILLS_FORTRESS'
        ? 'settings.paydayRules.presets.billsFortress.name'
        : presetKey === 'PAY_YOURSELF_FIRST'
        ? 'settings.paydayRules.presets.payYourselfFirst.name'
        : 'settings.paydayRules.presets.balanced.name'
    );

    showMobileConfirm({
      title: t('settings.paydayRules.switchPresetConfirmTitle', { presetName }),
      message: t('settings.paydayRules.switchPresetConfirmMessage', { presetName }),
      confirmText: t('settings.paydayRules.switchPresetAction', { presetName }),
      cancelText: t('common.cancel'),
      onConfirm: async () => {
        try {
          await applyPresetMut.mutateAsync({
            presetKey,
            isPrivate: isPersonalScope,
          });
          await Promise.all([
            utils.getActiveAllocationStrategy.invalidate(),
            utils.previewPayday.invalidate(),
            utils.getHorizonProjectionData.invalidate(),
            utils.listAllAllocationPlans.invalidate(),
            utils.getHomeSummary.invalidate(),
          ]);
          toast.success(t('settings.paydayRules.saveSuccess'));
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t('common.errorTryAgain'));
        }
      },
    });
  };

  return (
    <View style={styles.card}>
      {/* Sub-tabs if user has private envelopes */}
      {hasPrivateEnvelopes && (
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'household' && styles.tabBtnActive]}
            onPress={() => setActiveTab('household')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'household' && styles.tabBtnTextActive]}>
              {t('settings.paydayRules.tabs.household')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'personal' && styles.tabBtnActive]}
            onPress={() => setActiveTab('personal')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'personal' && styles.tabBtnTextActive]}>
              {t('settings.paydayRules.tabs.personal')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Header (Pill tag removed) */}
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            {isPersonalScope
              ? t('settings.paydayRules.tabs.personal')
              : t('settings.paydayRules.title')}
          </Text>
          <Text style={styles.subtitle}>{t('settings.paydayRules.description')}</Text>
        </View>

        {hasCustomAllocationRules && (
          canEdit ? (
            <TouchableOpacity
              style={styles.customizeBtn}
              onPress={() => router.push(`/(app)/settings/allocation-rules?scope=${activeTab}` as Href)}
              activeOpacity={0.7}
            >
              <Feather name="sliders" size={14} color={DESIGN_TOKENS.colors.sereneBlue} />
              <Text style={styles.customizeBtnText}>{t('settings.paydayRules.customizeButton')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.customizeBtn, styles.customizeBtnDisabled]}>
              <Feather name="sliders" size={14} color={DESIGN_TOKENS.colors.slate[400]} />
              <Text style={[styles.customizeBtnText, styles.customizeBtnTextDisabled]}>
                {t('settings.paydayRules.customizeButton')}
              </Text>
            </View>
          )
        )}
      </View>

      {/* 4 Presets Grid */}
      <View style={styles.presetsContainer}>
        {presetsList.map((p) => {
          const isSelected = activePreset === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              style={[
                styles.presetCard,
                isSelected && styles.presetCardSelected,
                !canEdit && styles.presetCardDisabled,
              ]}
              onPress={() => {
                if (!isSelected) {
                  handleApplyPreset(p.key);
                }
              }}
              activeOpacity={canEdit ? 0.7 : 1}
              disabled={!canEdit || applyPresetMut.isPending}
            >
              <View style={styles.presetHeader}>
                <Text style={[styles.presetName, isSelected && styles.presetNameSelected]}>
                  {t(p.nameKey)}
                </Text>
                {isSelected && (
                  <View style={styles.activeCheckRow}>
                    <Feather name="check" size={12} color={DESIGN_TOKENS.colors.sereneBlue} />
                    <Text style={styles.activeCheckText}>
                      {t('settings.paydayRules.activeBadge')}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.presetDesc}>{t(p.descKey)}</Text>
            </TouchableOpacity>
          );
        })}

        {/* 4th Preset Card: Custom Rules */}
        {hasCustomAllocationRules && (
          <View
            style={[
              styles.presetCard,
              activePreset === 'CUSTOM' && styles.presetCardSelected,
            ]}
          >
            <View style={styles.presetHeader}>
              <Text style={[styles.presetName, activePreset === 'CUSTOM' && styles.presetNameSelected]}>
                {t('settings.paydayRules.presets.custom.name')}
              </Text>
              {activePreset === 'CUSTOM' ? (
                <View style={styles.activeCheckRow}>
                  <Feather name="check" size={12} color={DESIGN_TOKENS.colors.sereneBlue} />
                  <Text style={styles.activeCheckText}>
                    {t('settings.paydayRules.activeBadge')}
                  </Text>
                </View>
              ) : (
                <Text style={styles.customiseHintText}>
                  {t('settings.paydayRules.customiseToActivate')}
                </Text>
              )}
            </View>
            <Text style={styles.presetDesc}>
              {t('settings.paydayRules.presets.custom.description')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    gap: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN_TOKENS.colors.slate[200],
    paddingBottom: 12,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
  },
  tabBtnActive: {
    backgroundColor: '#1B2B4B',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  headerRow: {
    gap: 12,
  },
  titleContainer: {
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[500],
    lineHeight: 16,
  },
  customizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  customizeBtnDisabled: {
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    borderColor: DESIGN_TOKENS.colors.slate[200],
  },
  customizeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
  customizeBtnTextDisabled: {
    color: DESIGN_TOKENS.colors.slate[400],
  },
  presetsContainer: {
    gap: 10,
  },
  presetCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    gap: 4,
  },
  presetCardSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: DESIGN_TOKENS.colors.sereneBlue,
  },
  presetCardDisabled: {
    opacity: 0.75,
  },
  presetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  presetName: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  presetNameSelected: {
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
  activeCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activeCheckText: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
  customiseHintText: {
    fontSize: 10,
    fontWeight: '500',
    color: DESIGN_TOKENS.colors.slate[400],
  },
  presetDesc: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[500],
    lineHeight: 15,
  },
});
