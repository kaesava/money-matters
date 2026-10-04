import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';

interface SetupArchetypeCardProps {
  emoji: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  title: string;
  description: string;
  isSelected: boolean;
  onPress: () => void;
}

export function SetupArchetypeCard({
  emoji,
  badge,
  badgeBg,
  badgeColor,
  title,
  description,
  isSelected,
  onPress,
}: SetupArchetypeCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.card, isSelected && styles.cardActive]}
    >
      <View style={styles.top}>
        <Text style={styles.emoji}>{emoji}</Text>
        <View style={[styles.badgeContainer, { backgroundColor: badgeBg }]}>
          <Text style={[styles.badgeText, { color: badgeColor }]}>{badge}</Text>
        </View>
      </View>
      <Text style={styles.name}>{title}</Text>
      <Text style={styles.desc}>{description}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: DESIGN_TOKENS.radius.lg,
    padding: 14,
    marginBottom: 10,
  },
  cardActive: { borderColor: DESIGN_TOKENS.colors.accent, backgroundColor: '#EFF6FF' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  emoji: { fontSize: 20 },
  badgeContainer: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  name: { fontSize: 14, fontWeight: '800', color: DESIGN_TOKENS.colors.primary, marginBottom: 4 },
  desc: { fontSize: 12, color: '#475569', lineHeight: 16 },
});
