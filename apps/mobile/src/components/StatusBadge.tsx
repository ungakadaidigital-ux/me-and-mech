import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TamilText } from './TamilText';
import { Colors, Spacing, Radius } from '../theme/tokens';

type Status = 'draft' | 'in_progress' | 'invoiced' | 'paid' | 'PENDING' | 'PARTIALLY_PAID' | 'PAID';

const STATUS_CONFIG: Record<Status, { label: string; color: string }> = {
  draft: { label: 'வரைவு', color: Colors.textSecondary },
  in_progress: { label: 'நடைபெறுகிறது', color: Colors.warning },
  invoiced: { label: 'Bill போடப்பட்டது', color: '#3B82F6' },
  paid: { label: 'செலுத்தப்பட்டது', color: Colors.success },
  PENDING: { label: 'நிலுவையில்', color: Colors.warning },
  PARTIALLY_PAID: { label: 'பகுதி செலுத்தப்பட்டது', color: '#3B82F6' },
  PAID: { label: 'செலுத்தப்பட்டது', color: Colors.success },
};

export function StatusBadge({ status }: { status: Status }) {
  const config = STATUS_CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: `${config.color}20` }]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <TamilText variant="caption" color={config.color}>
        {config.label}
      </TamilText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
