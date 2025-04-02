import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, FlatList, Switch, ScrollView, Platform, Alert } from 'react-native';
import { Calendar as RNCalendar } from 'react-native-calendars';
import { Doc, Id } from "../convex/_generated/dataModel";
import DatePicker from 'react-native-date-picker'
import { api } from '@/convex/_generated/api'; // Ensure api is imported
import { useMutation } from 'convex/react'; // Ensure useMutation is imported

// Interface to match Convex document structure
interface PatientInfo {
  id: Id<"users">;
  patient_name: string;
}

// Corrected CaregiverInfo interface
interface CaregiverInfo {
  id: Id<"users">;
  patient_name: string;
}

// ConvexEvent interface extending Doc<"events">
interface ConvexEvent extends Doc<"events"> {
  title: string;
  description: string;
  dateTime: number;
  patient: PatientInfo;
  isSetByCareGiver?: boolean;
  careGiver?: CaregiverInfo;
  userId: string; 
  isRepeat?: boolean;
  repeat?: 'daily' | 'weekly' | 'monthly';
}

// Simplified Patient type from planner.tsx
type Patient = {
  id: Id<"users">;
  name: string;
  email?: string;
  image?: string;
};

// Type definition matching the return type of api.user.getCurrentUser
type CurrentUserType = {
  id: Id<"users">;
  role?: "caregiver" | "patient";
  name?: string;
  image?: string;
  email?: string;
};

// MarkedDates interface
interface MarkedDates {
  [date: string]: {
    marked?: boolean;
    dotColor?: string;
    selected?: boolean;
    selectedColor?: string;
  };
}

 // Updated props type definition
type props = {
  currentUser: CurrentUserType; // Use the correct type returned by the query
  createEvent: ReturnType<typeof useMutation<typeof api.events.create>>;
  deleteEvent: ReturnType<typeof useMutation<typeof api.events.deleteEvent>>;
  allEvents: Array<ConvexEvent>;
  patient: Patient | undefined | null; // Allow patient to be optional/null
}

export const Calendar = ({currentUser ,  createEvent , allEvents , patient}:props) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [isModalVisible, setModalVisible] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [selectedEventTime, setSelectedEventTime] = useState(new Date());
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [repeatInterval, setRepeatInterval] = useState<'daily' | 'weekly' | 'monthly' | null>(null);

  // Initialize the delete mutation hook
  const performDeleteEvent = useMutation(api.events.deleteEvent);

  // Transform all events into calendar marking format, including repeats
  const markedDates: MarkedDates = useMemo(() => {
    const marks: MarkedDates = {};
    const today = new Date();
    const endDateLimit = new Date(today);
    endDateLimit.setFullYear(today.getFullYear() + 1); // Calculate repeats up to 1 year ahead

    allEvents.forEach((event: ConvexEvent) => {
      if (!event.dateTime) return;

      let currentDate = new Date(event.dateTime);
      // Normalize to UTC start of day for consistent date string generation
      const originalDateString = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate()))
                                  .toISOString().split('T')[0];


      // Mark the original date
      marks[originalDateString] = {
        marked: true,
        dotColor: '#50cebb',
      };

      // Handle repeating events
      if (event.isRepeat && event.repeat) {
        // IMPORTANT: Use UTC dates for calculations to avoid timezone shifts across days/months
        let nextDateUTC = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate()));
        const limitDateUTC = new Date(Date.UTC(endDateLimit.getUTCFullYear(), endDateLimit.getUTCMonth(), endDateLimit.getUTCDate()));


        while (nextDateUTC <= limitDateUTC) {
          // Calculate the *next* occurrence based on the interval using UTC methods
          switch (event.repeat) {
            case 'daily':
              nextDateUTC.setUTCDate(nextDateUTC.getUTCDate() + 1);
              break;
            case 'weekly':
              nextDateUTC.setUTCDate(nextDateUTC.getUTCDate() + 7);
              break;
            case 'monthly':
              // Remember the original day (UTC)
              const originalUTCDay = new Date(event.dateTime).getUTCDate();

              // Get the current month (before incrementing) of the occurrence being processed
              const currentUTCMonth = nextDateUTC.getUTCMonth();

              // Move to the next month
              nextDateUTC.setUTCMonth(currentUTCMonth + 1);

              // Try setting the day to the original day
              nextDateUTC.setUTCDate(originalUTCDay);

              // Check if setting the day pushed it into the *following* month
              // (e.g., original day 31, target month Feb -> setting day 31 makes it Mar 2/3)
              if (nextDateUTC.getUTCMonth() !== (currentUTCMonth + 1) % 12) {
                // If the month is wrong, it means original day didn't exist.
                // Go back to the target month and set day to 0 (last day of target month).
                nextDateUTC.setUTCMonth(currentUTCMonth + 1); // Re-set the target month explicitly
                nextDateUTC.setUTCDate(0); // Set to last day of that month
              }
              break;
            default:
              // Should not happen based on schema, but break just in case
              nextDateUTC = new Date(limitDateUTC.getTime() + 86400000); // Break loop (add one day in ms)
              break;
          }

          if (nextDateUTC <= limitDateUTC) {
            const repeatDateString = nextDateUTC.toISOString().split('T')[0];
            // Add mark, preserving existing selection if any
            marks[repeatDateString] = {
              ...(marks[repeatDateString] || {}), // Preserve existing properties like selected
              marked: true,
              dotColor: '#50cebb',
            };
          }
        }
      }
    });

    // Add selection styling explicitly for the selectedDate, preserving marks
    if (selectedDate) {
      marks[selectedDate] = {
        ...(marks[selectedDate] || {}), // Keep existing marks/dots
        selected: true,
        selectedColor: '#50cebb',
        // Ensure marked is true if it was already marked or if it's selected
        marked: !!marks[selectedDate]?.marked || true,
        dotColor: marks[selectedDate]?.dotColor || '#50cebb' // Keep existing dot color if present
      };
    }
    return marks;
  }, [allEvents, selectedDate]); // Recalculate when events or selection change


  // Calculate events to display for the selected date, including repeats
  const eventsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];

    const displayEvents: ConvexEvent[] = [];
    // Use UTC for comparison to align with markedDates logic if needed, or stick to local
    const selectedDayStart = new Date(selectedDate + 'T00:00:00'); // Assuming local time interpretation
    selectedDayStart.setHours(0,0,0,0);
    const selectedDayStartTime = selectedDayStart.getTime();

    allEvents.forEach((event: ConvexEvent) => {
      if (!event.dateTime) return;

      const originalEventTime = event.dateTime;
      const originalEventDate = new Date(originalEventTime);
      const originalEventHours = originalEventDate.getHours(); // Keep local hours/minutes
      const originalEventMinutes = originalEventDate.getMinutes();

      // Normalize original event date to midnight LOCAL time for comparison with selectedDayStart
      const originalEventDayStart = new Date(originalEventDate);
      originalEventDayStart.setHours(0, 0, 0, 0);
      const originalEventDayStartTime = originalEventDayStart.getTime();

      // 1. Check if the original event falls on the selected date (using LOCAL start times)
      if (originalEventDayStartTime === selectedDayStartTime) {
         if (!displayEvents.some(e => e._id === event._id && e.dateTime === event.dateTime)) {
            displayEvents.push(event);
         }
      }

      // 2. Check for repeating occurrences
      if (event.isRepeat && event.repeat && originalEventDayStartTime < selectedDayStartTime) {
         // Start calculation from the *original* event's date/time
        let occurrenceDate = new Date(originalEventTime);
        const limitDate = new Date(selectedDayStartTime + 86400000); // Limit search to just after the selected day


        while (occurrenceDate.getTime() < limitDate.getTime()) {
            let nextOccurrence = new Date(occurrenceDate);
             // Calculate the *next* potential occurrence date (using LOCAL date methods)
             switch (event.repeat) {
                case 'daily':
                  nextOccurrence.setDate(nextOccurrence.getDate() + 1);
                  break;
                case 'weekly':
                  nextOccurrence.setDate(nextOccurrence.getDate() + 7);
                  break;
                case 'monthly':
                  // Remember the original day (Local)
                   const originalLocalDate = new Date(originalEventTime).getDate();

                   // Get the current month (before incrementing) of the occurrence being processed
                  const currentMonth = nextOccurrence.getMonth();

                  // Move to the next month
                  nextOccurrence.setMonth(currentMonth + 1);

                  // Try setting the day to the original day
                   nextOccurrence.setDate(originalLocalDate);

                   // Check if setting the day pushed it into the *following* month
                  // (e.g., original day 31, target month Feb -> setting day 31 makes it Mar 2/3)
                   if (nextOccurrence.getMonth() !== (currentMonth + 1) % 12) {
                       // If the month is wrong, it means original day didn't exist.
                       // Go back to the target month and set day to 0 (last day of target month).
                       nextOccurrence.setMonth(currentMonth + 1); // Re-set the target month explicitly
                       nextOccurrence.setDate(0); // Set to last day of that month
                   }
                  break;
                default:
                   nextOccurrence.setTime(limitDate.getTime()); // Break loop
                   break;
             }

             // Normalize the calculated occurrence date to midnight LOCAL time
             const nextOccurrenceDayStart = new Date(nextOccurrence);
             nextOccurrenceDayStart.setHours(0, 0, 0, 0);

             // Check if this occurrence falls exactly on the selected date's start time
             if (nextOccurrenceDayStart.getTime() === selectedDayStartTime) {
                 // Create a synthetic event object for this occurrence
                 const occurrenceDateTime = new Date(selectedDayStartTime);
                 occurrenceDateTime.setHours(originalEventHours, originalEventMinutes); // Use original time

                // Avoid adding duplicates if the original event was also today
                 if (!displayEvents.some(e => e._id === event._id && e.dateTime === occurrenceDateTime.getTime())) {
                     displayEvents.push({
                       ...event,
                       // CRITICAL: Set the dateTime to the calculated occurrence time on the selected day
                       dateTime: occurrenceDateTime.getTime(),
                     });
                 }
                 // Found the occurrence for this date, no need to calculate further *for this specific event*
                 break; // Exit the while loop for this event
             } else if (nextOccurrenceDayStart.getTime() > selectedDayStartTime) {
                 // We've passed the selected date, stop checking for this event
                 break; // Exit the while loop for this event
             }

             // Update occurrenceDate to the calculated next one to continue the loop
             occurrenceDate = nextOccurrence;
        }
      }
    });

    // Sort the final list of events for the day by their actual dateTime timestamp
    displayEvents.sort((a, b) => a.dateTime - b.dateTime);


    return displayEvents;
  }, [allEvents, selectedDate]); // Also depends on allEvents and selectedDate

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
    const defaultTime = new Date();
    defaultTime.setHours(9, 0, 0, 0);
    setSelectedEventTime(defaultTime);
    setIsRepeat(false);
    setRepeatInterval(null);
    setModalVisible(true);
  };

  const handleCreateEvent = async () => {
    if (!currentUser) {
      alert("User data not loaded or user not authenticated.");
      return;
    }
    if (!eventTitle || !selectedDate) {
      alert('Please fill in Title and Date.');
      return;
    }
    if (isRepeat && !repeatInterval) {
      alert('Please select a repeat interval.');
      return;
    }

    const hours = selectedEventTime.getHours();
    const minutes = selectedEventTime.getMinutes();

    const combinedDateTime = new Date(selectedDate + 'T00:00:00');
    combinedDateTime.setHours(hours, minutes);
    const eventTimestamp = combinedDateTime.getTime();

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
      if (!patient) {
          console.error("Caregiver creating event without selected patient.");
          alert("Error: Please select a patient first.");
          return;
      }
      const selectedPatientId = patient.id;
      const selectedPatientName = patient.name;
      patientData = { id: selectedPatientId, patient_name: selectedPatientName };
      caregiverData = { id: currentUserId, patient_name: currentUserName };
      eventIsSetByCaregiver = true;
    } else {
      console.error(`Invalid user role found: ${currentUserRole}`);
      alert("Error: Invalid user role.");
      return;
    }

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

      setEventTitle('');
      setEventDescription('');
      const defaultTime = new Date();
      defaultTime.setHours(9, 0, 0, 0);
      setSelectedEventTime(defaultTime);
      setIsRepeat(false);
      setRepeatInterval(null);
      setModalVisible(false);

    } catch (error) {
      console.error('Error creating event:', error instanceof Error ? error.message : error);
      alert('Failed to create event. Please check the console for details.');
    }
  };

  const handleDeleteEvent = (eventId: Id<"events">) => {
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this event?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: async () => {
            try {
              await performDeleteEvent({ eventId });
              // Optionally, add feedback like a toast message
              console.log(`Event ${eventId} deleted successfully.`);
              // The event list will automatically update due to Convex reactivity.
            } catch (error) {
              console.error("Failed to delete event:", error);
              Alert.alert("Error", "Could not delete the event.");
            }
          },
          style: "destructive",
        },
      ],
      { cancelable: true }
    );
  };

  const formatTime = (dateOrTimestamp: number | Date) => {
    const date = typeof dateOrTimestamp === 'number' ? new Date(dateOrTimestamp) : dateOrTimestamp;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const renderEventItem = ({ item }: { item: ConvexEvent }) => {
    // Determine if the current user can delete this event
    const canDelete = currentUser && (
      (currentUser.id === item.userId) || // Patient owner
      (item.isSetByCareGiver && item.careGiver?.id === currentUser.id) // Caregiver creator
    );

    return (
      <View style={styles.eventItem}>
        <View style={styles.eventDetails}>
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
        {canDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteEvent(item._id)}
          >
            <Text style={styles.deleteButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

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

          {eventsForSelectedDate.length > 0 ? (
            <FlatList
              data={eventsForSelectedDate}
              renderItem={renderEventItem}
              keyExtractor={(item, index) => `${item._id.toString()}-${item.dateTime}-${index}`}
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

            <TouchableOpacity
              style={styles.timeInputButton}
              onPress={() => setTimePickerVisible(true)}
            >
              <Text style={styles.timeInputText}>
                Time: {formatTime(selectedEventTime)}
              </Text>
            </TouchableOpacity>

            <DatePicker
              modal
              open={isTimePickerVisible}
              date={selectedEventTime}
              mode="time"
              onConfirm={(date) => {
                setTimePickerVisible(false);
                setSelectedEventTime(date);
              }}
              onCancel={() => {
                setTimePickerVisible(false);
              }}
            />

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
    flexDirection: 'row', // Arrange details and button side-by-side
    justifyContent: 'space-between', // Push details and button apart
    alignItems: 'center', // Align items vertically center
  },
  eventDetails: {
    flex: 1, // Allow details to take up available space
    marginRight: 10, // Add some space before the delete button
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
  deleteButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#ff6b6b', // Red color for delete
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10, // Add space if eventDetails doesn't have marginRight
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
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
    maxHeight: '85%',
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
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
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
    paddingVertical: 20,
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
    fontSize: 16,
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
  timeInputButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    alignItems: 'flex-start',
    backgroundColor: '#f9f9f9'
  },
  timeInputText: {
    fontSize: 16,
    color: '#333'
  },
}); 