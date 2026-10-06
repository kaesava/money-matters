import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  DESIGN_TOKENS,
  AmountInput,
  MobileDatePickerField,
  MobileInput,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD, formatDate } from '../../../lib/format';

interface CommandPanelIncomeDetailsProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  sourceName: string;
  onSourceNameChange: (name: string) => void;
  actualAmount: string;
  onActualAmountChange: (amount: string) => void;
  selectedDate: string;
  onSelectedDateChange: (date: string) => void;
  numericActual: number;
  isReadOnly: boolean;
  isAmountModified: boolean;
  onRecalculateWaterfall?: () => void;
  submitting?: boolean;
}

export const CommandPanelIncomeDetails: React.FC<CommandPanelIncomeDetailsProps> = ({
  collapsed,
  onToggleCollapsed,
  sourceName,
  onSourceNameChange,
  actualAmount,
  onActualAmountChange,
  selectedDate,
  onSelectedDateChange,
  numericActual,
  isReadOnly,
  isAmountModified,
  onRecalculateWaterfall,
  submitting,
}) => {
  return (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={onToggleCollapsed}
        style={styles.cardHeaderToggle}
        activeOpacity={0.7}
      >
        <View style={styles.toggleTitleRow}>
          <Feather
            name={collapsed ? 'chevron-right' : 'chevron-down'}
            size={16}
            color={DESIGN_TOKENS.colors.textMuted}
          />
          <Text style={styles.toggleTitleText}>
            {t('paydayDrawer.reviewIncome')} • {formatDate(selectedDate)}
          </Text>
        </View>
        <Text style={styles.toggleAmountText}>{formatAUD(numericActual)}</Text>
      </TouchableOpacity>

      {!collapsed && (
        <View style={styles.detailsBody}>
          <MobileInput
            label={t('paydayDrawer.incomeSourceLabel')}
            required
            value={sourceName}
            editable={!isReadOnly}
            onChangeText={onSourceNameChange}
          />

          <AmountInput
            label={t('paydayDrawer.incomeAmountLabel')}
            required
            value={actualAmount}
            editable={!isReadOnly}
            onChangeText={onActualAmountChange}
          />

          <MobileDatePickerField
            label={t('paydayDrawer.incomeDate')}
            required
            value={selectedDate}
            disabled={isReadOnly}
            onChange={onSelectedDateChange}
          />

          {isAmountModified && onRecalculateWaterfall && !isReadOnly && (
            <View style={styles.amountModifiedNotice}>
              <Text style={styles.amountModifiedText}>
                {t('paydayDrawer.amountChangedPrompt')}
              </Text>
              <TouchableOpacity
                onPress={onRecalculateWaterfall}
                disabled={submitting}
                style={styles.reRunWaterfallBtn}
              >
                <Text style={styles.reRunWaterfallBtnText}>
                  {t('paydayDrawer.reRunWaterfall')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    overflow: 'hidden',
  },
  cardHeaderToggle: {
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: DESIGN_TOKENS.colors.surface,
  },
  toggleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  toggleTitleText: {
    fontSize: 12,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  toggleAmountText: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.primary,
  },
  detailsBody: {
    padding: 14,
    paddingTop: 4,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.colors.slate[100],
  },
  amountModifiedNotice: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  amountModifiedText: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.accentDark,
    fontWeight: '500',
  },
  reRunWaterfallBtn: {
    backgroundColor: DESIGN_TOKENS.colors.accent,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  reRunWaterfallBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.onAccent,
  },
});
