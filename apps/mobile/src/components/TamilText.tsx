import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { Typography, Colors } from '../theme/tokens';

type Variant = keyof typeof Typography;

interface TamilTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  children: React.ReactNode;
}

/**
 * Every piece of Tamil-bearing text in the app should go through this
 * component, not a raw <Text>. Centralizing font application here means
 * a font-loading bug or a future typography change only needs fixing in
 * one place, not audited across every screen.
 */
export function TamilText({ variant = 'body1', color = Colors.textPrimary, style, children, ...rest }: TamilTextProps) {
  const variantStyle = Typography[variant] as TextStyle;
  return (
    <Text style={[variantStyle, { color }, style]} {...rest}>
      {children}
    </Text>
  );
}
