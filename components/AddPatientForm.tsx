import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

type AddPatientFormProps = {
  onSuccess?: (patientName: string) => void;
};

export const AddPatientForm = ({ onSuccess }: AddPatientFormProps) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const addPatient = useMutation(api.user.addPatientByEmail);
  
  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await addPatient({ patientEmail: email.trim() });
      setEmail('');
      Alert.alert('Success', `${result.patientName || 'Patient'} has been added to your care list.`);
      if (onSuccess) {
        onSuccess(result.patientName || 'Patient');
      }
    } catch (error) {
        Alert.alert('Error', 'Please make sure the email you entered is already registered as a patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoid}
    >
      <ThemedView style={styles.container}>
        <ThemedText style={styles.title}>Add Patient to Your Care</ThemedText>
        <ThemedText style={styles.subtitle}>
          Enter your patient's email address to add them to your care list
        </ThemedText>
        
        <TextInput
          style={styles.input}
          placeholder="Patient's Email Address"
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isSubmitting}
        />
        
        <TouchableOpacity 
          style={[styles.button, !email.trim() && styles.buttonDisabled]} 
          onPress={handleSubmit}
          disabled={!email.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <ThemedText style={styles.buttonText}>Add Patient</ThemedText>
          )}
        </TouchableOpacity>
      </ThemedView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    width: '100%',
  },
  container: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
    color: '#666',
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#A0C3E8',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
}); 