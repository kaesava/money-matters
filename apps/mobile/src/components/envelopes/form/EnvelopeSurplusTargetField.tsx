import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DESIGN_TOKENS, MobileCheckbox } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

export interface EnvelopeSurplusTargetFieldProps {
  isSurplusTarget: boolean;
  setIsSurplusTarget: (val: boolean) => void;
  isSurplusDisabled: boolean;
}

export const EnvelopeSurplusTargetField: React.FC<EnvelopeSurplusTargetFieldProps> = ({
  isSurplusTarget,
  setIsSurplusTarget,
  isSurplusDisabled,
}) => {
  return (
    <View style={styles.surplusRow}>
      <MobileCheckbox
        checked={isSurplusTarget}
        onChange={setIsSurplusTarget}
        disabled={isSurplusDisabled}
        label={t('categories.sweepSurplus')}
      />
      {isSurplusDisabled && (
        <Text style={styles.surplusDisabledText}>
          {t('categories.shortfallTargetDisabledWarning')}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  surplusRow: {
    paddingTop: 4,
    gap: 4,
  },
  surplusDisabledText: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.subtleText,
    paddingLeft: 30,
  },
});
