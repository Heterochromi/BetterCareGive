import React from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity, ScrollView } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from "@/convex/_generated/dataModel";
import useAgoraCall from '@/hooks/useAgoraCall';
import { useNavigation } from '@react-navigation/native';

// Define a type for patient (adjust fields as needed)
interface Patient {
  _id: Id<"users">;
  name?: string;
  email?: string;
  image?: string;
  role?: string;
  // Add other fields as necessary
}

type PatientsListProps = {
  onPatientSelect?: (patient: Patient) => void;
  callMode?: boolean;
};

export const PatientsList = ({ onPatientSelect, callMode = false }: PatientsListProps) => {
  const patients = useQuery(api.user.getCaregiverPatients);
  const navigation = useNavigation<any>();
  const getOrCreateChatRoom = useMutation(api.chat.getOrCreateChatRoom);
  const {createCall} = useAgoraCall();

  const handleChatPress = async (patient: Patient) => {
    try {
      const chatRoomId = await getOrCreateChatRoom({ otherUserId: patient._id });
      if (chatRoomId) {
        navigation.navigate('chatScreen', {
          chatRoomId: chatRoomId,
          otherUserName: patient.name ?? 'Patient'
        });
      } else {
        console.error("Failed to get or create chat room.");
      }
    } catch (error) {
      console.error("Error initiating chat:", error);
    }
  };

  // Process patients data: filter nulls and map to Patient interface
  const processedPatients: Patient[] = (patients || [])
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .map(p => ({
        _id: p.id, // Map id to _id
        name: p.name,
        email: p.email,
        image: p.image,
        // Add other fields if needed from the query result
    }));

  if (!patients || patients.length === 0) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>
          You haven't added any patients yet
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Your Patients</ThemedText>
      <ScrollView contentContainerStyle={styles.listContent}>
        {processedPatients.map((item) => (
          <TouchableOpacity
            key={item._id.toString()}
            disabled={callMode}
            style={styles.patientCard}
            onPress={() => !callMode && onPatientSelect && onPatientSelect(item)}
          >
            <Image
              source={{ uri: item.image || 'https://via.placeholder.com/50' }}
              style={styles.patientImage}
            />
            <View style={styles.patientInfo}>
              <ThemedText style={styles.patientName}>{item.name}</ThemedText>
              {item.email && (
                <ThemedText style={styles.patientEmail}>{item.email}</ThemedText>
              )}
            </View>
            {callMode && (
              <TouchableOpacity style={styles.callButton} onPress={() => createCall(item._id)}>
                <ThemedText style={styles.callButtonText}>Call</ThemedText>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.callButton} onPress={() => handleChatPress(item)}>
              <ThemedText style={styles.callButtonText}>Chat</ThemedText>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  patientImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  patientEmail: {
    fontSize: 14,
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
  callButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 4,
    marginLeft: 12,
  },
  callButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
}); 