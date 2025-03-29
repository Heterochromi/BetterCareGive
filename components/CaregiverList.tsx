import React from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

// Define a type for caregiver
type Caregiver = {
  id: Id<"users">;
  name: string;
  email?: string;
  image?: string;
};

type CaregiverListProps = {
  onCaregiverSelect?: (caregiver: Caregiver) => void;
};

export const CaregiverList = ({ onCaregiverSelect }: CaregiverListProps) => {
  const caregiversData = useQuery(api.user.getPatientCaregivers);
  const caregivers = caregiversData || [];

  if (!caregivers || caregivers.length === 0) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>
          You don't have any caregivers yet
        </ThemedText>
      </ThemedView>
    );
  }

  // Map data to our Caregiver type to avoid TypeScript issues
  const simplifiedCaregivers: Caregiver[] = caregivers
    .filter((caregiver): caregiver is NonNullable<typeof caregiver> => caregiver !== null)
    .map(caregiver => ({
      id: caregiver.id,
      name: caregiver.name,
      email: caregiver.email,
      image: caregiver.image
    }));

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Your Care-givers</ThemedText>
      <FlatList
        data={simplifiedCaregivers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.caregiverCard}
            // onPress={() => onCaregiverSelect && onCaregiverSelect(item)}
          >
            <Image 
              source={{ uri: item.image || 'https://via.placeholder.com/50' }} 
              style={styles.caregiverImage} 
            />
            <View style={styles.caregiverInfo}>
              <ThemedText style={styles.caregiverName}>{item.name}</ThemedText>
              {item.email && (
                <ThemedText style={styles.caregiverEmail}>{item.email}</ThemedText>
              )}
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  emptyContainer: {
    marginTop: 20,
    width: '100%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  caregiverCard: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    alignItems: 'center',
  },
  caregiverImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  caregiverInfo: {
    flex: 1,
  },
  caregiverName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  caregiverEmail: {
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    flexGrow: 1,
  },
}); 