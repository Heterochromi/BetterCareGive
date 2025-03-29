import React, { useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Dimensions, Modal, Pressable } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import Separator from './Seperator';
import { useAuthActions } from "@convex-dev/auth/react";

export const Profile = () => {
  const profile = useQuery(api.user.getCurrentUser);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { signOut } = useAuthActions();

  // Calculate size based on screen width (5% of screen width)
  const screenWidth = Dimensions.get('window').width;
  const size = screenWidth * 0.07;

  return (
    <View style={styles.wrapper}>
      {/* <TouchableOpacity onPress={() => setIsDropdownOpen(!isDropdownOpen)}> */}
        <View style={[styles.container, { 
          width: size, 
          height: size, 
          borderRadius: size / 2 
        }]}>
          <Image 
            style={[styles.image, { 
              width: size, 
              height: size, 
              borderRadius: size / 2 
            }]} 
            source={{ uri: profile?.image }}
            resizeMode="cover"
          />
        </View>
      {/* </TouchableOpacity> */}
      
      <Modal
        visible={isDropdownOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDropdownOpen(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setIsDropdownOpen(false)}
        >
          <Pressable 
            style={styles.dropdownContainer}
            onPress={(e) => e.stopPropagation()}
          >
            <ThemedView style={styles.dropdown}>
              <ThemedText style={styles.txt}>Profile Settings</ThemedText>
              <Separator/>
              <TouchableOpacity onPress={() => signOut()}>
              <ThemedText style={styles.txt}>Logout</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    // position: 'relative',
  },
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E1E1E1', // Light gray background for placeholder
  },
  image: {
    alignSelf: 'center',
  },
  txt:{
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdownContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
  },
  dropdown: {
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 150,
  },
});
