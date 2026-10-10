import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { t } from '@money-matters/i18n';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '../tokens';

interface MobileEnvelopeExplainerProps {
  envelopeType?: 'EVERYDAY' | 'REGULAR' | 'GOAL';
  compact?: boolean;
}

export function MobileEnvelopeExplainer({
  envelopeType,
  compact = false,
}: MobileEnvelopeExplainerProps) {
  const cards = [
    {
      key: 'EVERYDAY' as const,
      title: t('envelopes.everyday.title'),
      desc: t('envelopes.everyday.description'),
      iconName: 'shopping-bag' as const,
      iconColor: DESIGN_TOKENS.colors.sereneBlue,
      bgColor: '#EFF6FF',
      borderColor: '#BFDBFE',
    },
    {
      key: 'REGULAR' as const,
      title: t('envelopes.bills.title'),
      desc: t('envelopes.bills.description'),
      iconName: 'file-text' as const,
      iconColor: DESIGN_TOKENS.colors.warning,
      bgColor: DESIGN_TOKENS.colors.warningLight,
      borderColor: DESIGN_TOKENS.colors.warningBorder,
    },
    {
      key: 'GOAL' as const,
      title: t('envelopes.goals.title'),
      desc: t('envelopes.goals.description'),
      iconName: 'target' as const,
      iconColor: DESIGN_TOKENS.colors.success,
      bgColor: DESIGN_TOKENS.colors.successLight,
      borderColor: DESIGN_TOKENS.colors.successBorder,
    },
  ];

  const visibleCards = envelopeType
    ? cards.filter((c) => c.key === envelopeType)
    : cards;

  return (
    <View style={styles.container}>
      {visibleCards.map((card) => (
        <View
          key={card.key}
          style={[
            styles.card,
            { backgroundColor: card.bgColor, borderColor: card.borderColor },
          ]}
        >
          <View style={styles.headerRow}>
            <Feather name={card.iconName} size={16} color={card.iconColor} />
            <Text style={styles.titleText}>{card.title}</Text>
          </View>
          <Text style={[styles.descText, compact && styles.compactDesc]}>
            {card.desc}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  card: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
  },
  descText: {
    fontSize: 12,
    lineHeight: 16,
    color: DESIGN_TOKENS.colors.slate[600],
  },
  compactDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
});
