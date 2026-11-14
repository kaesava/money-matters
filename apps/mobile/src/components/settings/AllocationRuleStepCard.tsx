import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t, ALLOCATION_STEP_TYPE_KEYS, ALLOCATION_STEP_DESC_KEYS } from '@money-matters/i18n';
import { DESIGN_TOKENS, FormLabel } from '@money-matters/ui/mobile';
import { AllocationStepType } from '@money-matters/types';

export interface EditableAllocationStep {
  id?: string;
  orderIndex: number;
  stepType: AllocationStepType;
  targetEnvelopeId?: string | null;
  config?: Record<string, unknown> | null;
}

interface AllocationRuleStepCardProps {
  step: EditableAllocationStep;
  index: number;
  isFirst: boolean;
  isLastMovable: boolean;
  canEdit: boolean;
  eligibleEnvelopes: Array<{ id: string; name: string }>;
  onMove: (index: number, direction: 'UP' | 'DOWN') => void;
  onUpdateSurplusTarget: (index: number, targetEnvelopeId: string | null) => void;
}

/**
 * Renders a single payday allocation rule step card with reorder controls and surplus target selector.
 */
export function AllocationRuleStepCard({
  step,
  index,
  isFirst,
  isLastMovable,
  canEdit,
  eligibleEnvelopes,
  onMove,
  onUpdateSurplusTarget,
}: AllocationRuleStepCardProps) {
  const isSweep = step.stepType === 'SURPLUS_SWEEP';

  return (
    <View style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <View style={styles.stepTitleRow}>
          <View style={styles.orderBadge}>
            <Text style={styles.orderBadgeText}>{index + 1}</Text>
          </View>
          <View style={styles.stepTitleTextContainer}>
            <Text style={styles.stepTypeName}>
              {t(ALLOCATION_STEP_TYPE_KEYS[step.stepType] ?? step.stepType)}
            </Text>
            <Text style={styles.stepTypeDesc}>
              {t(ALLOCATION_STEP_DESC_KEYS[step.stepType] ?? '')}
            </Text>
          </View>
        </View>

        {canEdit && !isSweep && (
          <View style={styles.stepActionButtons}>
            <TouchableOpacity
              disabled={isFirst}
              onPress={() => onMove(index, 'UP')}
              style={[styles.moveBtn, isFirst && styles.moveBtnDisabled]}
              accessibilityLabel={t('settings.paydayRules.moveUp')}
            >
              <Feather
                name="chevron-up"
                size={16}
                color={isFirst ? DESIGN_TOKENS.colors.slate[300] : DESIGN_TOKENS.colors.slate[700]}
              />
            </TouchableOpacity>
            <TouchableOpacity
              disabled={isLastMovable}
              onPress={() => onMove(index, 'DOWN')}
              style={[styles.moveBtn, isLastMovable && styles.moveBtnDisabled]}
              accessibilityLabel={t('settings.paydayRules.moveDown')}
            >
              <Feather
                name="chevron-down"
                size={16}
                color={isLastMovable ? DESIGN_TOKENS.colors.slate[300] : DESIGN_TOKENS.colors.slate[700]}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {isSweep && (
        <View style={styles.configContainer}>
          <FormLabel>{t('settings.paydayRules.targetEnvelopeLabel')}</FormLabel>
          <View style={styles.envelopePillsRow}>
            <TouchableOpacity
              style={[styles.envelopePill, !step.targetEnvelopeId && styles.envelopePillSelected]}
              disabled={!canEdit}
              onPress={() => onUpdateSurplusTarget(index, null)}
            >
              <Text style={[styles.envelopePillText, !step.targetEnvelopeId && styles.envelopePillTextSelected]}>
                {t('categories.mainPool')}
              </Text>
            </TouchableOpacity>
            {eligibleEnvelopes.map((env) => {
              const isEnvSelected = step.targetEnvelopeId === env.id;
              return (
                <TouchableOpacity
                  key={env.id}
                  style={[styles.envelopePill, isEnvSelected && styles.envelopePillSelected]}
                  disabled={!canEdit}
                  onPress={() => onUpdateSurplusTarget(index, env.id)}
                >
                  <Text style={[styles.envelopePillText, isEnvSelected && styles.envelopePillTextSelected]}>
                    {env.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stepCard: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
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
    color: DESIGN_TOKENS.colors.surface,
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
  configContainer: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.colors.slate[100],
    gap: 8,
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
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
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
});
