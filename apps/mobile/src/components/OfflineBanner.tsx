import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TamilText } from './TamilText';
import { Colors, Spacing } from '../theme/tokens';

export function OfflineBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={styles.banner}>
      <TamilText variant="caption" color="#1A1A1A">
        📡 Offline — data உள்ளூரில் சேமிக்கப்படுகிறது, இணைப்பு வந்தவுடன் sync ஆகும்
      </TamilText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.offlineYellow,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
});
