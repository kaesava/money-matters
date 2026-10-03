import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '../tokens';

export interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeDelete: () => void;
  enabled?: boolean;
  style?: StyleProp<ViewStyle>;
  deleteThreshold?: number;
}

export function SwipeableCard({
  children,
  onSwipeDelete,
  enabled = true,
  style,
  deleteThreshold = 80,
}: SwipeableCardProps) {
  const panX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (!enabled) return false;
        // Only respond to horizontal gestures with minimal vertical movement
        return Math.abs(gestureState.dx) > 12 && Math.abs(gestureState.dy) < 15;
      },
      onPanResponderMove: (_, gestureState) => {
        panX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) >= deleteThreshold) {
          // Snap back and trigger delete confirmation
          Animated.spring(panX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
          onSwipeDelete();
        } else {
          // Spring back to center
          Animated.spring(panX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(panX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return (
    <View style={[styles.wrapper, style]}>
      {/* Background Delete Action Layer */}
      <View style={styles.backgroundLayer}>
        <TouchableOpacity
          style={styles.deleteButton}
          activeOpacity={0.8}
          onPress={onSwipeDelete}
          accessibilityLabel="Delete"
          accessibilityRole="button"
        >
          <Feather name="trash-2" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Foreground Swipeable Card */}
      <Animated.View
        style={[
          styles.foregroundCard,
          {
            transform: [{ translateX: panX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    marginBottom: 10,
    borderRadius: 14,
    overflow: 'hidden',
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  deleteButton: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foregroundCard: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 14,
  },
});

export default SwipeableCard;
