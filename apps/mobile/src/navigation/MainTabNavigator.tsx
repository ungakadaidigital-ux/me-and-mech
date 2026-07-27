import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import type { MainTabParamList } from './types';
import { Colors } from '../theme/tokens';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { JobListScreen } from '../screens/jobs/JobListScreen';
import { VoiceBillingScreen } from '../screens/voice/VoiceBillingScreen';
import { ReportsScreen } from '../screens/dashboard/ReportsScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Simple emoji icons rather than an icon font/library — keeps this module
// dependency-light; swap for a proper icon set (e.g. @expo/vector-icons,
// already ships with Expo) at the design-polish pass.
const TAB_ICONS: Record<keyof MainTabParamList, string> = {
  Dashboard: '🏠',
  Jobs: '🔧',
  Voice: '🎙️',
  Reports: '📊',
  Settings: '⚙️',
};

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarIcon: () => <Text style={{ fontSize: 20 }}>{TAB_ICONS[route.name]}</Text>,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: 'முகப்பு' }} />
      <Tab.Screen name="Jobs" component={JobListScreen} options={{ tabBarLabel: 'Jobs' }} />
      <Tab.Screen name="Voice" component={VoiceBillingScreen} options={{ tabBarLabel: 'குரல்' }} />
      <Tab.Screen name="Reports" component={ReportsScreen} options={{ tabBarLabel: 'Reports' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: 'Settings' }} />
    </Tab.Navigator>
  );
}
