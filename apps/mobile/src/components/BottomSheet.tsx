import React, { useRef, useEffect } from 'react';
import { Animated, PanResponder, StyleSheet, Dimensions, Pressable, View } from 'react-native';
import { Colors, Radius, Spacing } from '../theme/tokens';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  snapPoints?: number[]; // heights from bottom, e.g. [300, 500]
  children: React.ReactNode;
}

/**
 * Built on PanResponder (React Native core) rather than
 * react-native-gesture-handler + reanimated, to avoid pulling in two
 * additional native dependencies (and their babel/config setup) for a
 * single component. If more gesture-heavy UI gets added later, revisit
 * this trade-off — for one draggable sheet, PanResponder is sufficient.
 */
export function BottomSheet({ visible, onClose, snapPoints = [400], children }: BottomSheetProps) {
  const height = snapPoints[0];
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : SCREEN_HEIGHT,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  }, [visible, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > height * 0.3) {
          onClose();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View
        style={[styles.sheet, { height, transform: [{ translateY }] }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.handle} />
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
});
