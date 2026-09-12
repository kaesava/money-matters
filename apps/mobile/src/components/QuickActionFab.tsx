import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { QuickExpenseModal } from './QuickExpenseModal';

import { triggerHaptic } from '../lib/haptics';

export interface QuickActionFabProps {
  visible?: boolean;
}

export function QuickActionFab({ visible = true }: QuickActionFabProps) {
  const [modalVisible, setModalVisible] = useState(false);

  if (!visible) return null;

  const handlePress = () => {
    triggerHaptic('light');
    setModalVisible(true);
  };

  return (
    <>
      <View pointerEvents="box-none" style={styles.container}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handlePress}
          style={styles.fab}
          accessibilityLabel="Quick Action"
          accessibilityRole="button"
        >
          <Feather name="plus" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <QuickExpenseModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 76 : 72,
    right: 20,
    zIndex: 99,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1B2B4B',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});

export default QuickActionFab;
