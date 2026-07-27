import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { TamilText, Button, TextField } from '../../components';
import { Colors, Spacing } from '../../theme/tokens';
import { useCreateCustomer } from '../../api/hooks/useCustomers';

export function NewCustomerScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState<string | undefined>();
  const createCustomer = useCreateCustomer();

  const handleSave = async () => {
    setError(undefined);
    if (!name.trim()) {
      setError('பெயரை உள்ளிடவும்');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError('சரியான phone number உள்ளிடவும்');
      return;
    }
    try {
      const customer = await createCustomer.mutateAsync({ name: name.trim(), phone, city: city.trim() || undefined });
      navigation.replace('CustomerDetail', { customerId: customer.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Customer சேமிக்க முடியவில்லை');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TextField label="பெயர்" value={name} onChangeText={setName} placeholder="ராஜேஷ் குமார்" />
        <TextField label="மொபைல் எண்" value={phone} onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))} keyboardType="number-pad" maxLength={10} />
        <TextField label="ஊர் (optional)" value={city} onChangeText={setCity} />
        {error ? (
          <TamilText variant="body2" color={Colors.error} style={styles.error}>
            {error}
          </TamilText>
        ) : null}
        <Button label="சேமி" onPress={handleSave} loading={createCustomer.isPending} fullWidth />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  error: { marginBottom: Spacing.md },
});
