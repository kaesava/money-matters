import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

export type RestorableItemType =
  | 'CATEGORY'
  | 'POOL'
  | 'INCOME_SOURCE'
  | 'EXPENSE_SOURCE'
  | 'BANK_ACCOUNT';

export type ArchivedItemType = 'ALL' | RestorableItemType;

export interface ArchivedItem {
  id: string;
  name: string;
  itemType: RestorableItemType;
  subtitle?: string | null;
  archivedAt: string | Date | null;
}

export interface ArchivedItemRowProps {
  item: ArchivedItem;
  isRestoring: boolean;
  disableRestore: boolean;
  onRestore: () => void;
}

export function ArchivedItemRow({
  item,
  isRestoring,
  disableRestore,
  onRestore,
}: ArchivedItemRowProps) {
  const getItemTypeBadge = () => {
    const typeKey = `settings.archived.types.${item.itemType}` as const;
    return t(typeKey);
  };

  const formattedDate = item.archivedAt
    ? new Intl.DateTimeFormat('en-AU', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Australia/Sydney',
      }).format(new Date(item.archivedAt))
    : '';

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.itemName}>{item.name}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{getItemTypeBadge()}</Text>
          </View>
        </View>
        {formattedDate ? (
          <Text style={styles.itemSubtitle}>
            {t('settings.archived.archivedOn', { date: formattedDate })}
          </Text>
        ) : null}
      </View>
      <TouchableOpacity
        onPress={onRestore}
        style={styles.restoreBtn}
        disabled={disableRestore}
      >
        {isRestoring ? (
          <ActivityIndicator size="small" color={DESIGN_TOKENS.colors.sereneBlue} />
        ) : (
          <Text style={styles.restoreBtnText}>
            {t('settings.archived.restoreAction')}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: DESIGN_TOKENS.colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[600],
    textTransform: 'uppercase',
  },
  itemSubtitle: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.textMuted,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  restoreBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
    minWidth: 70,
    alignItems: 'center',
  },
  restoreBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
});
