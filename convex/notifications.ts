import { mutation, action, internalQuery, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

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
    const sound = notificationType === 'ring' ? 'ring.wav' : 'urgent.wav';
    const channelId = notificationType === 'ring' ? 'ringChannel' : 'urgentChannel'; // For Android 8+

    console.log(`sendPushNotification Action: Determined sound='${sound}', channelId='${channelId}' based on type='${notificationType}'`);

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