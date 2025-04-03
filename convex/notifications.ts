import { mutation, action, internalQuery, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

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

// Send a push notification to a specific user
export const sendPushNotification = internalAction({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // DETAILED LOGGING START
    console.log(`sendPushNotification Action: Starting for userId=${args.userId}, title=${args.title}, body=${args.body}, data=${JSON.stringify(args.data)}`);
    // DETAILED LOGGING END

    // Get all push tokens for this user
    const pushTokens = await ctx.runQuery(internal.notifications.getUserPushTokens, {
      userId: args.userId,
    });

    // DETAILED LOGGING START
    console.log(`sendPushNotification Action: Found push tokens: ${JSON.stringify(pushTokens)}`);
    // DETAILED LOGGING END

    if (!pushTokens.length) {
      console.log("sendPushNotification Action: No push tokens found for user", args.userId);
      return;
    }

    // Send to Expo push notification service
    const messages = pushTokens.map((pushToken: string) => ({
      to: pushToken,
      title: args.title,
      body: args.body,
      data: args.data ?? {},
      sound: "default",
      priority: "high",
    }));

    // DETAILED LOGGING START
    console.log(`sendPushNotification Action: Preparing to send messages payload: ${JSON.stringify(messages, null, 2)}`);
    // DETAILED LOGGING END

    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });

      // DETAILED LOGGING START
      const responseText = await response.text(); // Read response body as text first
      console.log(`sendPushNotification Action: Received response status=${response.status}, body=${responseText}`);
      // Try parsing as JSON, but handle potential errors if body isn't valid JSON
      let result;
      try {
        result = JSON.parse(responseText);
        console.log("sendPushNotification Action: Parsed push notification result:", JSON.stringify(result, null, 2));
      } catch (parseError) {
        console.error("sendPushNotification Action: Failed to parse response body as JSON", parseError);
        result = { error: "Failed to parse response", body: responseText };
      }
      // DETAILED LOGGING END

    } catch (error) {
      console.error("sendPushNotification Action: Error sending push notification:", error);
    }
    // DETAILED LOGGING START
    console.log(`sendPushNotification Action: Finished for userId=${args.userId}`);
    // DETAILED LOGGING END
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