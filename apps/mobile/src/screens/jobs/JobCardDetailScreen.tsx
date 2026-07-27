import React from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { TamilText, Button, Card, StatusBadge, AmountDisplay, LoadingSkeleton } from '../../components';
import { Colors, Spacing } from '../../theme/tokens';
import { useJobCard, useUpdateJobCardStatus } from '../../api/hooks/useJobCards';
import { useGenerateInvoice } from '../../api/hooks/useInvoices';

export function JobCardDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const { jobCardId } = route.params;

  const { data: jobCard, isLoading } = useJobCard(jobCardId);
  const updateStatus = useUpdateJobCardStatus();
  const generateInvoice = useGenerateInvoice();

  if (isLoading || !jobCard) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <LoadingSkeleton width="100%" height={200} />
        </View>
      </SafeAreaView>
    );
  }

  const total = jobCard.items.reduce((sum, item) => sum + Number(item.amount ?? Number(item.rate) * item.quantity), 0);

  const handleStartWork = () => updateStatus.mutate({ id: jobCard.id, status: 'in_progress' });

  const handleGenerateInvoice = async () => {
    const invoice = await generateInvoice.mutateAsync(jobCard.id);
    navigation.navigate('Invoice', { invoiceId: invoice.id });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TamilText variant="heading2">{jobCard.jobType}</TamilText>
          <StatusBadge status={jobCard.status} />
        </View>

        <TamilText variant="heading2" style={styles.sectionTitle}>
          Items
        </TamilText>
        {jobCard.items.map((item) => (
          <Card key={item.id} style={styles.itemCard}>
            <View style={styles.itemRow}>
              <TamilText variant="body1">{item.description}</TamilText>
              <AmountDisplay amount={item.amount ?? String(Number(item.rate) * item.quantity)} size="small" />
            </View>
            <TamilText variant="caption" color={Colors.textSecondary}>
              {item.quantity} × ₹{item.rate}
            </TamilText>
          </Card>
        ))}

        <Card style={styles.totalCard}>
          <TamilText variant="body1">மொத்தம்</TamilText>
          <AmountDisplay amount={String(total)} />
        </Card>

        {jobCard.status === 'draft' && (
          <Button label="வேலை தொடங்கு" onPress={handleStartWork} loading={updateStatus.isPending} fullWidth />
        )}
        {jobCard.status === 'in_progress' && (
          <Button label="Invoice உருவாக்கு" onPress={handleGenerateInvoice} loading={generateInvoice.isPending} fullWidth />
        )}
        {(jobCard.status === 'invoiced' || jobCard.status === 'paid') && (
          <Button label="Invoice பார்" onPress={() => navigation.navigate('Invoice', { invoiceId: jobCard.id })} fullWidth />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { marginBottom: Spacing.sm },
  itemCard: { marginBottom: Spacing.sm },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: Spacing.md, backgroundColor: '#FFF3E0' },
});
