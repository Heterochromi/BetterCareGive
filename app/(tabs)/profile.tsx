import React from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import { useAuth, useUser, SignOutButton } from '@clerk/clerk-react';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { user } = useUser();
  const { isSignedIn } = useAuth();

  if (!isSignedIn || !user) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Not signed in</Text>
        <Button 
          title="Sign In" 
          onPress={() => router.push('/sign-in')} 
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.email}>{user.primaryEmailAddress?.emailAddress}</Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{user.fullName || 'Not set'}</Text>
        
        <Text style={styles.label}>Username</Text>
        <Text style={styles.value}>{user.username || 'Not set'}</Text>
      </View>

      <SignOutButton>
        <Button
          title="Sign Out"
          color="red"
          onPress={() => {
            Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', style: 'destructive' }
            ]);
          }}
        />
      </SignOutButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  email: {
    fontSize: 16,
    color: '#666',
  },
  infoSection: {
    marginBottom: 40,
  },
  label: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  value: {
    fontSize: 18,
    marginBottom: 20,
  },
  text: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
});
