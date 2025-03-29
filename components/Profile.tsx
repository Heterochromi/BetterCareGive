import React, { useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Dimensions, Modal, Pressable } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Collapsible } from './Collapsible';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

export const Profile = () => {
  const profile = useQuery(api.user.getCurrentUser);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Calculate size based on screen width (5% of screen width)
  const screenWidth = Dimensions.get('window').width;
  const size = screenWidth * 0.12;

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity onPress={() => setIsDropdownOpen(!isDropdownOpen)}>
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
      </TouchableOpacity>
      
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
              <ThemedText>Profile Settings</ThemedText>
              <ThemedText>Logout</ThemedText>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
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
