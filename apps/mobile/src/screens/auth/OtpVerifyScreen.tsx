import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { TamilText, Button, TextField } from '../../components';
import { Colors, Spacing } from '../../theme/tokens';
import { verifyOtp, requestOtp } from '../../api/hooks/useAuth';
import { useAuthStore } from '../../store/auth.store';
import { ApiError } from '../../api/client';

type Props = NativeStackScreenProps<AuthStackParamList, 'OtpVerify'>;

export function OtpVerifyScreen({ route, navigation }: Props) {
  const { phone } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const setSession = useAuthStore((s) => s.setSession);

  const handleVerify = async () => {
    setError(undefined);
    if (otp.length !== 6) {
      setError('6-இலக்க OTP-ஐ உள்ளிடவும்');
      return;
    }
    setLoading(true);
    try {
      const result = await verifyOtp(phone, otp);
      if (result.isNewUser) {
        navigation.navigate('WorkshopRegistration', { onboardingToken: result.onboardingToken, phone: result.phone });
      } else {
        await setSession({
          accessToken: result.session.accessToken,
          refreshToken: result.session.refreshToken,
          workshopId: result.workshopId,
          subscriptionStatus: 'trial', // refined on first /workshop/me fetch after login
        });
        // RootNavigator switches to Main automatically once accessToken is set.
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'தவறான OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(undefined);
    try {
      await requestOtp(phone);
    } catch {
      setError('OTP அனுப்ப முடியவில்லை');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TamilText variant="heading2" style={styles.title}>
          OTP உள்ளிடவும்
        </TamilText>
        <TamilText variant="body2" color={Colors.textSecondary} style={styles.subtitle}>
          +91 {phone} க்கு அனுப்பப்பட்டது
        </TamilText>

        <TextField label="OTP" value={otp} onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} error={error} />

        <Button label="சரிபார்" onPress={handleVerify} loading={loading} fullWidth />
        <Button label="மீண்டும் அனுப்பு" onPress={handleResend} variant="ghost" style={styles.resend} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, justifyContent: 'center', padding: Spacing.lg },
  title: { textAlign: 'center', marginBottom: Spacing.xs },
  subtitle: { textAlign: 'center', marginBottom: Spacing.xl },
  resend: { marginTop: Spacing.sm },
});
