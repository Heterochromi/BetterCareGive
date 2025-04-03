import React from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity, ScrollView } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from "@/convex/_generated/dataModel";
import useAgoraCall from '@/hooks/useAgoraCall';

// Define a minimal type for patients
type Patient = {
  id: Id<"users">;
  name: string;
  email?: string;
  image?: string;
};

type PatientsListProps = {
  onPatientSelect?: (patient: Patient) => void;
  callMode?: boolean;
};

export const PatientsList = ({ onPatientSelect, callMode = false }: PatientsListProps) => {
  const patientsData = useQuery(api.user.getCaregiverPatients);
  const patients = patientsData || [];
  const {createCall} = useAgoraCall();



  if (!patients || patients.length === 0) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>
          You haven't added any patients yet
        </ThemedText>
      </ThemedView>
    );
  }

  // Map data to our simpler Patient type to avoid TypeScript issues
  const simplifiedPatients: Patient[] = patients
    .filter((patient): patient is NonNullable<typeof patient> => patient !== null)
    .map(patient => ({
      id: patient.id,
      name: patient.name,
      email: patient.email,
      image: patient.image
    }));

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Your Patients</ThemedText>
      <ScrollView contentContainerStyle={styles.listContent}>
        {simplifiedPatients.map((item) => (
          <TouchableOpacity
            disabled={callMode}
            key={item.id.toString()}
            style={styles.patientCard}
            onPress={() => onPatientSelect && onPatientSelect(item)}
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
              <TouchableOpacity style={styles.callButton} onPress={() => {
                createCall(item.id)
              }}><ThemedText style={styles.callButtonText}>Call</ThemedText></TouchableOpacity>
            )}
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
}); 