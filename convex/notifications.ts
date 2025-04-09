import { mutation, action, internalQuery, internalAction, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx } from "./_generated/server";

// Define the expected return type structure based on getHelpNotificationSettingsInternal
// This helps with type safety for the public query wrapper.
type HelpNotificationSettingsResult = Doc<"helpNotifications"> & { intervalMinutes: number } | null;

// Helper function to calculate the next occurrence time
function calculateNextOccurrence(currentDateTime: number, repeat: "daily" | "weekly" | "monthly"): number {
  const currentDate = new Date(currentDateTime);
  switch (repeat) {
    case "daily":
      currentDate.setDate(currentDate.getDate() + 1);
      break;
    case "weekly":
      currentDate.setDate(currentDate.getDate() + 7);
      break;
    case "monthly":
      currentDate.setMonth(currentDate.getMonth() + 1);
      break;
    default:
      // Should not happen given the validator, but good practice
      throw new Error(`Invalid repeat value: ${repeat}`);
  }
  return currentDate.getTime();
}

// Store a push notification token for a user
export const storePushToken = mutation({
  args: {
    token: v.string(),
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    // DETAILED LOGGING START
    console.log(`storePushToken mutation received: token=${args.token}, deviceId=${args.deviceId}`);
    // DETAILED LOGGING END
    const identity = await getAuthUserId(ctx);
    if (!identity) {
      // DETAILED LOGGING START
      console.error('storePushToken: Unauthorized user attempt.');
      // DETAILED LOGGING END
      throw new Error("Unauthorized");
    }
    // DETAILED LOGGING START
    console.log(`storePushToken: Processing for userId=${identity}`);
    // DETAILED LOGGING END

    // Check if this device already has a token stored
    const existing = await ctx.db
      .query("pushTokens")
      .filter((q) => q.eq(q.field("deviceId"), args.deviceId))
      .first();

    if (existing) {
      // DETAILED LOGGING START
      console.log(`storePushToken: Found existing token document ${existing._id} for deviceId=${args.deviceId}. Patching token.`);
      // DETAILED LOGGING END
      // Update existing token
      await ctx.db.patch(existing._id, { token: args.token });
    } else {
      // DETAILED LOGGING START
      console.log(`storePushToken: No existing token found for deviceId=${args.deviceId}. Inserting new document.`);
      // DETAILED LOGGING END
      // Store new token
      await ctx.db.insert("pushTokens", {
        userId: identity,
        token: args.token,
        deviceId: args.deviceId,
      });
    }
    // DETAILED LOGGING START
    console.log(`storePushToken: Completed processing for deviceId=${args.deviceId}`);
    // DETAILED LOGGING END
  },
});

// Send a push notification to a specific user and handle rescheduling for repeating events
export const sendPushNotification = internalAction({
  args: {
    eventId: v.id("events"),
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    // Ensure data includes a 'type' field if sound differentiation is needed
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    console.log(`sendPushNotification Action: Starting for eventId=${args.eventId}, userId=${args.userId}`);

    // --- Rescheduling Logic ---
    const event = await ctx.runQuery(internal.events.getEventInternal, { eventId: args.eventId });

    if (event && event.isRepeat && event.repeat) {
      const now = Date.now();
      // Calculate the next time based on the *original* dateTime to avoid drift
      const nextOccurrenceTime = calculateNextOccurrence(event.dateTime, event.repeat);

      // Only schedule if the next occurrence is in the future relative to now
      // And also check if the event's original dateTime isn't already past the calculated next time (edge case for very frequent repeats)
      if (nextOccurrenceTime > now && nextOccurrenceTime > event.dateTime) {
         // Pass the same args to the next scheduled call
        const nextArgs = { ...args };
        console.log(`Rescheduling event ${args.eventId} for ${new Date(nextOccurrenceTime).toISOString()}`);
        await ctx.scheduler.runAt(nextOccurrenceTime, internal.notifications.sendPushNotification, nextArgs);
      } else {
          console.log(`Not rescheduling event ${args.eventId}. Next calculated time ${new Date(nextOccurrenceTime).toISOString()} is not in the future or is before original dateTime.`);
      }

    } else if (!event) {
        console.warn(`Event ${args.eventId} not found. Cannot determine repeat status or reschedule.`);
        // Decide if you still want to send the current notification if the event is gone.
        // If not, you could return early here.
    }
    // --- End Rescheduling Logic ---


    // --- Send Current Notification Logic ---
    // Get all push tokens for this user
    const pushTokens = await ctx.runQuery(internal.notifications.getUserPushTokens, {
      userId: args.userId,
    });

    console.log(`sendPushNotification Action: Found push tokens for userId=${args.userId}: ${JSON.stringify(pushTokens)}`);

    if (!pushTokens.length) {
      console.log("sendPushNotification Action: No push tokens found for user", args.userId);
      return; // Exit if no tokens to send to
    }

    // Determine sound and channel based on data.type
    const notificationType = args.data?.type;
    let sound: string;
    let channelId: string;

    // NEW: Handle 'help' type
    if (notificationType === 'ring') {
        sound = 'ring.wav';
        channelId = 'ringChannel';
    } else if (notificationType === 'help') {
        sound = 'urgent.wav'; // Or a dedicated sound like 'help.wav' if available
        channelId = 'urgentChannel'; // Or a dedicated channel like 'helpChannel'
        console.log(`sendPushNotification Action: Determined sound='${sound}', channelId='${channelId}' based on type='help'`);
    } else { // Default to urgent for 'urgent' type or any unspecified type
        sound = 'urgent.wav';
        channelId = 'urgentChannel';
        console.log(`sendPushNotification Action: Determined sound='${sound}', channelId='${channelId}' based on type='${notificationType ?? 'default/urgent'}'`);
    }

    // Send to Expo push notification service
    const messages = pushTokens.map((pushToken: string) => ({
      to: pushToken,
      title: args.title,
      body: args.body,
      data: args.data ?? {},
      sound: sound, // Use determined sound
      priority: "high",
      channelId: channelId, // Set channelId for Android 8+ targeting
    }));

    console.log(`sendPushNotification Action: Preparing to send messages payload: ${JSON.stringify(messages, null, 2)}`);

    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });

      const responseText = await response.text();
      console.log(`sendPushNotification Action: Received response status=${response.status}, body=${responseText}`);
      // Optional: Handle response codes/errors from Expo
      // ...

    } catch (error) {
      console.error("sendPushNotification Action: Error sending push notification:", error);
    }
    console.log(`sendPushNotification Action: Finished processing for eventId=${args.eventId}, userId=${args.userId}`);
    // --- End Send Current Notification Logic ---
  },
});

// NEW: Internal action specifically for sending generic push notifications (non-event related)
export const sendGenericPushNotification = internalAction({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    // Ensure data includes a 'type' field if sound differentiation is needed
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    console.log(`sendGenericPushNotification Action: Starting for userId=${args.userId}`);

    // Get all push tokens for this user
    const pushTokens = await ctx.runQuery(internal.notifications.getUserPushTokens, {
      userId: args.userId,
    });

    console.log(`sendGenericPushNotification Action: Found push tokens for userId=${args.userId}: ${JSON.stringify(pushTokens)}`);

    if (!pushTokens.length) {
      console.log("sendGenericPushNotification Action: No push tokens found for user", args.userId);
      return; // Exit if no tokens to send to
    }

    // Determine sound and channel based on data.type
    const notificationType = args.data?.type;
    const sound = notificationType === 'ring' ? 'ring.wav' : 'urgent.wav';
    const channelId = notificationType === 'ring' ? 'ringChannel' : 'urgentChannel'; // For Android 8+

    console.log(`sendGenericPushNotification Action: Determined sound='${sound}', channelId='${channelId}' based on type='${notificationType}'`);

    // Send to Expo push notification service
    const messages = pushTokens.map((pushToken: string) => ({
      to: pushToken,
      title: args.title,
      body: args.body,
      data: args.data ?? {},
      sound: sound, // Use determined sound
      priority: "high",
      channelId: channelId, // Set channelId for Android 8+ targeting
    }));

    console.log(`sendGenericPushNotification Action: Preparing to send messages payload: ${JSON.stringify(messages, null, 2)}`);

    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });

      const responseText = await response.text();
      console.log(`sendGenericPushNotification Action: Received response status=${response.status}, body=${responseText}`);
      // Optional: Handle response codes/errors from Expo
      // ...

    } catch (error) {
      console.error("sendGenericPushNotification Action: Error sending push notification:", error);
    }
    console.log(`sendGenericPushNotification Action: Finished processing for userId=${args.userId}`);
  },
});

// Internal query to get push tokens for a user
export const getUserPushTokens = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const tokenDocs = await ctx.db
      .query("pushTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    return tokenDocs.map((doc: Doc<"pushTokens">) => doc.token);
  },
});

// --- NEW: Help Notification Settings ---

// Mutation to set or update help notification settings for a patient
export const setOrUpdateHelpNotification = mutation({
  args: {
    patientId: v.id("users"), // The ID of the patient these settings are for
    isActive: v.boolean(),
    intervalMinutes: v.number(), // Interval in minutes
    // patientName is needed if creating, but can be omitted if updating (fetched internally)
    patientName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await getAuthUserId(ctx);
    if (!identity) {
      throw new Error("Unauthorized: Must be logged in.");
    }

    // Check if the user setting this is the patient themselves or a linked caregiver
    const currentUser = await ctx.db.get(identity);
    if (!currentUser) {
      throw new Error("User not found.");
    }

    let isSetByCaregiver = false;
    let caregiverId: Id<"users"> | undefined = undefined;
    let caregiverName: string | undefined = undefined;

    if (currentUser.role === "caregiver") {
      // Verify caregiver is linked to the patient
      // NOTE: Assuming careGiver_id in careGiverToPatient stores the caregiver's User ID (Id<"users">)
      const caregiverLink = await ctx.db
        .query("careGiverToPatient")
        // Filter by caregiver's user ID (identity)
        .filter(q => q.eq(q.field("careGiver_id"), identity))
        .first();

      // Check if the patient ID is actually in the caregiver's list of patients
      const isLinked = caregiverLink?.patients?.some(pId => pId === args.patientId);

      if (!isLinked) {
        console.warn(`Caregiver ${identity} attempting to set help notification for non-linked patient ${args.patientId}`);
        throw new Error("Unauthorized: Caregiver not linked to this patient.");
      }
      isSetByCaregiver = true;
      caregiverId = identity;
      caregiverName = currentUser.name ?? undefined;
    } else if (currentUser.role === "patient" && identity !== args.patientId) {
      throw new Error("Unauthorized: Patients can only set their own help notifications.");
    }
    // If role is patient, isSetByCaregiver remains false

    // Find existing settings for this patient
    const existingSettings = await ctx.db
      .query("helpNotifications")
      .withIndex("by_patient_id", (q) => q.eq("patient_id", args.patientId))
      .first();

    const intervalMilliseconds = args.intervalMinutes * 60 * 1000; // Convert minutes to ms

    if (existingSettings) {
      // Update existing settings
      console.log(`Updating help notification for patient ${args.patientId}`);
      await ctx.db.patch(existingSettings._id, {
        is_active: args.isActive,
        interval: intervalMilliseconds,
        isSetByCareGiver: isSetByCaregiver,
        careGiver_id: caregiverId, // Update who last set it
        careGiver_name: caregiverName,
        // Reset last_notification_time if activating or changing interval significantly?
        // Or keep it to avoid immediate notification? Let's keep it for now.
        // last_notification_time: args.isActive ? Date.now() : existingSettings.last_notification_time, // Option 1: reset on activate
      });
    } else {
      // Create new settings
      console.log(`Creating new help notification for patient ${args.patientId}`);
      const patientDoc = await ctx.db.get(args.patientId);
      const effectivePatientName = args.patientName ?? patientDoc?.name;
      if (!effectivePatientName) {
          throw new Error(`Cannot create help notification: Patient name for ${args.patientId} not found or provided.`);
      }

      await ctx.db.insert("helpNotifications", {
        patient_id: args.patientId,
        patient_name: effectivePatientName, // Fetch or require patient name
        isSetByCareGiver: isSetByCaregiver,
        careGiver_id: caregiverId,
        careGiver_name: caregiverName,
        is_active: args.isActive,
        interval: intervalMilliseconds,
        last_notification_time: Date.now(), // Set initial time to now to avoid immediate trigger
      });
    }

    console.log(`Help notification settings ${existingSettings ? 'updated' : 'created'} for patient ${args.patientId}. Active: ${args.isActive}, Interval: ${args.intervalMinutes} min.`);
    // TODO: Schedule/unschedule the cron/action based on isActive status
    return true; // Indicate success
  },
});

// Internal query used by the public wrapper below
export const getHelpNotificationSettingsInternal = internalQuery({
    args: {
        patientId: v.id("users"), // Always require the patientId to fetch for
    },
    handler: async (ctx, args): Promise<HelpNotificationSettingsResult> => {
        const settings = await ctx.db
        .query("helpNotifications")
        .withIndex("by_patient_id", (q) => q.eq("patient_id", args.patientId))
        .first();

        if (!settings) {
            return null; // No settings found for this patient
        }

        // Convert interval back to minutes for the UI
        const intervalMinutes = settings.interval / (60 * 1000);

        return {
            ...settings,
            intervalMinutes: intervalMinutes,
        };
    },
});

// Public query wrapper for UI to securely fetch settings
export const getMyHelpNotificationSettings = query({
    args: {
        // No args needed from client, patient ID determined from identity
    },
    handler: async (ctx, args): Promise<HelpNotificationSettingsResult> => {
        const identity = await getAuthUserId(ctx);
        if (!identity) {
            // Not logged in, return null or throw error depending on desired behavior
            return null;
        }

        const currentUser = await ctx.db.get(identity);
        if (currentUser?.role !== 'patient') {
            // Only patients can fetch their own settings this way
            // Caregivers would need a different query taking patientId as an arg (with auth checks)
             console.warn(`User ${identity} with role ${currentUser?.role} tried to fetch help settings via getMyHelpNotificationSettings.`);
            return null;
        }

        // Call the internal query using the authenticated patient's ID
        return await ctx.runQuery(internal.notifications.getHelpNotificationSettingsInternal, { patientId: identity });
    }
});

// --- NEW: Cron Job Handler ---

// Internal action called by the cron job to check and send help notifications
export const checkAndSendHelpNotifications = internalAction({
    args: {},
    handler: async (ctx, args) => {
        const now = Date.now();
        console.log(`[Cron Check] Running checkAndSendHelpNotifications at ${new Date(now).toISOString()}`);

        // 1. Find all active help notification settings
        const activeSettings = await ctx.runQuery(internal.notifications_helpers.getActiveHelpSettings, {});

        console.log(`[Cron Check] Found ${activeSettings.length} active help notification settings.`);

        let sentCount = 0;
        // 2. Iterate and check if notification is due
        for (const setting of activeSettings) {
            const timeSinceLast = now - setting.last_notification_time;
            const interval = setting.interval;

            // Check if interval has passed (add a small buffer like 1 second to avoid boundary issues)
            if (timeSinceLast >= interval - 1000) {
                console.log(`[Cron Check] Notification due for patient ${setting.patient_id}. Last sent: ${new Date(setting.last_notification_time).toISOString()}, Interval: ${interval / 60000} mins.`);

                // 3. Send notification
                try {
                    await ctx.runAction(internal.notifications.sendGenericPushNotification, {
                        userId: setting.patient_id,
                        title: "Checking In",
                        body: "Do you need any help right now?",
                        data: { type: "help" } // Mark as help notification
                    });
                    sentCount++;

                    // 4. Update last_notification_time *only after successfully scheduling send*
                    // Must use the internal FunctionReference from the helpers file
                    await ctx.runMutation(internal.notifications_helpers.updateLastNotificationTime, {
                        settingId: setting._id,
                        time: now
                    });
                    console.log(`[Cron Check] Notification sent and last_notification_time updated for patient ${setting.patient_id}`);

                } catch (error) {
                     console.error(`[Cron Check] Failed to send help notification or update time for patient ${setting.patient_id} (settingId: ${setting._id}):`, error);
                     // Decide if you want to retry or just skip updating the time
                }
            } else {
                // console.log(`[Cron Check] Notification not yet due for patient ${setting.patient_id}. Time since last: ${timeSinceLast / 60000} mins, Interval: ${interval / 60000} mins.`);
            }
        }
        console.log(`[Cron Check] Finished. Sent ${sentCount} notifications.`);
        return { sentCount }; // Return value isn't strictly necessary for cron
    },
});

// Helper functions moved to convex/notifications_helpers.ts
