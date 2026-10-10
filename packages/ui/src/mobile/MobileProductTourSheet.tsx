import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '../tokens';

export interface MobileTourStepConfig {
  step: number;
  totalSteps: number;
  titleKey: string;
  descKey: string;
  badgeKey?: string;
}

export interface MobileProductTourSheetProps {
  visible: boolean;
  stepConfig: MobileTourStepConfig;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  isLastStep: boolean;
}

export function MobileProductTourSheet({
  visible,
  stepConfig,
  onNext,
  onBack,
  onSkip,
  isLastStep,
}: MobileProductTourSheetProps) {
  const D = DESIGN_TOKENS;

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onSkip}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onSkip} />
        <View style={styles.content}>
          <View style={styles.dragIndicator} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.pillContainer}>
              <View style={styles.stepBadge}>
                <Feather name="star" size={12} color={D.colors.accent} />
                <Text style={styles.stepBadgeText}>
                  {t('tour.steps.stepCount', {
                    current: stepConfig.step,
                    total: stepConfig.totalSteps,
                  })}
                </Text>
              </View>
              {stepConfig.badgeKey ? (
                <Text style={styles.badgeText}>{t(stepConfig.badgeKey)}</Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={onSkip} style={styles.closeBtn} activeOpacity={0.7}>
              <Feather name="x" size={20} color={D.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={styles.body}>
            <Text style={styles.title}>{t(stepConfig.titleKey)}</Text>
            <Text style={styles.desc}>{t(stepConfig.descKey)}</Text>
          </View>

          {/* Footer Controls */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onSkip} activeOpacity={0.7}>
              <Text style={styles.skipBtnText}>{t('tour.controls.skip')}</Text>
            </TouchableOpacity>

            <View style={styles.actionRow}>
              {stepConfig.step > 1 ? (
                <TouchableOpacity
                  onPress={onBack}
                  style={styles.backBtn}
                  activeOpacity={0.8}
                >
                  <Feather name="arrow-left" size={14} color={D.colors.textMuted} />
                  <Text style={styles.backBtnText}>{t('tour.controls.back')}</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                onPress={onNext}
                style={styles.nextBtn}
                activeOpacity={0.85}
              >
                <Text style={styles.nextBtnText}>
                  {isLastStep ? t('tour.controls.finish') : t('tour.controls.next')}
                </Text>
                <Feather
                  name={isLastStep ? 'check' : 'arrow-right'}
                  size={14}
                  color={D.colors.onAccent}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    backgroundColor: D.colors.surface,
    borderTopLeftRadius: D.radius.lg,
    borderTopRightRadius: D.radius.lg,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
    elevation: 10,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: D.colors.sereneBlue,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: D.colors.slate[500],
    textTransform: 'uppercase',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    marginVertical: 6,
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: D.colors.primary,
  },
  desc: {
    fontSize: 13,
    lineHeight: 18,
    color: D.colors.slate[600],
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: D.colors.border,
  },
  skipBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: D.colors.slate[400],
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: D.radius.sm,
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: D.colors.slate[600],
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: D.colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: D.radius.sm,
  },
  nextBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: D.colors.onAccent,
  },
});
