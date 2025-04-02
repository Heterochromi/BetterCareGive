import React, { useState, useCallback } from 'react';
import { Calendar } from '@/components/Calendar';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PatientsList } from '@/components/PatientsList';
import { Doc, Id } from "@/convex/_generated/dataModel";
import { useFocusEffect } from '@react-navigation/native'; // Import useFocusEffect

// Define the simplified Patient type expected from PatientsList
type Patient = {
  id: Id<"users">;
  name: string;
  email?: string;
  image?: string;
};

export default function Planner() {
  const currentUser = useQuery(api.user.getCurrentUser);
  const createEvent = useMutation(api.events.create);
  const deleteEvent = useMutation(api.events.deleteEvent);

  const [selectedPatient, setSelectedPatient] = useState<Patient | undefined | null>(null);

  // Reset selected patient when the screen focuses
  useFocusEffect(
    useCallback(() => {
      // Only reset if the user is a caregiver
      if (currentUser?.role === 'caregiver') {
        setSelectedPatient(null);
        console.log('Planner focused, resetting selected patient for caregiver.');
      }
      // Optional: Add cleanup logic if needed when the screen goes out of focus
      return () => {
      };
    }, [currentUser]) // Dependency array includes currentUser to re-run if user changes
  );

  // Determine the patientID for the events query
  // If caregiver, use selectedPatient's ID. If patient, use undefined (query handles fetching own events)
  const patientIdForQuery = 
    currentUser?.role === "caregiver" 
      ? selectedPatient?.id // Fetch for selected patient if caregiver
      : undefined;          // Fetch own events if patient (or if caregiver hasn't selected)

  // Fetch events based on the determined patientID.
  // The query will skip if patientIdForQuery is null/undefined when caregiver hasn't selected yet.
  const allEvents = useQuery(
    api.events.list,
    currentUser?.role === 'caregiver' 
      ? (patientIdForQuery ? { patientID: patientIdForQuery } : "skip") // Skip if caregiver hasn't selected
      : {} // Patient fetches own events
  ) || [];

  // Loading state
  if (currentUser === undefined) {
    return (
      <View style={styles.centered}> 
        <ActivityIndicator size="large" color="#50cebb" />
      </View>
    );
  }

  // Handle case where user data is loaded but might be null (e.g., not logged in properly)
  if (currentUser === null) {
      // Optionally show a login prompt or error message
      return <View style={styles.centered}><Text>Please log in.</Text></View>; 
  }

  // --- Rendering Logic --- 

  const shouldShowPatientList = currentUser.role === "caregiver" && !selectedPatient;
  const calendarPatient = currentUser.role === "caregiver" ? selectedPatient : null;

  if (shouldShowPatientList) {
    // Caregiver needs to select a patient
    return (
      <PatientsList 
        onPatientSelect={(patient: Patient) => {
          console.log('Selected patient:', patient);
          setSelectedPatient(patient);
        }}
      />
    );
  } else {
    // Show Calendar for Patient or Caregiver (if patient is selected)
    return (
      <>
      {currentUser.role === "caregiver" && selectedPatient && (
        <TouchableOpacity 
          onPress={() => setSelectedPatient(null)} 
          style={{ padding: 10, backgroundColor: '#f0f0f0', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#ccc' }}
        >
          <Text style={{ color: '#007AFF' }}>← Back to Patients List</Text>
        </TouchableOpacity>
      )}
      <Calendar 
        currentUser={currentUser} 
        createEvent={createEvent} 
        deleteEvent={deleteEvent}
        allEvents={allEvents} 
        patient={calendarPatient} // Pass null for patient, selectedPatient for caregiver
      />
      </>
    );
  }

  // Fallback logic is implicitly handled now by the conditions above, 
  // but keeping an explicit fallback might be safer depending on requirements.
  // If currentUser role could be something else, add it here.
  // return <View style={styles.centered}><Text>Unable to load planner.</Text></View>;
} 

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
}); 