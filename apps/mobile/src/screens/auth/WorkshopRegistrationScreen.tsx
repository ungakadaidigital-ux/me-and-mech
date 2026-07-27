import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { TamilText, Button, TextField } from '../../components';
import { Colors, Spacing } from '../../theme/tokens';
import { registerWorkshop } from '../../api/hooks/useAuth';
import { useAuthStore } from '../../store/auth.store';

type Props = NativeStackScreenProps<AuthStackParamList, 'WorkshopRegistration'>;

export function WorkshopRegistrationScreen({ route }: Props) {
  const { onboardingToken } = route.params;
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [city, setCity] = useState('');
  const [invoicePrefix, setInvoicePrefix] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const setSession = useAuthStore((s) => s.setSession);

  const handleRegister = async () => {
    setError(undefined);
    if (!shopName.trim() || !ownerName.trim() || !city.trim() || !invoicePrefix.trim()) {
      setError('அனைத்து fields-ஐயும் நிரப்பவும்');
      return;
    }
    setLoading(true);
    try {
      const result = await registerWorkshop(onboardingToken, {
        shop_name: shopName.trim(),
        owner_name: ownerName.trim(),
        city: city.trim(),
        invoice_prefix: invoicePrefix.trim().toUpperCase(),
      });
      await setSession({
        accessToken: result.session.accessToken,
        refreshToken: result.session.refreshToken,
        workshopId: result.workshop.id,
        subscriptionStatus: 'trial',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration தோல்வியடைந்தது');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TamilText variant="heading2" style={styles.title}>
          உங்கள் Workshop-ஐ பதிவு செய்யுங்கள்
        </TamilText>

        <TextField label="கடை பெயர்" value={shopName} onChangeText={setShopName} placeholder="முருகன் ஆட்டோ வொர்க்ஸ்" />
        <TextField label="உரிமையாளர் பெயர்" value={ownerName} onChangeText={setOwnerName} placeholder="முருகன்" />
        <TextField label="ஊர்" value={city} onChangeText={setCity} placeholder="Coimbatore" />
        <TextField
          label="Invoice Prefix (2-4 எழுத்துகள்)"
          value={invoicePrefix}
          onChangeText={(t) => setInvoicePrefix(t.toUpperCase().slice(0, 10))}
          placeholder="MG"
        />

        {error ? (
          <TamilText variant="body2" color={Colors.error} style={styles.error}>
            {error}
          </TamilText>
        ) : null}

        <Button label="பதிவு செய்" onPress={handleRegister} loading={loading} fullWidth />
        <TamilText variant="caption" color={Colors.textSecondary} style={styles.trialNote}>
          30 நாட்கள் இலவச trial — Credit card தேவையில்லை
        </TamilText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg },
  title: { marginBottom: Spacing.lg },
  error: { marginBottom: Spacing.md },
  trialNote: { textAlign: 'center', marginTop: Spacing.md },
});
