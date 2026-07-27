import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Colors, Radius } from '../theme/tokens';

interface LoadingSkeletonProps {
  width: number | `${number}%`;
  height: number;
  radius?: number;
}

/** Locked design decision: shimmer, not spinners, for loading states —
 * spinners read as "frozen" on slow budget-Android connections; a shimmer
 * communicates "content is coming" more clearly. */
export function LoadingSkeleton({ width, height, radius = Radius.sm }: LoadingSkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.base, { width, height, borderRadius: radius, opacity }]} />;
}

const styles = StyleSheet.create({
  base: { backgroundColor: Colors.border },
});
