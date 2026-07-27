import React from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { TamilText, Card, LoadingSkeleton } from '../../components';
import { Colors, Spacing } from '../../theme/tokens';
import { useRevenueReport, useVoiceUsage } from '../../api/hooks/useWorkshop';

/** "Time saved" framing per the locked DAU/MAU driver note (PKG-035) — voice
 * usage count is shown with an estimated-minutes-saved framing on the
 * client; the backend deliberately returns only the raw count. */
const AVG_MINUTES_SAVED_PER_VOICE_ENTRY = 3;

export function ReportsScreen() {
  const { data: revenue, isLoading: revenueLoading } = useRevenueReport(30);
  const { data: voice, isLoading: voiceLoading } = useVoiceUsage(30);

  const minutesSaved = (voice?.voiceSessionCount ?? 0) * AVG_MINUTES_SAVED_PER_VOICE_ENTRY;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TamilText variant="heading1" style={styles.title}>
          Reports
        </TamilText>

        <Card style={styles.card}>
          <TamilText variant="body2" color={Colors.textSecondary}>
            கடந்த 30 நாட்களில் Invoices
          </TamilText>
          {revenueLoading ? (
            <LoadingSkeleton width={80} height={32} />
          ) : (
            <TamilText variant="heading1">{revenue?.totalInvoices ?? 0}</TamilText>
          )}
          <View style={styles.breakdown}>
            <TamilText variant="caption" color={Colors.success}>
              செலுத்தப்பட்டது: {revenue?.paidCount ?? 0}
            </TamilText>
            <TamilText variant="caption" color={Colors.warning}>
              நிலுவையில்: {revenue?.pendingCount ?? 0}
            </TamilText>
          </View>
        </Card>

        <Card style={styles.card}>
          <TamilText variant="body2" color={Colors.textSecondary}>
            குரல் மூலம் மிச்சமான நேரம்
          </TamilText>
          {voiceLoading ? (
            <LoadingSkeleton width={80} height={32} />
          ) : (
            <TamilText variant="heading1" color={Colors.primary}>
              ~{minutesSaved} நிமிடங்கள்
            </TamilText>
          )}
          <TamilText variant="caption" color={Colors.textSecondary}>
            {voice?.voiceSessionCount ?? 0} குரல் entries
          </TamilText>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  title: { marginBottom: Spacing.md },
  card: { marginBottom: Spacing.md },
  breakdown: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xs },
});
