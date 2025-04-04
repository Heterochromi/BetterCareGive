import React, { useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  Button,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableOpacity,
} from 'react-native';
import { Doc } from '@/convex/_generated/dataModel'; // Assuming dataModel is correctly generated

interface CallModalProps {
  visible: boolean;
  callDetails: Doc<'onGoingCalls'> | null | undefined; // Can be null or undefined while loading/no call
  isCurrentUserCaller: boolean;
  onAccept: () => void;
  onRejectOrCancel: () => void; // Used for Reject, Cancel, and End Call
}

const CallModal: React.FC<CallModalProps> = ({
  visible,
  callDetails,
  isCurrentUserCaller,
  onAccept,
  onRejectOrCancel,
}) => {
  // Determine if the call is active (both parties joined)
  const isActiveCall = !!callDetails?.isCallerJoined && !!callDetails?.isReceiverJoined;

  // --- PanResponder Setup ---
  const pan = useRef(new Animated.ValueXY()).current; // Initial position
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true, // Allow dragging
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value, // Get current value before dragging
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 }); // Reset value for delta calculation
      },
      onPanResponderMove: Animated.event(
        [
          null, // ignore native event
          { dx: pan.x, dy: pan.y }, // map gesture delta to pan.x, pan.y
        ],
        { useNativeDriver: false } // Essential for layout updates
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset(); // Merge offset back into value
        // Optional: Add snapping logic here if needed
      },
    })
  ).current;
  // --- End PanResponder Setup ---

  const getOtherPartyDetails = () => {
    if (!callDetails) return { name: 'Unknown', image: undefined };
    return isCurrentUserCaller
      ? { name: callDetails.receiver_name, image: callDetails.receiver_image }
      : { name: callDetails.caller_name, image: callDetails.caller_image };
  };

  const { name, image } = getOtherPartyDetails();
  const defaultImage = 'https://via.placeholder.com/100'; // Placeholder image

  const renderRingingContent = () => {
    // Determine call status text
    const statusText = isCurrentUserCaller ? 'Calling...' : 'Incoming Call';

    return (
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.statusText}>{statusText}</Text>
          <Image
            source={{ uri: image || defaultImage }}
            style={styles.profileImage}
            resizeMode="cover"
          />
          <Text style={styles.nameText}>{name}</Text>

          {isCurrentUserCaller ? (
            <View style={styles.buttonContainer}>
               {/* Caller only sees Cancel */}
               <Button title="Cancel" onPress={onRejectOrCancel} color="red" />
            </View>
          ) : (
            <View style={styles.buttonContainer}>
              {/* Receiver sees Accept/Reject */}
               <View style={styles.buttonWrapper}>
                 <Button title="Reject" onPress={onRejectOrCancel} color="red" />
               </View>
               <View style={styles.buttonWrapper}>
                 <Button title="Accept" onPress={onAccept} color="green" />
               </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderActiveCallContent = () => {
    // Use Animated.View and apply panHandlers and transform
    return (
      <Animated.View
        style={[
          styles.floatingView, // Base styles for the floating box
          {
            transform: [{ translateX: pan.x }, { translateY: pan.y }], // Apply position changes
          },
        ]}
        {...panResponder.panHandlers} // Attach gesture handlers
      >
        <Image
          source={{ uri: image ?? defaultImage }}
          style={styles.floatingImage}
          resizeMode="cover"
        />
        <TouchableOpacity style={styles.endCallButton}  onPressIn={onRejectOrCancel}>
          <Text style={styles.endCallButtonText}>End Call</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // When active, we render the draggable view *without* the modal's centering/background view
  // When ringing, we render inside the standard modal structure
  if (visible && isActiveCall) {
      // Render only the draggable component, absolutely positioned
      return renderActiveCallContent();
  }

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible && !!callDetails && !isActiveCall} // Show modal only when ringing/calling
      onRequestClose={() => {
         // Prevent closing via back button during ringing
      }}
    >
      {/* Render ringing content inside the modal structure */}
      {renderRingingContent()}
    </Modal>
  );
};

const styles = StyleSheet.create({
  // --- Ringing/Calling Modal Styles ---
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%', // Adjust width as needed
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
    backgroundColor: '#ccc', // Background for placeholder/loading
  },
  nameText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 25,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Use space-around for receiver buttons
    width: '100%',
  },
   buttonWrapper: {
    marginHorizontal: 10, // Add some space between buttons
  },
  // --- Active Call Floating View Styles ---
  floatingView: {
    position: 'absolute', // Position freely on the screen
    width: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 10, // Ensure it's above other elements
    zIndex: 1000, // High zIndex to stay on top
  },
  floatingImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
    backgroundColor: '#ccc',
  },
  endCallButton: {
    backgroundColor: 'red',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginTop: 5,
    width: '100%', // Make button take full width of container
    alignItems: 'center', // Center text horizontally
  },
  endCallButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default CallModal;
