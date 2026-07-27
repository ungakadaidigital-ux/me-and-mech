import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, FlatList, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { TamilText, Button, Card, StatusBadge, LoadingSkeleton } from '../../components';
import { Colors, Spacing } from '../../theme/tokens';
import { useJobCards } from '../../api/hooks/useJobCards';
import type { JobCard } from '@me-and-mech/shared';

export function JobListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data, isLoading } = useJobCards();
  const [filter, setFilter] = useState<'all' | JobCard['status']>('all');

  const filtered = data?.items.filter((j) => filter === 'all' || j.status === filter) ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TamilText variant="heading1">Job Cards</TamilText>
        <Button label="+ புதிது" onPress={() => navigation.navigate('NewJobCard')} />
      </View>

      <View style={styles.filterRow}>
        {(['all', 'draft', 'in_progress', 'invoiced', 'paid'] as const).map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={[styles.filterChip, filter === f && styles.filterChipActive]}>
            <TamilText variant="caption" color={filter === f ? '#FFFFFF' : Colors.textSecondary}>
              {f === 'all' ? 'அனைத்தும்' : f}
            </TamilText>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.content}>
          <LoadingSkeleton width="100%" height={80} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          renderItem={({ item }) => (
            <Pressable onPress={() => navigation.navigate('JobCardDetail', { jobCardId: item.id })}>
              <Card style={styles.jobCard}>
                <View style={styles.jobCardRow}>
                  <TamilText variant="body1">{item.jobType}</TamilText>
                  <StatusBadge status={item.status} />
                </View>
              </Card>
            </Pressable>
          )}
          ListEmptyComponent={
            <TamilText variant="body2" color={Colors.textSecondary} style={styles.empty}>
              இன்னும் job cards இல்லை
            </TamilText>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md },
  filterRow: { flexDirection: 'row', gap: Spacing.xs, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm, flexWrap: 'wrap' },
  filterChip: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm, borderRadius: 999, backgroundColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primary },
  content: { padding: Spacing.md },
  jobCard: { marginBottom: Spacing.sm },
  jobCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  empty: { textAlign: 'center', marginTop: Spacing.xl },
});
