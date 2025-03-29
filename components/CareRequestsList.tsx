import React from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity, Alert } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

// Define a type for caregiver requests
type CaregiverRequest = {
  requestId: Id<"activeCareGiverRequests">;
  caregiverId: string;
  caregiverName: string;
  caregiverImage?: string;
  caregiverEmail?: string;
};

export const CareRequestsList = () => {
  const requests = useQuery(api.user.getPatientCareRequests) || [];
  const acceptRequest = useMutation(api.user.acceptCaregiverRequest);
  const rejectRequest = useMutation(api.user.rejectCaregiverRequest);

  const handleAccept = async (requestId: Id<"activeCareGiverRequests">) => {
    try {
      await acceptRequest({ requestId });
      Alert.alert("Success", "Caregiver request accepted");
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to accept request");
    }
  };

  const handleReject = async (requestId: Id<"activeCareGiverRequests">) => {
    try {
      await rejectRequest({ requestId });
      Alert.alert("Success", "Caregiver request rejected");
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to reject request");
    }
  };

  if (requests.length === 0) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>
          You don't have any pending caregiver requests
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Pending Care Requests</ThemedText>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.requestId.toString()}
        renderItem={({ item }) => (
          <ThemedView style={styles.requestCard}>
            <View style={styles.caregiverInfo}>
              <Image 
                source={{ uri: item.caregiverImage || 'https://via.placeholder.com/50' }} 
                style={styles.caregiverImage} 
              />
              <View style={styles.textContainer}>
                <ThemedText style={styles.caregiverName}>{item.caregiverName}</ThemedText>
                {item.caregiverEmail && (
                  <ThemedText style={styles.caregiverEmail}>{item.caregiverEmail}</ThemedText>
                )}
              </View>
            </View>
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleReject(item.requestId)}
              >
                <ThemedText style={styles.buttonText}>Reject</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => handleAccept(item.requestId)}
              >
                <ThemedText style={styles.buttonText}>Accept</ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        )}
        contentContainerStyle={styles.listContent}
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  requestCard: {
    padding: 12,
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  caregiverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  caregiverImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  caregiverName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  caregiverEmail: {
    fontSize: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginLeft: 8,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F8F8F8',
    marginVertical: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
}); 