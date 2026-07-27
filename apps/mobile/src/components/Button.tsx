import React from 'react';
import { Pressable, ActivityIndicator, StyleSheet, type ViewStyle } from 'react-native';
import { TamilText } from './TamilText';
import { Colors, Spacing, Radius } from '../theme/tokens';

type Variant = 'primary' | 'secondary' | 'destructive' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = 'primary', loading = false, disabled = false, fullWidth = false, style }: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' || variant === 'secondary' ? Colors.primary : '#FFFFFF'} />
      ) : (
        <TamilText variant="body1" color={textColor[variant]} style={styles.label}>
          {label}
        </TamilText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48, // touch target, budget-Android-friendly
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  label: { fontFamily: 'NotoSansTamil_700Bold' },
});

const variantStyles: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: Colors.primary },
  secondary: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.primary },
  destructive: { backgroundColor: Colors.error },
  ghost: { backgroundColor: 'transparent' },
};

const textColor: Record<Variant, string> = {
  primary: '#FFFFFF',
  secondary: Colors.primary,
  destructive: '#FFFFFF',
  ghost: Colors.primary,
};
