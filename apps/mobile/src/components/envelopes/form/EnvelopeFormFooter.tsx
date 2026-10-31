import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DESIGN_TOKENS, MobileButton } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

export interface EnvelopeFormFooterProps {
  isEdit: boolean;
  showArchive?: boolean;
  archiveLabel?: string;
  isSurplusTarget?: boolean;
  isPending: boolean;
  isValid: boolean;
  isDirty: boolean;
  onArchive: () => void;
  onSubmit: () => void;
}

export type CategoryFormFooterProps = EnvelopeFormFooterProps;

export const EnvelopeFormFooter: React.FC<EnvelopeFormFooterProps> = ({
  isEdit,
  showArchive,
  archiveLabel,
  isSurplusTarget,
  isPending,
  isValid,
  isDirty,
  onArchive,
  onSubmit,
}) => {
  const canArchive = (showArchive ?? isEdit) && !isSurplusTarget;
  const label = archiveLabel || t('categories.archivePool');
  return (
    <View style={styles.footerContainer}>
      {canArchive ? (
        <TouchableOpacity
          onPress={onArchive}
          disabled={isPending}
          style={styles.archiveBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.archiveBtnText}>{label}</Text>
        </TouchableOpacity>
      ) : isSurplusTarget && isEdit ? (
        <View style={styles.archiveBtn}>
          <Text style={[styles.archiveBtnText, { opacity: 0.4 }]}>{label}</Text>
        </View>
      ) : (
        <View style={styles.flex1} />
      )}

      <MobileButton
        variant="primary"
        loading={isPending}
        disabled={!isValid || !isDirty || isPending}
        onPress={onSubmit}
        style={styles.submitBtn}
      >
        {t('categories.savePool')}
      </MobileButton>
    </View>
  );
};

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  archiveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  archiveBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.subtleText,
  },
  submitBtn: {
    flex: 1,
    maxWidth: 200,
  },
});

export const CategoryFormFooter = EnvelopeFormFooter;

