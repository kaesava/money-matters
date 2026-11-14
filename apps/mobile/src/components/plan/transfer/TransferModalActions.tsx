import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

interface TransferModalActionsProps {
  submitting: boolean;
  onSaveDraft: () => void;
  onExecuteNow: () => void;
  onDelete?: () => void;
}

export const TransferModalActions: React.FC<TransferModalActionsProps> = ({
  submitting,
  onSaveDraft,
  onExecuteNow,
  onDelete,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.saveDraftBtn}
          onPress={onSaveDraft}
          disabled={submitting}
        >
          <Text style={styles.saveDraftText}>{t('common.save')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.executeBtn}
          onPress={onExecuteNow}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={DESIGN_TOKENS.colors.onAccent} size="small" />
          ) : (
            <Text style={styles.executeBtnText}>{t('common.transfer')}</Text>
          )}
        </TouchableOpacity>
      </View>

      {onDelete && (
        <TouchableOpacity
          onPress={onDelete}
          disabled={submitting}
          style={styles.deleteLink}
        >
          <Feather name="trash-2" size={14} color={DESIGN_TOKENS.colors.slate[400]} />
          <Text style={styles.deleteLinkText}>{t('common.delete')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginTop: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  saveDraftBtn: {
    flex: 1,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDraftText: {
    fontSize: 14,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  executeBtn: {
    flex: 1,
    backgroundColor: DESIGN_TOKENS.colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  executeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.onAccent,
  },
  deleteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 4,
  },
  deleteLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[400],
  },
});
