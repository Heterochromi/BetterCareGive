import React from 'react';
import { Modal, View, Text, Image, Button, StyleSheet, ActivityIndicator } from 'react-native';
import { Doc } from '@/convex/_generated/dataModel'; // Assuming dataModel is correctly generated

interface CallModalProps {
  visible: boolean;
  callDetails: Doc<'onGoingCalls'> | null | undefined; // Can be null or undefined while loading/no call
  isCurrentUserCaller: boolean;
  onAccept: () => void;
  onRejectOrCancel: () => void;
  // Potentially add an onHangup if the call transitions to an active state within the modal
  // onHangup: () => void;
}

const CallModal: React.FC<CallModalProps> = ({
  visible,
  callDetails,
  isCurrentUserCaller,
  onAccept,
  onRejectOrCancel,
}) => {
  const getOtherPartyDetails = () => {
    if (!callDetails) return { name: 'Unknown', image: undefined };
    return isCurrentUserCaller
      ? { name: callDetails.receiver_name, image: callDetails.receiver_image }
      : { name: callDetails.caller_name, image: callDetails.caller_image };
  };

  const { name, image } = getOtherPartyDetails();
  const defaultImage = 'https://via.placeholder.com/100'; // Placeholder image

  const renderContent = () => {
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
               {/* Caller only sees Cancel/Hangup */}
               <Button title="Cancel" onPress={onRejectOrCancel} color="red" />
               {/* Add Hangup logic if needed based on call state */}
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


  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={() => {
        // On Android, the back button can close the modal
        // Decide if rejecting/canceling is the default back button action
         // For simplicity, let's prevent closing via back button for now
         // If you want back button to reject/cancel: onRejectOrCancel();
      }}
    >
      {renderContent()}
    </Modal>
  );
};

const styles = StyleSheet.create({
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
});

export default CallModal;
