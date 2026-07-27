import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from './types';
import { PhoneEntryScreen } from '../screens/auth/PhoneEntryScreen';
import { OtpVerifyScreen } from '../screens/auth/OtpVerifyScreen';
import { WorkshopRegistrationScreen } from '../screens/auth/WorkshopRegistrationScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PhoneEntry" component={PhoneEntryScreen} />
      <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} />
      <Stack.Screen name="WorkshopRegistration" component={WorkshopRegistrationScreen} />
    </Stack.Navigator>
  );
}
