import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { usePaginatedQuery, useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id, Doc } from '@/convex/_generated/dataModel';
import { ThemedText } from '@/components/ThemedText'; // Assuming you have a ThemedText component

export default function ChatScreen() {
  const route = useRoute();
  const navigation = useNavigation();
 const user = useQuery(api.user.getCurrentUser)
  const { chatRoomId, otherUserName } = route.params as { chatRoomId: Id<"chatRooms">, otherUserName: string };

  const [newMessage, setNewMessage] = useState('');

  const { results: messages, status, loadMore } = usePaginatedQuery(
    api.chat.getMessages,
    { chatRoom_id: chatRoomId }, // Corrected argument key to snake_case
    { initialNumItems: 15 } // Options for pagination
  );

  const sendMessage = useMutation(api.chat.sendMessage);

  useEffect(() => {
    // Set the screen title to the other user's name
    navigation.setOptions({ title: otherUserName });
  }, [navigation, otherUserName]);

  const handleSend = async () => {
    if (newMessage.trim() === '' || !chatRoomId) return;
    try {
      await sendMessage({ chatRoom_id: chatRoomId, message: newMessage });
      setNewMessage(''); // Clear input after sending
    } catch (error) {
      console.error("Failed to send message:", error);
      // Handle error (e.g., show a message to the user)
    }
  };

  const renderMessageItem = ({ item }: { item: Doc<"messages"> }) => {
    const isCurrentUser = item.sender_id === user?.id;
    // Fallback image if sender_image is missing
    const imageUrl = item.sender_image || 'https://via.placeholder.com/40'; 

    return (
      <View style={[styles.messageRow, isCurrentUser ? styles.currentUserRow : styles.otherUserRow]}>
        {/* Image for the other user (on the left) */}
        {!isCurrentUser && (
          <Image source={{ uri: imageUrl }} style={styles.profileImage} />
        )}

        {/* Bubble containing text and time */}
        <View style={[styles.messageBubble, isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage]}>
            {!isCurrentUser && <ThemedText style={styles.senderName}>{item.sender_name}</ThemedText>} 
            <ThemedText style={styles.messageText}>{item.message}</ThemedText>
            <ThemedText style={styles.messageTime}>{new Date(item._creationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</ThemedText>
        </View>

        {/* Image for the current user (on the right) */}
        {isCurrentUser && (
            <Image source={{ uri: imageUrl }} style={styles.profileImage} />
        )}
      </View>
    );
  };

  const handleLoadMore = () => {
    if (status === 'CanLoadMore') {
        console.log("Loading more messages...");
      loadMore(10); // Load 10 more messages
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0} // Adjust offset as needed
    >
      {status === 'LoadingFirstPage' && (
        <ActivityIndicator size="large" color="#0000ff" style={styles.loadingIndicator} />
      )}
      <FlatList
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={(item) => item._id.toString()} // Use message ID as key
        style={styles.messageList}
        inverted // Start from the bottom
        onEndReached={handleLoadMore} // Load more when reaching the top (since it's inverted)
        onEndReachedThreshold={0.5} // How close to the top to trigger load more
        ListFooterComponent={status === 'LoadingMore' ? <ActivityIndicator size="small" color="#999" /> : null}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor="#aaa"
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <ThemedText style={styles.sendButtonText}>Send</ThemedText>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    flex: 1,
    paddingHorizontal: 10,
  },
  messageRow: { // New style for the entire row (image + bubble)
    flexDirection: 'row',
    alignItems: 'flex-end', // Align items to the bottom of the row
    marginVertical: 5,
  },
  currentUserRow: {
    justifyContent: 'flex-end', // Align content (bubble + image) to the right
  },
  otherUserRow: {
    justifyContent: 'flex-start', // Align content (image + bubble) to the left
  },
  profileImage: { // Style for the profile image
    width: 40,
    height: 40,
    borderRadius: 20,
    marginHorizontal: 8, // Spacing between image and bubble
    marginBottom: 5, // Align with bottom of bubble slightly better
  },
  messageBubble: {
    maxWidth: '75%', // Adjust max width to accommodate image
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 15,
    // Removed marginVertical as it's handled by messageRow
    // Removed alignSelf as it's handled by messageRow justifycontent
  },
  currentUserMessage: {
    backgroundColor: '#DCF8C6',
    borderBottomRightRadius: 0,
    // No alignSelf needed
  },
  otherUserMessage: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 0,
    // No alignSelf needed
  },
  senderName: { 
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#555',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  messageTime: {
      fontSize: 10,
      color: '#888',
      alignSelf: 'flex-end',
      marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 15,
    marginRight: 10,
    backgroundColor: '#f9f9f9',
  },
  sendButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#007AFF', // iOS blue
    borderRadius: 20,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

