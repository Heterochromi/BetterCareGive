import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Define the background task name
const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';

// Define the background task handler
// This needs to be defined outside of any React component or hook
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error, executionInfo }) => {
  if (error) {
    console.error('Background notification task error:', error);
    return;
  }
  if (data) {
    console.log('Received a notification in the background:', data);
    
    // Add any custom logic here to handle the notification data in the background
    // e.g., update badge count, store data, etc.
    // const notification = data.notification as Notifications.Notification;
    // console.log('Background Title:', notification.request.content.title);
  }
});

// Set the handler for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false, // Or true if you want the OS to handle it
  }),
});

/**
 * A hook to manage push notifications, permissions, and scheduling.
 * Ensures background notification handling is registered.
 */
export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [permissionsGranted, setPermissionsGranted] = useState<boolean | null>(null);

  // Refs for listeners to clean them up properly
  const responseListener = useRef<Notifications.Subscription>();
  const notificationListener = useRef<Notifications.Subscription>(); // Optional: If you need to react to foreground notifications within the hook/component

  // --- Helper Functions ---

  const registerBackgroundHandler = useCallback(async () => {
    try {
       // Check if the task is already registered
       const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK);
       if (!isRegistered) {
           // IMPORTANT for iOS: Ensure 'remote-notification' is in UIBackgroundModes in app.json/app.config.js
           // "ios": { "infoPlist": { "UIBackgroundModes": ["remote-notification"] } }
           await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
           console.log('Background notification task registered successfully.');
       } else {
           console.log('Background notification task already registered.');
       }
    } catch (e) {
      console.error('Failed to register background notification task:', e);
    }
  }, []);


  const getPushToken = useCallback(async (): Promise<string | undefined> => {
    if (!Device.isDevice) {
      console.warn('Push notifications require a physical device.');
      // Optionally alert the user
      // alert('Must use physical device for Push Notifications');
      return undefined;
    }

    // Ensure Android channel is set *before* getting token (required for Android 8+)
    // This is safe to call multiple times, it will no-op if the channel exists with the same settings.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        console.error("Project ID not found in app configuration (extra.eas.projectId). Cannot get Expo Push Token.");
        // Optionally alert the user
        // alert("Configuration error: Project ID missing.");
        return undefined;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      console.log('Expo Push Token fetched:', tokenData.data);
      return tokenData.data;
    } catch (e) {
      console.error('Failed to get Expo push token:', e);
      // Optionally alert the user
      // alert(`Failed to get push token: ${e}`);
      return undefined;
    }
  }, []);


  const requestNotificationPermissions = useCallback(async (): Promise<boolean> => {
    console.log('Requesting notification permissions...');
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    const granted = status === 'granted';
    setPermissionsGranted(granted);
    console.log(`Notification permissions ${granted ? 'granted' : 'denied'}. Status: ${status}`);

    if (granted) {
      // Attempt to get token immediately after permissions are granted
       const token = await getPushToken();
       setExpoPushToken(token);
    } else {
       console.warn('Notification permissions were not granted.');
       // Optionally alert the user
       // alert('You will not receive push notifications without granting permission.');
    }
    return granted;
  }, [getPushToken]); // Include getPushToken dependency


  // --- Effect for Initialization ---

  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      console.log('Initializing notifications...');
      // 1. Register background handler
      await registerBackgroundHandler();

      // 2. Check initial permissions
      const { status: initialStatus } = await Notifications.getPermissionsAsync();
      const initiallyGranted = initialStatus === 'granted';
      if (isMounted) {
        setPermissionsGranted(initiallyGranted);
        console.log(`Initial notification permissions: ${initiallyGranted ? 'granted' : 'not granted'}. Status: ${initialStatus}`);
      }

      // 3. Get token if permissions are already granted
      if (initiallyGranted) {
          const token = await getPushToken();
          if (isMounted) {
            setExpoPushToken(token);
          }
      }

      // 4. Set up listeners for foreground interactions (optional, but common)
      // Listener for user tapping on a notification
      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notification Response Received:', response);
        // Add navigation or other logic based on response.notification.request.content.data
      });

       // Listener for receiving notification while app is foregrounded (optional)
       notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
         console.log('Notification Received in Foreground:', notification);
         // Optionally update UI or state based on the foreground notification
       });

      console.log('Notification setup complete.');
    }

    initialize();

    // Cleanup listeners on unmount
    return () => {
      isMounted = false;
      console.log('Cleaning up notification listeners...');
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
       if (notificationListener.current) {
         Notifications.removeNotificationSubscription(notificationListener.current);
       }
      // Note: Background task registration persists across app launches and doesn't need explicit cleanup here usually.
      // You can unregister tasks using TaskManager.unregisterTaskAsync if needed, e.g., on logout.
    };
  }, [registerBackgroundHandler, getPushToken]); // Add dependencies


  // --- Public API of the Hook ---

  /**
   * Schedules a local notification.
   * @param content The notification content (title, body, data, etc.).
   * @param trigger The trigger condition (e.g., { seconds: 5 }).
   * @returns The notification identifier string.
   */
  const scheduleLocalNotification = useCallback(
    async (
      content: Notifications.NotificationContentInput,
      trigger: Notifications.NotificationTriggerInput
    ): Promise<string> => {
      try {
        const identifier = await Notifications.scheduleNotificationAsync({
          content,
          trigger,
        });
        console.log(`Notification scheduled with identifier: ${identifier}`);
        return identifier;
      } catch (e) {
        console.error('Failed to schedule notification:', e);
        throw e; // Re-throw for the caller to handle
      }
    },
    []
  );

  return {
    /** The Expo push token, or undefined if not available/granted. */
    expoPushToken,
    /** Function to explicitly request notification permissions from the user. Returns true if granted, false otherwise. */
    requestPermissions: requestNotificationPermissions,
    /** Function to schedule a local notification. */
    scheduleLocalNotification,
    /** Current permission status: true (granted), false (denied), or null (initial state/checking). */
    permissionsGranted,
  };
}
