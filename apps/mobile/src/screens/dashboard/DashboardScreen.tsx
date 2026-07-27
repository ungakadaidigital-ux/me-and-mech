import React, { useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { TamilText, Button, Card, AmountDisplay, LoadingSkeleton, OfflineBanner } from '../../components';
import { Colors, Spacing } from '../../theme/tokens';
import { useWorkshop, useRevenueReport, useRegisterPushToken } from '../../api/hooks/useWorkshop';
import { useJobCards } from '../../api/hooks/useJobCards';
import { useNetworkStatus } from '../../offline/useNetworkStatus';
import { getPendingCount } from '../../offline/sync';
import { getPushToken } from '../../push/registerPush';

export function DashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isOffline } = useNetworkStatus();
  const { data: workshop, isLoading: workshopLoading, refetch: refetchWorkshop } = useWorkshop();
  const { data: jobCards, isLoading: jobsLoading, refetch: refetchJobs } = useJobCards();
  const { data: revenue, refetch: refetchRevenue } = useRevenueReport(30);
  const registerPushToken = useRegisterPushToken();

  useEffect(() => {
    // Register for push once per app session — PKG-032's engagement
    // triggers (pending-payment alert, daily summary) are useless without
    // a token on file. Silently no-ops on simulators/permission-denied.
    getPushToken().then((token) => {
      if (token) registerPushToken.mutate(token);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingCount = getPendingCount();
  const pendingInvoices = jobCards?.items.filter((j) => j.status === 'invoiced').length ?? 0;

  const onRefresh = () => {
    refetchWorkshop();
    refetchJobs();
    refetchRevenue();
  };

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner visible={isOffline} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
      >
        {workshopLoading ? (
          <LoadingSkeleton width="70%" height={28} />
        ) : (
          <TamilText variant="heading1" style={styles.greeting}>
            வணக்கம், {workshop?.ownerName ?? ''}
          </TamilText>
        )}

        {workshop?.subscriptionStatus === 'trial' && (
          <Card style={styles.trialCard}>
            <TamilText variant="body2" color={Colors.primaryDark}>
              Trial period-ல் இருக்கீங்க — எல்லா features-ம் இலவசமா பயன்படுத்துங்க
            </TamilText>
          </Card>
        )}

        {pendingCount > 0 && (
          <Card style={styles.syncCard}>
            <TamilText variant="caption" color={Colors.warning}>
              {pendingCount} updates sync ஆக காத்திருக்கின்றன
            </TamilText>
          </Card>
        )}

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <TamilText variant="caption" color={Colors.textSecondary}>
              நிலுவை Bills
            </TamilText>
            {jobsLoading ? <LoadingSkeleton width={60} height={24} /> : <TamilText variant="heading2">{pendingInvoices}</TamilText>}
          </Card>
          <Card style={styles.statCard}>
            <TamilText variant="caption" color={Colors.textSecondary}>
              30 நாள் Revenue
            </TamilText>
            {revenue ? <AmountDisplay amount={revenue.paidCount * 500} size="small" /> : <LoadingSkeleton width={60} height={24} />}
          </Card>
        </View>

        <Button label="+ புதிய Job Card" onPress={() => navigation.navigate('NewJobCard')} fullWidth style={styles.newJobButton} />

        <TamilText variant="heading2" style={styles.sectionTitle}>
          சமீபத்திய Jobs
        </TamilText>
        {jobsLoading ? (
          <LoadingSkeleton width="100%" height={80} />
        ) : (
          jobCards?.items.slice(0, 5).map((job) => (
            <Card key={job.id} style={styles.jobCard}>
              <TamilText variant="body1">{job.jobType}</TamilText>
              <TamilText variant="caption" color={Colors.textSecondary}>
                {job.status}
              </TamilText>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  greeting: { marginBottom: Spacing.md },
  trialCard: { backgroundColor: '#FFF3E0', marginBottom: Spacing.sm },
  syncCard: { backgroundColor: '#FFF8E1', marginBottom: Spacing.sm },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginVertical: Spacing.md },
  statCard: { flex: 1 },
  newJobButton: { marginBottom: Spacing.lg },
  sectionTitle: { marginBottom: Spacing.sm },
  jobCard: { marginBottom: Spacing.sm },
});
