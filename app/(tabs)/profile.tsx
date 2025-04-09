import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import {
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Button,
} from "react-native";
import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { UserProfileCard } from "@/components/UserProfileCard";
import { AddPatientForm } from "@/components/AddPatientForm";
import { PatientsList } from "@/components/PatientsList";
import { CareRequestsList } from "@/components/CareRequestsList";
import { CaregiverList } from '@/components/CaregiverList';
import { VoiceCalls } from "@/components/VoiceCalls";
import { HelpNotificationSettings } from '@/components/HelpNotificationSettings';

export default function Profile() {
  const [userType, setUserType] = useState<"caregiver" | "patient" | null>(
    null
  );
  const profile = useQuery(api.user.getCurrentUser);

  const setRole = useMutation(api.user.pickRole);

  const dispatchAgent = useAction(api.dispatcher.createDispatch);

  const handleConfirm = async (type: "caregiver" | "patient") => {
    await setRole({ role: type });
    setUserType(type);
  };

  const handleSelectUserType = (type: "caregiver" | "patient") => {
    setUserType(type);
  };

  // Render onboarding flow for role selection
  if (profile?.role === undefined) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <ThemedText style={styles.title}>
            Welcome to Better CareGive
          </ThemedText>
          {!userType ? (
            <View style={styles.selectionContainer}>
              <ThemedText style={styles.selectionTitle}>I am a:</ThemedText>
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.selectionButton}
                  onPress={() => handleSelectUserType("patient")}
                >
                  <ThemedText style={styles.buttonText}>Patient</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.selectionButton}
                  onPress={() => handleSelectUserType("caregiver")}
                >
                  <ThemedText style={styles.buttonText}>Care-Giver</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.resultContainer}>
              <ThemedText style={styles.resultText}>
                Register as:
                <Text style={styles.userType}>
                  {userType.charAt(0).toUpperCase() + userType.slice(1)}
                </Text>
              </ThemedText>
              <ThemedView style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={() => setUserType(null)}
                >
                  <ThemedText style={styles.resetButtonText}>
                    Change Role
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.selectionButton}
                  onPress={() => handleConfirm(userType)}
                >
                  <ThemedText style={styles.buttonText}>
                    Confirm Role
                  </ThemedText>
                </TouchableOpacity>
              </ThemedView>
            </View>
          )}
        </ScrollView>
      </ThemedView>
    );
  }

  // Render patient dashboard
  if (profile?.role === "patient") {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <UserProfileCard 
            name={profile.name}
            image={profile.image}
            role={profile.role}
            email={profile.email}
          />
          <Button title="Asistant" onPress={() => {
            dispatchAgent({
              metadata: {
                role: "patient",
              }
            })
          }}/>
          
          <CaregiverList 
            onCaregiverSelect={(caregiver) => {
              console.log('Selected caregiver:', caregiver);
            }}
          />
                  
          <CareRequestsList />

          {profile.id && (
             <HelpNotificationSettings patientId={profile.id} />
          )}
        </ScrollView>
      </ThemedView>
    );
  }

  // Render caregiver dashboard
  if (profile?.role === "caregiver") {
    return (
      <ThemedView style={styles.container}>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          <UserProfileCard 
            name={profile.name}
            image={profile.image}
            role={profile.role}
            email={profile.email}
          />
          
          <AddPatientForm 
            onSuccess={() => {
            }}
          />
          
          <PatientsList 
            onPatientSelect={(patient) => {
              console.log('Selected patient:', patient);
            }}
            callMode={true}
            enableChat={true}
          />
        </ScrollView>
      </ThemedView>
    );
  }

  // Fallback case
  return (
    <ThemedView style={styles.container}>
      <ThemedText>Loading...</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 40,
    textAlign: "center",
  },
  selectionContainer: {
    width: "100%",
    alignItems: "center",
  },
  selectionTitle: {
    fontSize: 18,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  selectionButton: {
    backgroundColor: "#4A90E2",
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    // fontSize: 16,
    // fontWeight: '600',
  },
  resultContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  resultText: {
    fontSize: 18,
    marginBottom: 20,
  },
  userType: {
    fontWeight: "bold",
    color: "#4A90E2",
  },
  resetButton: {
    backgroundColor: "#E2E2E2",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  resetButtonText: {
    color: "#333",
  },
  confirmButton: {
    backgroundColor: "#4A90E2",
    fontSize: 14,
  },
  profileContainer: {
    width: "100%",
    flex: 1,
  },
  profileContent: {
    paddingBottom: 100, // Leave space for the logout button
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },

  logoutContainer: {
    width: '100%',
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 200,
  },
  logoutButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  dashboardTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  infoBox: {
    backgroundColor: "#E2E2E2",
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    color: "#333",
  },
});
