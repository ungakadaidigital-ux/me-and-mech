import React from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { TamilText, Button, Card, LoadingSkeleton } from '../../components';
import { Colors, Spacing } from '../../theme/tokens';
import { useCustomer } from '../../api/hooks/useCustomers';
import { useVehiclesForCustomer } from '../../api/hooks/useVehicles';

export function CustomerDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const { customerId } = route.params;

  const { data: customer, isLoading: customerLoading } = useCustomer(customerId);
  const { data: vehicles, isLoading: vehiclesLoading } = useVehiclesForCustomer(customerId);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {customerLoading ? (
          <LoadingSkeleton width="60%" height={28} />
        ) : (
          <>
            <TamilText variant="heading1">{customer?.name}</TamilText>
            <TamilText variant="body2" color={Colors.textSecondary} style={styles.phone}>
              {customer?.phone}
            </TamilText>
          </>
        )}

        <TamilText variant="heading2" style={styles.sectionTitle}>
          Vehicles
        </TamilText>
        {vehiclesLoading ? (
          <LoadingSkeleton width="100%" height={60} />
        ) : (
          vehicles?.map((vehicle) => (
            <Pressable key={vehicle.id} onPress={() => navigation.navigate('NewJobCard', { customerId, vehicleId: vehicle.id })}>
              <Card style={styles.vehicleCard}>
                <TamilText variant="body1">{vehicle.vehicleNumber}</TamilText>
                <TamilText variant="caption" color={Colors.textSecondary}>
                  {vehicle.make} {vehicle.model}
                </TamilText>
              </Card>
            </Pressable>
          ))
        )}
        <Button label="+ புதிய Vehicle" onPress={() => navigation.navigate('NewVehicle', { customerId })} variant="secondary" fullWidth style={styles.addVehicleButton} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  phone: { marginBottom: Spacing.md },
  sectionTitle: { marginBottom: Spacing.sm },
  vehicleCard: { marginBottom: Spacing.sm },
  addVehicleButton: { marginTop: Spacing.sm },
});
