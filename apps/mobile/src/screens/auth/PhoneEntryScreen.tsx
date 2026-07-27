import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, Image } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { TamilText, Button, TextField } from '../../components';
import { Colors, Spacing } from '../../theme/tokens';
import { requestOtp } from '../../api/hooks/useAuth';
import { ApiError } from '../../api/client';

type Props = NativeStackScreenProps<AuthStackParamList, 'PhoneEntry'>;

export function PhoneEntryScreen({ navigation }: Props) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleContinue = async () => {
    setError(undefined);
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError('சரியான 10-இலக்க எண்ணை உள்ளிடவும்');
      return;
    }
    setLoading(true);
    try {
      await requestOtp(phone);
      navigation.navigate('OtpVerify', { phone });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ஏதோ தவறு நடந்தது. மீண்டும் முயற்சிக்கவும்');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TamilText variant="heading1" style={styles.title}>
          Me & Mech
        </TamilText>
        <TamilText variant="body2" color={Colors.textSecondary} style={styles.subtitle}>
          பேசு, Bill போடு, மறக்காதே
        </TamilText>

        <View style={styles.form}>
          <TextField
            label="மொபைல் எண்"
            value={phone}
            onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
            placeholder="9876543210"
            keyboardType="number-pad"
            maxLength={10}
            error={error}
          />
          <Button label="OTP அனுப்பு" onPress={handleContinue} loading={loading} fullWidth />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, justifyContent: 'center', padding: Spacing.lg },
  title: { textAlign: 'center', marginBottom: Spacing.xs, color: Colors.primary },
  subtitle: { textAlign: 'center', marginBottom: Spacing.xl },
  form: { marginTop: Spacing.lg },
});
