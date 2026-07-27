import React from 'react';
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/auth.store';
import type { RootStackParamList } from './types';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { JobCardDetailScreen } from '../screens/jobs/JobCardDetailScreen';
import { NewJobCardScreen } from '../screens/jobs/NewJobCardScreen';
import { InvoiceScreen } from '../screens/invoice/InvoiceScreen';
import { CustomerDetailScreen } from '../screens/customers/CustomerDetailScreen';
import { NewCustomerScreen } from '../screens/customers/NewCustomerScreen';
import { NewVehicleScreen } from '../screens/vehicles/NewVehicleScreen';
import { ReferralScreen } from '../screens/settings/ReferralScreen';
import { ProfileScreen } from '../screens/settings/ProfileScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['meandmech://'],
  config: {
    screens: {
      JobCardDetail: 'jobs/:jobCardId',
      Invoice: 'invoices/:invoiceId',
      Referral: 'referral',
    },
  },
};

export function RootNavigator() {
  const { accessToken, hydrated } = useAuthStore();

  if (!hydrated) return null; // splash screen stays up (see App.tsx) until hydration completes

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!accessToken ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen name="JobCardDetail" component={JobCardDetailScreen} options={{ headerShown: true, title: 'Job Card' }} />
            <Stack.Screen name="NewJobCard" component={NewJobCardScreen} options={{ headerShown: true, title: 'புதிய Job' }} />
            <Stack.Screen name="Invoice" component={InvoiceScreen} options={{ headerShown: true, title: 'Invoice' }} />
            <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} options={{ headerShown: true, title: 'Customer' }} />
            <Stack.Screen name="NewCustomer" component={NewCustomerScreen} options={{ headerShown: true, title: 'புதிய Customer' }} />
            <Stack.Screen name="NewVehicle" component={NewVehicleScreen} options={{ headerShown: true, title: 'புதிய Vehicle' }} />
            <Stack.Screen name="Referral" component={ReferralScreen} options={{ headerShown: true, title: 'Referral' }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: true, title: 'Profile' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
