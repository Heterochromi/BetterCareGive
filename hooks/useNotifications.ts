import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'expo-router';
import { Id } from '@/convex/_generated/dataModel';

const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATIONS';


TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error, executionInfo }) => {
  if (error) {
    console.error('Background notification task error:', error);
    return;
  }
  if (data) {
    console.log('Received a notification in the background:', data);
  }
});

// Set the handler for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false, 
  }),
});

/**
 * A hook to manage push notifications, permissions, and scheduling.
 * Ensures background notification handling is registered.
 */
export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [permissionsGranted, setPermissionsGranted] = useState<boolean | null>(null);
  const storePushToken = useMutation(api.notifications.storePushToken);
  const getOrCreateChatRoom = useMutation(api.chat.getOrCreateChatRoom);
  const router = useRouter();

  // Refs for listeners
  const responseListener = useRef<Notifications.Subscription>();
  const notificationListener = useRef<Notifications.Subscription>();

  // Moved handleNotificationData inside the hook
  const handleNotificationData = useCallback(async (data: any, source: string) => {
    console.log(`[${source}] Raw notification data received:`, JSON.stringify(data, null, 2));

    if (data?.type === 'call') {
      console.log(`[${source}] Handling incoming call notification data:`, JSON.stringify(data, null, 2));
      // TODO: Add navigation logic for calls if needed using router
      // Example: router.push({ pathname: '/callScreen', params: { callInfo: JSON.stringify(data) } });
    } else if (data?.type === 'message') {
      console.log(`[${source}] Handling incoming message notification data:`, JSON.stringify(data, null, 2));
      const sender = data.sender as { id: Id<"users">, name?: string | null, image?: string | null };
      if (sender && sender.id) {
        try {
          const chatRoomId = await getOrCreateChatRoom({ otherUserId: sender.id });
          if (chatRoomId) {
             // Use router.push with pathname and params for Expo Router
            router.push({
              pathname: '/(tabs)/chatScreen', // Correct path based on file structure
              params: {
                chatRoomId: chatRoomId,
                otherUserName: sender.name ?? 'Unknown User'
              }
            });
          } else {
            console.error(`[${source}] Failed to get or create chat room for sender ${sender.id}.`);
          }
        } catch (error) {
          console.error(`[${source}] Error initiating chat via notification press:`, error);
        }
      } else {
        console.error(`[${source}] Received message notification data without valid sender info:`, JSON.stringify(data, null, 2));
      }
    } else {
      console.log(`[${source}] Received notification data, but not type 'call' or 'message':`, JSON.stringify(data, null, 2));
    }
  }, [router, getOrCreateChatRoom]); // Corrected dependency array

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
        console.error("Project ID not found... Cannot get Expo Push Token.");
        return undefined;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      // DETAILED LOGGING START
      console.log('Full tokenData received from Expo:', JSON.stringify(tokenData, null, 2));
      console.log('Expo Push Token fetched (data only):', tokenData.data);

      // Basic check for token validity
      if (!tokenData.data || !tokenData.data.startsWith('ExponentPushToken[') || tokenData.data.length < 30) { // Check format and minimum length
          console.error('INVALID OR SHORT PUSH TOKEN RECEIVED:', tokenData.data);
          // Optionally alert the user or prevent storage
          return undefined;
      }
      // DETAILED LOGGING END

      // Store the token in Convex
      const deviceId = `${await Device.modelName ?? 'unknown'}-${await Device.deviceName ?? 'unknown'}`;
      // DETAILED LOGGING START
      console.log(`Attempting to store token: ${tokenData.data} for deviceId: ${deviceId}`);
      // DETAILED LOGGING END
      await storePushToken({
        token: tokenData.data,
        deviceId: deviceId,
      });
      // DETAILED LOGGING START
      console.log('Token storage attempted in Convex.');
      // DETAILED LOGGING END

      return tokenData.data;
    } catch (e) {
      // DETAILED LOGGING START
      console.error('Failed during get/store Expo push token:', e);
      // DETAILED LOGGING END
      // Optionally alert the user
      // alert(`Failed to get push token: ${e}`);
      return undefined;
    }
  }, [storePushToken]);


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
       const token = await getPushToken();
       setExpoPushToken(token);
    } else {
       console.warn('Notification permissions were not granted.');
       alert('You will not receive push notifications without granting permission.');
    }
    return granted;
  }, [getPushToken]);


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

      // 4. Check if the app was opened by a notification tap (killed state)
      Notifications.getLastNotificationResponseAsync()
        .then(response => {
          if (isMounted && response?.notification) {
            console.log('[Killed State Handler] App opened from killed state via notification. Full response:', JSON.stringify(response, null, 2));
            handleNotificationData(response.notification.request.content.data, 'Killed State Handler'); // Use internal handler
          }
        });

      // 5. Set up listener for user tapping on a notification while app is running/backgrounded
      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('[Response Listener] Notification Response Received (App running/background). Full response:', JSON.stringify(response, null, 2));
        handleNotificationData(response.notification.request.content.data, 'Response Listener'); // Use internal handler
      });

       // 6. Set up listener for receiving notification while app is foregrounded
       notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
         console.log('[Foreground Listener] Notification Received in Foreground. Full notification:', JSON.stringify(notification, null, 2));
         handleNotificationData(notification.request.content.data, 'Foreground Listener'); // Use internal handler
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
    };
  }, [registerBackgroundHandler, getPushToken, storePushToken, handleNotificationData]); // Added handleNotificationData dependency


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
