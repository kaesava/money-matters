import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { useRouter, type Href } from 'expo-router';

interface PoolOverflowMenuModalProps {
  visible: boolean;
  onClose: () => void;
  onMoveMoney: () => void;
}

export function PoolOverflowMenuModal({
  visible,
  onClose,
  onMoveMoney,
}: PoolOverflowMenuModalProps) {
  const router = useRouter();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onClose();
              onMoveMoney();
            }}
          >
            <Feather name="repeat" size={16} color={DESIGN_TOKENS.colors.slate[600]} />
            <Text style={styles.menuItemText}>{t('dashboard.moveMoney')}</Text>
          </TouchableOpacity>

          <View style={styles.menuItemDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onClose();
              router.push('/(app)/envelopes/projection' as Href);
            }}
          >
            <Feather name="trending-up" size={16} color={DESIGN_TOKENS.colors.slate[600]} />
            <Text style={styles.menuItemText}>{t('categories.projectionModeTitle')}</Text>
          </TouchableOpacity>

          <View style={styles.menuItemDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onClose();
              router.push({ pathname: '/(setup)/income', params: { mode: 'rerun' } } as Href);
            }}
          >
            <Feather name="settings" size={16} color={DESIGN_TOKENS.colors.slate[600]} />
            <Text style={styles.menuItemText}>{t('categories.recalibrateBudget')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 110,
    paddingRight: 20,
  },
  menuContainer: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    paddingVertical: 6,
    width: 220,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  menuItemText: { fontSize: 13, fontWeight: '700', color: DESIGN_TOKENS.colors.textPrimary },
  menuItemDivider: { height: 1, backgroundColor: DESIGN_TOKENS.colors.slate[100], marginHorizontal: 8 },
});
