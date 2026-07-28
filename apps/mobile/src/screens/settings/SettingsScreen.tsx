import React from 'react';
import { StyleSheet, SafeAreaView, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { TamilText, Card } from '../../components';
import { Colors, Spacing } from '../../theme/tokens';
import { useWorkshop } from '../../api/hooks/useWorkshop';
import { logout } from '../../api/hooks/useAuth';

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: workshop } = useWorkshop();

  const menuItems = [
    { label: '👤 Profile', onPress: () => navigation.navigate('Profile') },
    { label: '🎁 Referral', onPress: () => navigation.navigate('Referral') },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TamilText variant="heading1" style={styles.title}>
          Settings
        </TamilText>

        <Card style={styles.workshopCard}>
          <TamilText variant="body1">{workshop?.shopName}</TamilText>
          <TamilText variant="caption" color={Colors.textSecondary}>
            {workshop?.city}
          </TamilText>
        </Card>

        {menuItems.map((item) => (
          <Pressable key={item.label} onPress={item.onPress}>
            <Card style={styles.menuItem}>
              <TamilText variant="body1">{item.label}</TamilText>
            </Card>
          </Pressable>
        ))}

        <Pressable onPress={() => logout()}>
          <Card style={styles.logoutItem}>
            <TamilText variant="body1" color={Colors.error}>
              🚪 Logout
            </TamilText>
          </Card>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  title: { marginBottom: Spacing.md },
  workshopCard: { marginBottom: Spacing.md, backgroundColor: '#FFF3E0' },
  menuItem: { marginBottom: Spacing.sm },
  logoutItem: { marginTop: Spacing.md },
});
