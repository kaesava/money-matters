import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

interface MobileAffordCheckCardProps {
  readonly onCheck: (amount: string) => void;
}

export const MobileAffordCheckCard: React.FC<MobileAffordCheckCardProps> = ({ onCheck }) => {
  const [amount, setAmount] = useState('');

  const handlePress = () => {
    if (parseFloat(amount) > 0) {
      onCheck(amount);
      setAmount('');
    }
  };

  const isValid = parseFloat(amount) > 0;

  return (
    <View testID="tour-afford-check" style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <Feather name="check-circle" size={16} color={DESIGN_TOKENS.colors.sereneBlue} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t('canIAfford.title')}</Text>
          <Text style={styles.subtext}>{t('canIAfford.quickCheckSubtext')}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <View style={styles.inputContainer}>
          <Text style={styles.currencyPrefix}>$</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={DESIGN_TOKENS.colors.slate[400]}
            keyboardType="decimal-pad"
          />
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={!isValid}
          onPress={handlePress}
          style={[styles.button, !isValid && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>{t('canIAfford.actionCheck')}</Text>
          <Feather name="arrow-right" size={14} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 4,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[900],
  },
  subtext: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[500],
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    borderRadius: DESIGN_TOKENS.radius.md,
    paddingHorizontal: 10,
    height: 38,
  },
  currencyPrefix: {
    fontSize: 14,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[500],
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[900],
    paddingVertical: 0,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DESIGN_TOKENS.colors.sereneBlue,
    borderRadius: DESIGN_TOKENS.radius.md,
    paddingHorizontal: 14,
    height: 38,
    gap: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
