import React from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Linking } from 'react-native';
import { TamilText, Button, Card, LoadingSkeleton } from '../../components';
import { Colors, Spacing } from '../../theme/tokens';
import { useReferralStatus } from '../../api/hooks/useWorkshop';
import { REFERRAL, DOMAINS } from '@me-and-mech/shared';

/**
 * PKG-045 — corrected from the original doc draft: code prefix is `MM-`
 * (not `MX-`), product name is "Me & Mech" (not "Mechanix OS"), and the
 * join link points at the real app subdomain, not a placeholder domain.
 */
export function ReferralScreen() {
  const { data: referral, isLoading } = useReferralStatus();

  const handleShare = () => {
    if (!referral?.code) return;
    const message =
      `நண்பா! Me & Mech — Tamil mechanics-க்காக. ` +
      `Bills போடுவது இனி எளிது. ` +
      `என் code ${referral.code} உபயோகித்து register பண்ணு. ` +
      `https://${DOMAINS.app}/join?ref=${referral.code}`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TamilText variant="heading1" style={styles.title}>
          Referral
        </TamilText>

        {isLoading ? (
          <LoadingSkeleton width="100%" height={100} />
        ) : (
          <Card style={styles.codeCard}>
            <TamilText variant="body2" color={Colors.textSecondary}>
              உங்கள் Referral Code
            </TamilText>
            <TamilText variant="heading1" color={Colors.primary} style={styles.code}>
              {referral?.code ?? '—'}
            </TamilText>
            <Button label="WhatsApp-ல் பகிர்" onPress={handleShare} fullWidth />
          </Card>
        )}

        <Card style={styles.statsCard}>
          <TamilText variant="body1">வெற்றிகரமான Referrals: {referral?.successfulReferrals ?? 0}</TamilText>
        </Card>

        <TamilText variant="heading2" style={styles.tiersTitle}>
          Rewards
        </TamilText>
        <View style={styles.tierList}>
          <TamilText variant="body2">1 referral → 15 நாட்கள் இலவசம்</TamilText>
          <TamilText variant="body2">3 referrals → 1 மாதம் இலவசம்</TamilText>
          <TamilText variant="body2">5 referrals → 2 மாதம் இலவசம்</TamilText>
          <TamilText variant="body2">10+ referrals → 20% நிரந்தர தள்ளுபடி</TamilText>
        </View>
        <TamilText variant="caption" color={Colors.textSecondary} style={styles.conditionNote}>
          Referral வெற்றி பெற: புதிய workshop {REFERRAL.successJobCardThreshold} job cards {REFERRAL.successWindowDays} நாட்களுக்குள் உருவாக்க வேண்டும்.
        </TamilText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  title: { marginBottom: Spacing.md },
  codeCard: { alignItems: 'center', marginBottom: Spacing.md, backgroundColor: '#FFF3E0' },
  code: { marginVertical: Spacing.sm, letterSpacing: 2 },
  statsCard: { marginBottom: Spacing.md },
  tiersTitle: { marginBottom: Spacing.sm },
  tierList: { gap: Spacing.xs, marginBottom: Spacing.md },
  conditionNote: { textAlign: 'center' },
});
