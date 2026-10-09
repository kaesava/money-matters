import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

interface PaycheckStudioFooterProps {
  isFutureDate: boolean;
  isDeficit: boolean;
  submitting: boolean;
  onSaveSplit: () => void;
  onConfirmSplit: () => void;
}

export function PaycheckStudioFooter({
  isFutureDate,
  isDeficit,
  submitting,
  onSaveSplit,
  onConfirmSplit,
}: PaycheckStudioFooterProps) {
  return (
    <View style={styles.footerContainer}>
      <TouchableOpacity
        onPress={onSaveSplit}
        disabled={isDeficit || submitting}
        style={[
          styles.saveDraftFooterBtn,
          (isDeficit || submitting) && styles.disabledBtn,
        ]}
      >
        <Text style={styles.saveDraftFooterText}>
          {t('common.save')}
        </Text>
      </TouchableOpacity>

      {!isFutureDate && (
        <TouchableOpacity
          onPress={onConfirmSplit}
          disabled={isDeficit || submitting}
          style={[
            styles.confirmSplitFooterBtn,
            (isDeficit || submitting) && styles.disabledBtn,
          ]}
        >
          {submitting ? (
            <ActivityIndicator color={DESIGN_TOKENS.colors.onPrimary} size="small" />
          ) : (
            <Text style={styles.confirmSplitFooterText}>
              {t('paydayDrawer.runIncomeSplit')}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.colors.slate[200],
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 4,
    elevation: 4,
  },
  saveDraftFooterBtn: {
    flex: 1,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDraftFooterText: {
    fontSize: 14,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  confirmSplitFooterBtn: {
    flex: 2,
    backgroundColor: DESIGN_TOKENS.colors.sereneBlue,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmSplitFooterText: {
    fontSize: 14,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.onPrimary,
  },
  disabledBtn: {
    opacity: 0.5,
  },
});
