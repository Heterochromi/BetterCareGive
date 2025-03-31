import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, FlatList, Switch, ScrollView, Platform } from 'react-native';
import { Calendar as RNCalendar } from 'react-native-calendars';
import { Picker } from '@react-native-picker/picker';
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Doc, Id } from "../convex/_generated/dataModel";

// Define interface to match Convex document structure including new fields
// Assuming the schema uses Id<'users'> for patient/caregiver IDs
interface PatientInfo {
  id: Id<"users">;
  patient_name: string;
}

// Corrected CaregiverInfo interface to match schema (using patient_name)
interface CaregiverInfo {
  id: Id<"users">;
  patient_name: string; // Corrected field name based on schema
}

// Updated ConvexEvent interface
interface ConvexEvent extends Doc<"events"> {
  title: string;
  description: string;
  dateTime: number;
  patient: PatientInfo;
  isSetByCareGiver?: boolean;
  careGiver?: CaregiverInfo;
  userId: string; // Creator's ID
  isRepeat?: boolean;
  repeat?: 'daily' | 'weekly' | 'monthly';
}

// Interface for marked dates in the calendar
interface MarkedDates {
  [date: string]: {
    marked?: boolean;
    dotColor?: string;
    selected?: boolean;
    selectedColor?: string;
  };
}

export const Calendar = () => {
  const [selectedDate, setSelectedDate] = useState('');
  const [isModalVisible, setModalVisible] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventHour, setEventHour] = useState('09'); // Hour 1-12
  const [eventMinute, setEventMinute] = useState('00');
  const [eventAmPm, setEventAmPm] = useState('AM'); // Add AM/PM state
  const [isRepeat, setIsRepeat] = useState(false);
  const [repeatInterval, setRepeatInterval] = useState<'daily' | 'weekly' | 'monthly' | null>(null);

  const currentUser = useQuery(api.user.getCurrentUser);
  const createEvent = useMutation(api.events.create);

  // Fetch *all* events once for marking the calendar
  const allEvents = useQuery(api.events.list) || [];

  // Calculate start and end timestamps for the selected day
  const { startOfDay, endOfDay } = useMemo(() => {
    if (!selectedDate) return { startOfDay: null, endOfDay: null };
    const dateObj = new Date(selectedDate + 'T00:00:00'); // Ensure local timezone is considered
    const start = dateObj.setHours(0, 0, 0, 0);
    const end = start + 24 * 60 * 60 * 1000;
    return { startOfDay: start, endOfDay: end };
  }, [selectedDate]);

  // Fetch events for the selected date range
  // Use skip argument to prevent query when no date is selected
  const selectedDateEvents = useQuery(
    api.events.getByDateRange,
    selectedDate ? { startOfDay: startOfDay!, endOfDay: endOfDay! } : 'skip'
  ) || [];

  // Transform all events into calendar marking format
  const markedDates: MarkedDates = useMemo(() => {
    const marks = allEvents.reduce((acc: MarkedDates, event: ConvexEvent) => {
      if (event.dateTime) {
        const dateString = new Date(event.dateTime).toISOString().split('T')[0];
        acc[dateString] = {
          marked: true,
          dotColor: '#50cebb',
        };
      }
      return acc;
    }, {});

    // Add selection styling explicitly for the selectedDate
    if (selectedDate) {
      marks[selectedDate] = {
        ...(marks[selectedDate] || {}),
        selected: true,
        selectedColor: '#50cebb',
        marked: !!marks[selectedDate]?.marked, // Keep marked if it was already true
        dotColor: marks[selectedDate]?.dotColor || '#50cebb'
      };
    }
    return marks;
  }, [allEvents, selectedDate]);

  const handleDayPress = (day: { dateString: string }) => {
    setSelectedDate(day.dateString);
  };

  const handleCreateEventPress = () => {
    if (!selectedDate) {
      alert("Please select a date first.");
      return;
    }
    setEventTitle('');
    setEventDescription('');
    setEventHour('09'); // Reset to default 12-hour
    setEventMinute('00');
    setEventAmPm('AM'); // Reset AM/PM
    setIsRepeat(false);
    setRepeatInterval(null);
    setModalVisible(true);
  };

  const handleCreateEvent = async () => {
    if (!currentUser) {
      alert("User data not loaded or user not authenticated.");
      return;
    }
    if (!eventTitle || !selectedDate || !eventHour || !eventMinute) {
      alert('Please fill in Title, Date, and select a Time.');
      return;
    }
    if (isRepeat && !repeatInterval) {
      alert('Please select a repeat interval.');
      return;
    }

    // Convert 12-hour format to 24-hour format for timestamp calculation
    let hours24 = parseInt(eventHour, 10);
    if (eventAmPm === 'PM' && hours24 !== 12) {
      hours24 += 12;
    } else if (eventAmPm === 'AM' && hours24 === 12) { // Handle 12 AM (midnight)
      hours24 = 0;
    }
    const minutes = parseInt(eventMinute, 10);

    // Combine date and calculated 24-hour time into a timestamp
    const combinedDateTime = new Date(selectedDate + 'T00:00:00');
    combinedDateTime.setHours(hours24, minutes); // Use 24-hour format
    const eventTimestamp = combinedDateTime.getTime();

    // --- Get User Data Logic (remains the same) ---
    const currentUserId = currentUser.id;
    const currentUserName = currentUser.name || "Unknown User";
    const currentUserRole = currentUser.role;

    if (!currentUserRole) {
        console.error("User role is not defined in the database.");
        alert("Error: User role not found. Cannot create event.");
        return;
    }

    let patientData: PatientInfo;
    let caregiverData: CaregiverInfo | undefined = undefined;
    let eventIsSetByCaregiver: boolean | undefined = undefined;

    if (currentUserRole === 'patient') {
      patientData = { id: currentUserId, patient_name: currentUserName };
    } else if (currentUserRole === 'caregiver') {
      // <<< --- REPLACE PLACEHOLDER PATIENT LOGIC HERE --- >>>
      console.warn("Caregiver creating event - Using caregiver details as placeholder patient. Implement patient selection.");
      const selectedPatientId = currentUserId; // <<< TEMPORARY
      const selectedPatientName = "Selected Patient Name"; // <<< TEMPORARY
      // <<< --------------------------------------------- >>>
      patientData = { id: selectedPatientId, patient_name: selectedPatientName };
      caregiverData = { id: currentUserId, patient_name: currentUserName };
      eventIsSetByCaregiver = true;
    } else {
      console.error(`Invalid user role found: ${currentUserRole}`);
      alert("Error: Invalid user role.");
      return;
    }
    // --- End User Data Logic ---

    try {
      await createEvent({
        title: eventTitle,
        description: eventDescription,
        dateTime: eventTimestamp,
        patient: patientData,
        isSetByCareGiver: eventIsSetByCaregiver,
        careGiver: caregiverData,
        isRepeat: isRepeat,
        repeat: isRepeat ? repeatInterval ?? undefined : undefined,
      });

      // Reset form and close modal
      setEventTitle('');
      setEventDescription('');
      setEventHour('09'); // Reset hour
      setEventMinute('00'); // Reset minute
      setEventAmPm('AM'); // Reset AM/PM
      setIsRepeat(false);
      setRepeatInterval(null);
      setModalVisible(false);

    } catch (error) {
      console.error('Error creating event:', error instanceof Error ? error.message : error);
      alert('Failed to create event. Please check the console for details.');
    }
  };

  // Format time from timestamp for display
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Render an event item using the dateTime field
  const renderEventItem = ({ item }: { item: ConvexEvent }) => (
    <View style={styles.eventItem}>
      <Text style={styles.eventTitle}>{item.title} ({formatTime(item.dateTime)})</Text>
      <Text style={styles.eventDescription}>{item.description}</Text>
      {item.isRepeat && item.repeat && (
        <Text style={styles.eventRepeatText}>Repeats: {item.repeat.charAt(0).toUpperCase() + item.repeat.slice(1)}</Text>
      )}
      {item.isSetByCareGiver && item.careGiver && (
        <Text style={styles.eventCreatorText}>Set by Caregiver: {item.careGiver.patient_name}</Text>
      )}
      {!item.isSetByCareGiver && (
        <Text style={styles.eventCreatorText}>Set by: {item.patient.patient_name}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <RNCalendar
        onDayPress={handleDayPress}
        markedDates={markedDates}
        theme={{
          backgroundColor: '#ffffff',
          calendarBackground: '#ffffff',
          textSectionTitleColor: '#b6c1cd',
          selectedDayBackgroundColor: '#50cebb',
          selectedDayTextColor: '#ffffff',
          todayTextColor: '#50cebb',
          dayTextColor: '#2d4150',
          textDisabledColor: '#d9e1e8',
          dotColor: '#50cebb',
          selectedDotColor: '#ffffff',
          arrowColor: '#50cebb',
          monthTextColor: '#2d4150',
          indicatorColor: '#50cebb',
        }}
      />

      {selectedDate && (
        <View style={styles.eventsSection}>
          <View style={styles.eventsHeader}>
            <Text style={styles.eventsTitle}>Events for {selectedDate}</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleCreateEventPress}
            >
              <Text style={styles.addButtonText}>+ Add Event</Text>
            </TouchableOpacity>
          </View>

          {selectedDateEvents.length > 0 ? (
            <FlatList
              data={selectedDateEvents}
              renderItem={renderEventItem}
              keyExtractor={(item) => item._id.toString()}
              style={styles.eventList}
            />
          ) : (
            <Text style={styles.noEventsText}>No events for this date</Text>
          )}
        </View>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <ScrollView contentContainerStyle={styles.modalOuterContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Event</Text>
            <Text style={styles.dateText}>Date: {selectedDate}</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Event Title"
              value={eventTitle}
              onChangeText={setEventTitle}
            />
            
            <View style={styles.timePickerContainer}>
              <Picker
                selectedValue={eventHour}
                style={styles.pickerHourMinute} // Use adjusted style
                onValueChange={(itemValue) => setEventHour(itemValue)}
              >
                {/* Hours 1-12 */}
                {Array.from({ length: 12 }, (_, i) => {
                  const hour = (i + 1).toString().padStart(2, '0');
                  return <Picker.Item key={hour} label={hour} value={hour} />;
                })}
              </Picker>
              <Text style={styles.timeSeparator}>:</Text>
              <Picker
                selectedValue={eventMinute}
                style={styles.pickerHourMinute} // Use adjusted style
                onValueChange={(itemValue) => setEventMinute(itemValue)}
              >
                {Array.from({ length: 60 }, (_, i) => {
                  const minute = i.toString().padStart(2, '0');
                  return <Picker.Item key={minute} label={minute} value={minute} />;
                })}
              </Picker>
              {/* Add AM/PM Picker */}
              <Picker
                selectedValue={eventAmPm}
                style={styles.pickerAmPm} // Use specific style for AM/PM
                onValueChange={(itemValue) => setEventAmPm(itemValue)}
              >
                
                <Picker.Item key="AM" label="AM" value="AM" />
                <Picker.Item key="PM" label="PM" value="PM" />
              </Picker>
            </View>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Event Description"
              value={eventDescription}
              onChangeText={setEventDescription}
              multiline
              numberOfLines={4}
            />

            <View style={styles.repeatSection}>
              <Text style={styles.repeatLabel}>Repeat Event?</Text>
              <Switch
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={isRepeat ? "#50cebb" : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
                onValueChange={setIsRepeat}
                value={isRepeat}
              />
            </View>

            {isRepeat && (
              <View style={styles.intervalSection}>
                <Text style={styles.intervalLabel}>Repeat Interval:</Text>
                <View style={styles.intervalButtons}>
                  <TouchableOpacity
                    style={[styles.intervalButton, repeatInterval === 'daily' && styles.intervalButtonSelected]}
                    onPress={() => setRepeatInterval('daily')}
                  >
                    <Text style={[styles.intervalButtonText, repeatInterval === 'daily' && styles.intervalButtonTextSelected]}>Daily</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.intervalButton, repeatInterval === 'weekly' && styles.intervalButtonSelected]}
                    onPress={() => setRepeatInterval('weekly')}
                  >
                    <Text style={[styles.intervalButtonText, repeatInterval === 'weekly' && styles.intervalButtonTextSelected]}>Weekly</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.intervalButton, repeatInterval === 'monthly' && styles.intervalButtonSelected]}
                    onPress={() => setRepeatInterval('monthly')}
                  >
                    <Text style={[styles.intervalButtonText, repeatInterval === 'monthly' && styles.intervalButtonTextSelected]}>Monthly</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.createButton]}
                onPress={handleCreateEvent}
              >
                <Text style={styles.buttonText}>Create Event</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  eventsSection: {
    flex: 1,
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  eventsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#50cebb',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  eventList: {
    flex: 1,
  },
  eventItem: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#50cebb',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  eventDescription: {
    fontSize: 14,
    color: '#666',
  },
  eventRepeatText: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 4,
  },
  eventCreatorText: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  noEventsText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#888',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  dateText: {
    fontSize: 16,
    marginBottom: 20,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    padding: 15,
    borderRadius: 10,
    width: '45%',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ff6b6b',
  },
  createButton: {
    backgroundColor: '#50cebb',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOuterContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  repeatSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  repeatLabel: {
  },
  intervalSection: {
    width: '100%',
    marginBottom: 20,
    alignItems: 'center',
  },
  intervalLabel: {
    fontSize: 16,
    marginBottom: 10,
  },
  intervalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  intervalButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
  },
  intervalButtonSelected: {
    backgroundColor: '#50cebb',
    borderColor: '#50cebb',
  },
  intervalButtonText: {
    fontSize: 14,
    color: '#333',
  },
  intervalButtonTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 15,
  },
  pickerHourMinute: { // Style for Hour and Minute pickers
    width: Platform.OS === 'ios' ? 80 : 100, // Restore fixed width
    height: Platform.OS === 'ios' ? 150 : 50,
  },
  pickerAmPm: { // Style for AM/PM picker
    width: Platform.OS === 'ios' ? 90 : 110, // Restore fixed width, slightly increased for AM/PM
    height: Platform.OS === 'ios' ? 150 : 50,
  },
  timeSeparator: {
    fontSize: 20,
    marginHorizontal: 5,
    fontWeight: 'bold',
  },
}); 