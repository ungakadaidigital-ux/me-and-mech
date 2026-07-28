import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { TamilText, Button, TextField, Card } from '../../components';
import { Colors, Spacing } from '../../theme/tokens';
import { useWorkshop, useUpdateWorkshop } from '../../api/hooks/useWorkshop';

export function ProfileScreen() {
  const { data: workshop } = useWorkshop();
  const updateWorkshop = useUpdateWorkshop();
  const [shopName, setShopName] = useState('');
  const [address, setAddress] = useState('');
  const [upiId, setUpiId] = useState('');

  useEffect(() => {
    if (workshop) {
      setShopName(workshop.shopName);
      setAddress(workshop.address ?? '');
      setUpiId(workshop.upiId ?? '');
    }
  }, [workshop]);

  const handleSave = () => {
    updateWorkshop.mutate({ shop_name: shopName, address, upi_id: upiId });
  };

  // Locked rule: server-controlled via offer_shown flag — never shows
  // twice, even after app reinstall (the flag lives on the workshop
  // record, not local device storage).
  const showOneTimeOffer = workshop?.subscriptionStatus === 'trial' && !workshop?.offerShown;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {showOneTimeOffer && (
          <Card style={styles.offerCard}>
            <TamilText variant="body1" color="#FFFFFF">
              🎁 1 மாதம் இலவசம் — இந்த offer உங்களுக்கு மட்டுமே
            </TamilText>
          </Card>
        )}

        <TextField label="கடை பெயர்" value={shopName} onChangeText={setShopName} />
        <TextField label="முகவரி" value={address} onChangeText={setAddress} multiline />
        <TextField label="UPI ID" value={upiId} onChangeText={setUpiId} placeholder="yourname@upi" />

        <Button label="சேமி" onPress={handleSave} loading={updateWorkshop.isPending} fullWidth />

        <View style={styles.subscriptionInfo}>
          <TamilText variant="caption" color={Colors.textSecondary}>
            Subscription: {workshop?.subscriptionStatus}
          </TamilText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  offerCard: { backgroundColor: Colors.primary, marginBottom: Spacing.md, alignItems: 'center' },
  subscriptionInfo: { marginTop: Spacing.md, alignItems: 'center' },
});
