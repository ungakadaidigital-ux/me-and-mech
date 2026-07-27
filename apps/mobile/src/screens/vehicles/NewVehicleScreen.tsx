import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { TamilText, Button, TextField } from '../../components';
import { Colors, Spacing } from '../../theme/tokens';
import { useCreateVehicle } from '../../api/hooks/useVehicles';

export function NewVehicleScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const { customerId } = route.params;

  const [vehicleNumber, setVehicleNumber] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [error, setError] = useState<string | undefined>();
  const createVehicle = useCreateVehicle();

  const handleSave = async () => {
    setError(undefined);
    if (!/^TN\s?\d{2}\s?[A-Za-z]{1,2}\s?\d{4}$/.test(vehicleNumber.trim())) {
      setError('சரியான TN vehicle number உள்ளிடவும் (e.g. TN37AB1234)');
      return;
    }
    try {
      const vehicle = await createVehicle.mutateAsync({
        customer_id: customerId,
        vehicle_number: vehicleNumber.trim(),
        make: make.trim() || undefined,
        model: model.trim() || undefined,
      });
      navigation.navigate('NewJobCard', { customerId, vehicleId: vehicle.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vehicle சேமிக்க முடியவில்லை');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TextField label="Vehicle Number" value={vehicleNumber} onChangeText={(t) => setVehicleNumber(t.toUpperCase())} placeholder="TN37AB1234" />
        <TextField label="Make (optional)" value={make} onChangeText={setMake} placeholder="Hero" />
        <TextField label="Model (optional)" value={model} onChangeText={setModel} placeholder="Splendor" />
        {error ? (
          <TamilText variant="body2" color={Colors.error} style={styles.error}>
            {error}
          </TamilText>
        ) : null}
        <Button label="சேமி" onPress={handleSave} loading={createVehicle.isPending} fullWidth />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  error: { marginBottom: Spacing.md },
});
