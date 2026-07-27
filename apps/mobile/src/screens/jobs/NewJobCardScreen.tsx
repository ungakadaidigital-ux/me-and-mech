import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { TamilText, Button, TextField, Card } from '../../components';
import { Colors, Spacing } from '../../theme/tokens';
import { useCreateJobCard } from '../../api/hooks/useJobCards';

interface LineItemDraft {
  item_type: 'labour' | 'part';
  description: string;
  quantity: string;
  rate: string;
}

/**
 * PKG-043 — this screen assumes customer_id/vehicle_id are already
 * selected (via route params, e.g. arriving from CustomerDetailScreen, or
 * from the Voice Billing pre-fill flow). A dedicated "pick or create
 * customer/vehicle inline" sub-flow is a reasonable Part-7-polish addition
 * but not blocking for a reviewable MVP screen — flagging the gap rather
 * than faking a selector with mock data.
 */
export function NewJobCardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const { customerId, vehicleId } = route.params ?? {};

  const [jobType, setJobType] = useState('');
  const [items, setItems] = useState<LineItemDraft[]>([{ item_type: 'labour', description: '', quantity: '1', rate: '' }]);
  const [error, setError] = useState<string | undefined>();
  const createJobCard = useCreateJobCard();

  const updateItem = (index: number, patch: Partial<LineItemDraft>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const addItem = () => setItems((prev) => [...prev, { item_type: 'labour', description: '', quantity: '1', rate: '' }]);

  const handleSave = async () => {
    setError(undefined);
    if (!customerId || !vehicleId) {
      setError('Customer மற்றும் Vehicle தேர்வு செய்யவும்');
      return;
    }
    if (!jobType.trim()) {
      setError('Job type-ஐ உள்ளிடவும்');
      return;
    }
    const validItems = items.filter((it) => it.description.trim() && it.rate.trim());
    if (validItems.length === 0) {
      setError('குறைந்தபட்சம் ஒரு item வேண்டும்');
      return;
    }

    try {
      const jobCard = await createJobCard.mutateAsync({
        customer_id: customerId,
        vehicle_id: vehicleId,
        job_type: jobType.trim(),
        items: validItems.map((it) => ({ item_type: it.item_type, description: it.description.trim(), quantity: Number(it.quantity) || 1, rate: it.rate.trim() })),
      });
      navigation.replace('JobCardDetail', { jobCardId: jobCard.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Job card உருவாக்க முடியவில்லை');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TextField label="Job Type" value={jobType} onChangeText={setJobType} placeholder="General Service" />

        <TamilText variant="heading2" style={styles.sectionTitle}>
          Items
        </TamilText>
        {items.map((item, index) => (
          <Card key={index} style={styles.itemCard}>
            <TextField label="விவரம்" value={item.description} onChangeText={(t) => updateItem(index, { description: t })} placeholder="Engine oil change" />
            <View style={styles.itemRow}>
              <View style={styles.itemRowField}>
                <TextField label="எண்ணிக்கை" value={item.quantity} onChangeText={(t) => updateItem(index, { quantity: t })} keyboardType="numeric" />
              </View>
              <View style={styles.itemRowField}>
                <TextField label="விலை (₹)" value={item.rate} onChangeText={(t) => updateItem(index, { rate: t })} keyboardType="numeric" />
              </View>
            </View>
          </Card>
        ))}
        <Button label="+ இன்னொரு Item" onPress={addItem} variant="ghost" style={styles.addItemButton} />

        {error ? (
          <TamilText variant="body2" color={Colors.error} style={styles.error}>
            {error}
          </TamilText>
        ) : null}

        <Button label="Job Card சேமி" onPress={handleSave} loading={createJobCard.isPending} fullWidth />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  sectionTitle: { marginVertical: Spacing.sm },
  itemCard: { marginBottom: Spacing.sm },
  itemRow: { flexDirection: 'row', gap: Spacing.sm },
  itemRowField: { flex: 1 },
  addItemButton: { marginBottom: Spacing.md },
  error: { marginBottom: Spacing.md },
});
