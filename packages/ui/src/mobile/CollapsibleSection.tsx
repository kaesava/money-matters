import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '../tokens';

export interface CollapsibleSectionProps {
  readonly title: string;
  readonly defaultOpen?: boolean;
  readonly children: React.ReactNode;
  readonly action?: React.ReactNode;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  defaultOpen = true,
  children,
  action,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsOpen((prev) => !prev)}
        activeOpacity={0.7}
      >
        <View style={styles.titleRow}>
          <Ionicons
            name={isOpen ? 'chevron-down' : 'chevron-forward'}
            size={18}
            color={DESIGN_TOKENS.colors.textMuted}
          />
          <Text style={styles.title}>{title}</Text>
        </View>
        {action ? <View style={styles.actionContainer}>{action}</View> : null}
      </TouchableOpacity>
      {isOpen ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: DESIGN_TOKENS.spacing.stackGap,
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DESIGN_TOKENS.spacing.cardPadding,
    paddingVertical: DESIGN_TOKENS.spacing.stackGap,
    backgroundColor: DESIGN_TOKENS.colors.surfaceVariant,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    padding: DESIGN_TOKENS.spacing.cardPadding,
  },
});

export default CollapsibleSection;
