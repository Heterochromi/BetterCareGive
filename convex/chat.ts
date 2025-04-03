import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v4 as uuidv4 } from 'uuid';
import { internal } from "./_generated/api";
import { paginationOptsValidator } from "convex/server";

// Creates a new ongoing call record
export const createCall = mutation({
  args: {
    receiver_id: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if the receiver already has an ongoing call
    const existingCall = await ctx.db
      .query("onGoingCalls")
      .withIndex("by_receiver_id", (q) => q.eq("receiver_id", args.receiver_id))
      .unique();

    if (existingCall) {
      throw new Error(`Receiver ${args.receiver_id} is already in a call.`);
    }

    const identity = await getAuthUserId(ctx);
    if (!identity) {
      return null;
    }
    const caller = await ctx.db.get(identity);
    if (!caller) {
      throw new Error(`User ${identity} not found.`);
    }
    const receiver = await ctx.db.get(args.receiver_id);
    if (!receiver) {
      throw new Error(`User ${args.receiver_id} not found.`);
    }

    const channelName = uuidv4();

    const callId = await ctx.db.insert("onGoingCalls", {
      caller_id: identity,
      caller_name: caller.name ?? "",
      caller_image: caller.image ?? "",
      receiver_id: args.receiver_id,
      receiver_name: receiver.name ?? "",
      receiver_image: receiver.image ?? "",
      channel_name: channelName,
      isCallerJoined: true,
      isReceiverJoined: false,
    });

    // Send push notification to receiver
    await ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification, {
      userId: args.receiver_id,
      title: "Incoming Call",
      body: `${caller.name ?? "Someone"} is calling you`,
      data: {
        type: "call",
        callId: callId,
        channelName: channelName,
        caller: {
          id: identity,
          name: caller.name,
          image: caller.image,
        },
      },
    });

    return callId;
  },
});

// Gets the ongoing call details for a current user
export const getOngoingCallForUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await getAuthUserId(ctx);
    if (!identity) {
        return null;
      }
    const call = await ctx.db
      .query("onGoingCalls")
       .withIndex("by_receiver_id", (q) => q.eq("receiver_id", identity))
      .unique();
    if (call) {
      return call;
    }
    if (!call) {
      const call = await ctx.db
      .query("onGoingCalls")
       .withIndex("by_caller_id", (q) => q.eq("caller_id", identity))
      .unique();
      return call;
    }
    return null;
  },
});

// You might also want a function to end/delete a call
export const endCall = mutation({
    args: { callId: v.id("onGoingCalls") },
    returns: v.null(),
    handler: async (ctx, args) => {
        const existingCall = await ctx.db.get(args.callId);
        if (!existingCall) {
            console.warn(`Call with ID ${args.callId} not found.`);
            return null; // Or throw an error
        }
        const identity = await getAuthUserId(ctx);
        if (identity !== existingCall.receiver_id && identity !== existingCall.caller_id) {
            return null;
        }
        await ctx.db.delete(args.callId);
        console.log(`Call ${args.callId} ended.`);
        return null;
    },
});

// Marks a user (either caller or receiver) as joined in an ongoing call
export const setUserJoined = mutation({
    args: { callId: v.id("onGoingCalls") },
    returns: v.null(),
    handler: async (ctx, args) => {
        const identity = await getAuthUserId(ctx);
        if (!identity) {
            return null; // Or throw an error if authentication is strictly required
        }

        const existingCall = await ctx.db.get(args.callId);

        if (!existingCall) {
            console.warn(`Call with channel name ${args.callId} not found.`);
            return null;
        }

        if (identity === existingCall.caller_id) {
            await ctx.db.patch(existingCall._id, { isCallerJoined: true });
            console.log(`Caller ${identity} joined call ${existingCall._id}`);
        } else if (identity === existingCall.receiver_id) {
            await ctx.db.patch(existingCall._id, { isReceiverJoined: true });
            console.log(`Receiver ${identity} joined call ${existingCall._id}`);
        } else {
            console.error(`User ${identity} is neither caller nor receiver for call ${existingCall._id}`);
            return null; // Or throw an error
        }

        return null;
    },
});

// Gets or creates a chat room between the current user and another user
export const getOrCreateChatRoom = mutation({
  args: {
    otherUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await getAuthUserId(ctx);
    if (!identity) {
      throw new Error("User not authenticated.");
    }

    // Check if a chat room already exists between these two users
    // We need to check both combinations (user A as patient, user B as caregiver AND vice versa)
    let existingRoom = await ctx.db
      .query("chatRooms")
      .filter(q =>
        q.or(
          q.and(q.eq(q.field("patient_id"), identity), q.eq(q.field("careGiver_id"), args.otherUserId)),
          q.and(q.eq(q.field("patient_id"), args.otherUserId), q.eq(q.field("careGiver_id"), identity))
        )
      )
      .first(); // Use first() as there should only be one

    if (existingRoom) {
      return existingRoom._id;
    }

    // If no room exists, create one
    const currentUser = await ctx.db.get(identity);
    const otherUser = await ctx.db.get(args.otherUserId);

    if (!currentUser || !otherUser) {
      throw new Error("One or both users not found.");
    }

    // Determine who is patient and caregiver based on roles or some other logic
    // For now, let's assume the initiator (current user) determines the role split,
    // or perhaps based on the user.role field if it exists.
    // **This logic might need adjustment based on your specific user roles**
    // Let's assume for now the logged-in user is the patient if the other is a caregiver, and vice-versa.
    // Or, more simply, assign based on who initiates? Let's assign the initiator as patient for simplicity here.
    // A more robust solution would check user roles.
    const patientId = identity;
    const careGiverId = args.otherUserId;
    const patientName = currentUser.name ?? "";
    const careGiverName = otherUser.name ?? "";
    const patientImage = currentUser.image ?? "";
    const careGiverImage = otherUser.image ?? "";


    const newRoomId = await ctx.db.insert("chatRooms", {
        // Adjust logic based on actual roles if available
        patient_id: patientId,
        careGiver_id: careGiverId,
        patient_name: patientName,
        careGiver_name: careGiverName,
        patient_image: patientImage,
        careGiver_image: careGiverImage,
    });

    return newRoomId;
  },
});

// Sends a message to a specific chat room
export const sendMessage = mutation({
    args: {
        chatRoom_id: v.id("chatRooms"),
        message: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await getAuthUserId(ctx);
        if (!identity) {
            throw new Error("User not authenticated.");
        }
        const user = await ctx.db.get(identity);
        if (!user) {
             throw new Error("User not found.");
        }

        const chatRoom = await ctx.db.get(args.chatRoom_id);
        if (!chatRoom) {
            throw new Error("Chat room not found.");
        }

        // Determine the recipient ID
        const recipientId = chatRoom.patient_id === identity ? chatRoom.careGiver_id : chatRoom.patient_id;

        // Optional: Could add a check here to ensure sender is patient_id or careGiver_id in the chatRoom doc
        // This check is somewhat redundant given the recipientId logic above, but could be added for robustness.

        await ctx.db.insert("messages", {
            chatRoom_id: args.chatRoom_id,
            message: args.message,
            sender_id: identity,
            sender_name: user.name ?? "",
            sender_image: user.image ?? "",
            // time is handled by _creationTime automatically
        });


        // Send push notification to the recipient
        await ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification, {
          userId: recipientId, // Send to the other user in the chat
          title: `New message from ${user.name ?? "Someone"}`,
          body: args.message, // Use the message content as the body
          data: {
            type: "message", // Change type to message
            chatRoomId: args.chatRoom_id,
            sender: {
              id: identity,
              name: user.name ?? "Unknown Sender",
              image: user.image ?? "",
            },
            messagePreview: args.message.substring(0, 100), // Add a preview
          },
        });
    },
});

// Gets messages for a chat room with pagination
export const getMessages = query({
    args: {
        chatRoom_id: v.id("chatRooms"),
        paginationOpts: paginationOptsValidator, // Use the validator
     },
    handler: async (ctx, args) => {
        const identity = await getAuthUserId(ctx);
        if (!identity) {
           return { page: [], isDone: true, continueCursor: "" }; // Return empty for non-auth users
        }

        // Optional: Add check to ensure user is part of the room

        return await ctx.db
            .query("messages")
            .withIndex("by_chatRoom", (q) => q.eq("chatRoom_id", args.chatRoom_id))
            .order("desc") // Order by creation time, newest first
            .paginate(args.paginationOpts); // Apply pagination
    },
});




