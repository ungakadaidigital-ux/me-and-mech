import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { TamilText, Button, Card, StatusBadge, AmountDisplay, LoadingSkeleton, TextField } from '../../components';
import { Colors, Spacing } from '../../theme/tokens';
import { useInvoice, useMarkInvoicePaid, useSendInvoiceWhatsApp } from '../../api/hooks/useInvoices';
import { useNetworkStatus } from '../../offline/useNetworkStatus';

export function InvoiceScreen() {
  const route = useRoute<any>();
  const { invoiceId } = route.params;
  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const markPaid = useMarkInvoicePaid();
  const sendWhatsApp = useSendInvoiceWhatsApp();
  const { isOffline } = useNetworkStatus();
  const [customerPhone, setCustomerPhone] = useState('');
  const [sendResult, setSendResult] = useState<string | undefined>();

  if (isLoading || !invoice) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <LoadingSkeleton width="100%" height={200} />
        </View>
      </SafeAreaView>
    );
  }

  const handleSendWhatsApp = async () => {
    setSendResult(undefined);
    if (!/^[6-9]\d{9}$/.test(customerPhone)) {
      setSendResult('சரியான phone number உள்ளிடவும்');
      return;
    }
    try {
      const result = await sendWhatsApp.mutateAsync({ invoiceId: invoice.id, customerPhone: `+91${customerPhone}` });
      setSendResult(result.sent ? 'WhatsApp அனுப்பப்பட்டது ✓' : 'அனுப்ப முடியவில்லை');
    } catch {
      setSendResult('அனுப்ப முடியவில்லை');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.headerCard}>
          <TamilText variant="heading2">{invoice.invoiceNumber}</TamilText>
          <StatusBadge status={invoice.paymentStatus} />
        </Card>

        {invoice.paymentStatus !== 'PAID' && (
          <>
            <TextField
              label="Customer Phone (WhatsApp)"
              value={customerPhone}
              onChangeText={(t) => setCustomerPhone(t.replace(/\D/g, '').slice(0, 10))}
              keyboardType="number-pad"
              maxLength={10}
              error={sendResult}
            />
            <Button
              label="WhatsApp-ல் அனுப்பு"
              onPress={handleSendWhatsApp}
              loading={sendWhatsApp.isPending}
              disabled={isOffline}
              fullWidth
              variant="secondary"
              style={styles.actionButton}
            />
            {isOffline && (
              <TamilText variant="caption" color={Colors.textSecondary} style={styles.offlineNote}>
                WhatsApp அனுப்ப internet தேவை
              </TamilText>
            )}

            <Button
              label="பணம் பெற்றேன் — PAID ஆக மாற்று"
              onPress={() => markPaid.mutate(invoice.id)}
              loading={markPaid.isPending}
              disabled={isOffline}
              fullWidth
              style={styles.actionButton}
            />
            {isOffline && (
              <TamilText variant="caption" color={Colors.textSecondary} style={styles.offlineNote}>
                Payment confirm பண்ண internet தேவை — data இழக்காது, காத்திருக்கவும்
              </TamilText>
            )}
          </>
        )}

        {invoice.paymentStatus === 'PAID' && (
          <Card style={styles.paidCard}>
            <TamilText variant="heading2" color={Colors.success}>
              ✓ செலுத்தப்பட்டது
            </TamilText>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  headerCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  actionButton: { marginTop: Spacing.sm },
  offlineNote: { marginTop: Spacing.xs, textAlign: 'center' },
  paidCard: { alignItems: 'center', paddingVertical: Spacing.lg },
});
