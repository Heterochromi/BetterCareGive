import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Switch, TextInput, Button, ActivityIndicator, Alert } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

interface HelpNotificationSettingsProps {
    patientId: Id<'users'>; // ID of the patient whose settings are being managed
    patientName?: string;  // Name of the patient (required if creating for the first time by caregiver)
    isManagedByCaregiver?: boolean; // Flag to indicate if caregiver is managing
}

export const HelpNotificationSettings: React.FC<HelpNotificationSettingsProps> = ({
    patientId,
    patientName, // Optional: Caregiver might provide this when setting for the first time
    isManagedByCaregiver = false
}) => {
    // Use the appropriate query based on who is viewing
    // Skip the query if a caregiver is managing (they don't use this specific query)
    const settingsQuery = useQuery(
        api.notifications.getMyHelpNotificationSettings,
        isManagedByCaregiver ? "skip" : {} // Pass "skip" as args to skip query
    );
    const setSettingsMutation = useMutation(api.notifications.setOrUpdateHelpNotification);

    const [isActive, setIsActive] = useState(false);
    const [intervalMinutes, setIntervalMinutes] = useState<string>('60'); // Default to 60 mins
    const [isLoading, setIsLoading] = useState(false);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);

    // Effect to load initial settings from the query result
    useEffect(() => {
        if (settingsQuery !== undefined) { // Check if query has loaded (even if result is null)
             console.log("Help Settings Query Result:", settingsQuery);
            setIsActive(settingsQuery?.is_active ?? false);
            setIntervalMinutes(settingsQuery?.intervalMinutes?.toString() ?? '60');
            setInitialLoadComplete(true); // Mark initial load as complete
        }
    }, [settingsQuery]);

    const handleSave = useCallback(async () => {
        if (!initialLoadComplete) {
             console.log("Attempted save before initial load complete.");
             return; // Prevent saving before initial data is loaded
        }

        const intervalNum = parseInt(intervalMinutes, 10);
        if (isNaN(intervalNum) || intervalNum <= 0) {
            Alert.alert("Invalid Interval", "Please enter a valid number of minutes (greater than 0).");
            return;
        }

        setIsLoading(true);
        try {
            console.log(`Saving Help Notification Settings: patientId=${patientId}, isActive=${isActive}, intervalMinutes=${intervalNum}, patientName=${patientName}`);
            await setSettingsMutation({
                patientId: patientId,
                isActive: isActive,
                intervalMinutes: intervalNum,
                // Pass patientName only if creating and provided (relevant for caregiver flow)
                ...(patientName && !settingsQuery ? { patientName: patientName } : {}),
            });
            Alert.alert("Success", "Settings saved successfully.");
        } catch (error) {
            console.error("Failed to save help notification settings:", error);
            Alert.alert("Error", `Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    }, [patientId, isActive, intervalMinutes, setSettingsMutation, patientName, initialLoadComplete, settingsQuery]);

    // Render loading indicator until query finishes its initial load
    if (!initialLoadComplete && !isManagedByCaregiver) {
         // Show loading only for patient view, caregiver view might need separate handling
        return (
            <ThemedView style={styles.container}>
                <ActivityIndicator size="large" />
            </ThemedView>
        );
    }

     // If managed by caregiver and there's no dedicated query result yet, maybe show a simplified form?
     // Or the parent component (PatientList modal) should handle fetching/passing initial data.
     // For now, this component relies on the patient's query or initial state.

    return (
        <ThemedView style={styles.container}>
            <ThemedText style={styles.title}>"Need Help?" Notifications</ThemedText>
            <View style={styles.settingRow}>
                <ThemedText style={styles.label}>Enable Notifications:</ThemedText>
                <Switch
                    value={isActive}
                    onValueChange={setIsActive}
                    disabled={isLoading}
                />
            </View>
            <View style={styles.settingRow}>
                <ThemedText style={styles.label}>Notify Every (minutes):</ThemedText>
                <TextInput
                    style={styles.input}
                    value={intervalMinutes}
                    onChangeText={setIntervalMinutes}
                    keyboardType="number-pad"
                    placeholder="e.g., 60"
                    editable={isActive && !isLoading} // Only editable if active and not loading
                />
            </View>
            <Button
                title={isLoading ? "Saving..." : "Save Settings"}
                onPress={handleSave}
                disabled={isLoading || !initialLoadComplete} // Disable button while loading or before initial load
            />
        </ThemedView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 15,
        marginVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ccc',
        // Add background color if needed from theme
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    label: {
        fontSize: 16,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        paddingVertical: 8,
        paddingHorizontal: 12,
        minWidth: 60,
        textAlign: 'right',
        fontSize: 16,
        // Add text color if needed from theme
    },
}); 