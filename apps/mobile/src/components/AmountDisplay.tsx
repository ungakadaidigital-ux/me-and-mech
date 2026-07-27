import React from 'react';
import { TamilText } from './TamilText';
import { Colors } from '../theme/tokens';

interface AmountDisplayProps {
  amount: string | number;
  size?: 'small' | 'large';
  color?: string;
}

/** Formats a money value as Indian Rupees using Roboto Mono, so digit
 * widths are uniform and amounts align vertically in lists — matches the
 * shared formatInr() convention used server-side, kept in sync manually
 * since this is a display-only concern (no business logic duplicated). */
export function AmountDisplay({ amount, size = 'large', color = Colors.textPrimary }: AmountDisplayProps) {
  const numeric = typeof amount === 'string' ? Number(amount) : amount;
  const formatted = Number.isFinite(numeric)
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(numeric)
    : '₹0';

  return (
    <TamilText variant={size === 'large' ? 'amount' : 'amountSmall'} color={color}>
      {formatted}
    </TamilText>
  );
}
