import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, StyleProp, ViewStyle } from 'react-native';

export interface SkeletonCardProps {
  height?: number;
  borderRadius?: number;
  count?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonCard({
  height = 72,
  borderRadius = 14,
  count = 3,
  style,
}: SkeletonCardProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.85],
  });

  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <Animated.View
          key={index}
          style={[
            styles.card,
            { height, borderRadius, opacity },
            style,
          ]}
        >
          <View style={styles.topRow}>
            <View style={styles.circle} />
            <View style={styles.textStack}>
              <View style={styles.lineLong} />
              <View style={styles.lineShort} />
            </View>
            <View style={styles.badge} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
    paddingVertical: 4,
  },
  card: {
    backgroundColor: '#E2E8F0',
    padding: 14,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#CBD5E1',
  },
  textStack: {
    flex: 1,
    gap: 6,
  },
  lineLong: {
    width: '70%',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#CBD5E1',
  },
  lineShort: {
    width: '40%',
    height: 10,
    borderRadius: 5,
    backgroundColor: '#CBD5E1',
  },
  badge: {
    width: 48,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#CBD5E1',
  },
});

export default SkeletonCard;
