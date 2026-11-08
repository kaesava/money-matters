import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, showMobileConfirm, useMobileToast } from '@money-matters/ui/mobile';
import { trpc } from '../../lib/trpc';

export function MobileAllocationStrategySection() {
  const router = useRouter();
  const toast = useMobileToast();
  const utils = trpc.useUtils();

  const strategyQuery = trpc.getActiveAllocationStrategy.useQuery();
  const applyPresetMut = trpc.applyAllocationPreset.useMutation();

  const activePreset = strategyQuery.data?.presetKey || 'BALANCED';

  const handleApplyPreset = (presetKey: 'BALANCED' | 'BILLS_FORTRESS' | 'PAY_YOURSELF_FIRST') => {
    showMobileConfirm({
      title: t('settings.paydayRules.resetConfirmTitle'),
      message: t('settings.paydayRules.resetConfirmMessage'),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onConfirm: async () => {
        try {
          await applyPresetMut.mutateAsync({ presetKey });
          await utils.getActiveAllocationStrategy.invalidate();
          toast.success(t('settings.paydayRules.saveSuccess'));
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t('common.errorTryAgain'));
        }
      },
    });
  };

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

  const activePresetLabel =
    activePreset === 'CUSTOM'
      ? t('settings.paydayRules.presets.custom.name')
      : activePreset === 'BILLS_FORTRESS'
      ? t('settings.paydayRules.presets.billsFortress.name')
      : activePreset === 'PAY_YOURSELF_FIRST'
      ? t('settings.paydayRules.presets.payYourselfFirst.name')
      : t('settings.paydayRules.presets.balanced.name');

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <View style={styles.badgeRow}>
            <Text style={styles.title}>{t('settings.paydayRules.title')}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activePresetLabel}</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>{t('settings.paydayRules.description')}</Text>
        </View>

        <TouchableOpacity
          style={styles.customizeBtn}
          onPress={() => router.push('/(app)/settings/allocation-rules' as Href)}
          activeOpacity={0.7}
        >
          <Feather name="sliders" size={14} color={DESIGN_TOKENS.colors.sereneBlue} />
          <Text style={styles.customizeBtnText}>{t('settings.paydayRules.customizeButton')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.presetsContainer}>
        {presetsList.map((p) => {
          const isSelected = activePreset === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              style={[styles.presetCard, isSelected && styles.presetCardSelected]}
              onPress={() => {
                if (!isSelected) {
                  handleApplyPreset(p.key);
                }
              }}
              activeOpacity={0.7}
              disabled={applyPresetMut.isPending}
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
  headerRow: {
    gap: 12,
  },
  titleContainer: {
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  badge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.sereneBlue,
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
  customizeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.sereneBlue,
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
  presetDesc: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[500],
    lineHeight: 15,
  },
});
