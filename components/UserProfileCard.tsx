import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import Separator from './Seperator';
import { useAuthActions } from "@convex-dev/auth/react";
type UserProfileCardProps = {
  name?: string;
  image?: string;
  role?: "caregiver" | "patient";
  email?: string;
};

export const UserProfileCard = ({
  name,
  image,
  role,
  email,
}: UserProfileCardProps) => {
    const { signOut } = useAuthActions();

  // Default image if none provided
  const profileImage = image || 'https://via.placeholder.com/150';
  
  return (
    <ThemedView style={styles.card}>
      <View style={styles.header}>
        <Image
          source={{ uri: profileImage }}
          style={styles.profileImage}
        />
        <View style={styles.headerText}>
          <ThemedText style={styles.name}>{name || 'User'}</ThemedText>
          {role && (
            <View style={styles.roleContainer}>
              <ThemedText style={styles.roleText}>
               {role === 'caregiver' ? 'Care-Giver' : 'Patient'}
              </ThemedText>
            </View>
          )}
        </View>
      </View>
      
      <Separator />
      
      <View style={styles.infoSection}>
        {email && (
          <View style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>Email:</ThemedText>
            <ThemedText style={styles.infoValue}>{email}</ThemedText>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <ThemedText style={styles.signOutText}>Sign Out</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginVertical: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  roleContainer: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  infoSection: {
    marginTop: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    width: 80,
  },
  infoValue: {
    fontSize: 16,
    flex: 1,
  },
  signOutButton: {
    backgroundColor: '#E53935',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  signOutText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 