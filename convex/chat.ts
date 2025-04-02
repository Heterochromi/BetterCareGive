import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v4 as uuidv4 } from 'uuid';
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
      isCallerJoined: false,
      isReceiverJoined: false,
    });
    return callId;
  },
});

// Gets the ongoing call details for a specific user (receiver)
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
    return call;
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

// Marks the receiver as joined in an ongoing call
export const setReceiverJoined = mutation({
    args: { callId: v.id("onGoingCalls") },
    returns: v.null(),
    handler: async (ctx, args) => {
        const identity = await getAuthUserId(ctx);
        const existingCall = await ctx.db.get(args.callId);

        if (!existingCall) {
            console.warn(`Call with ID ${args.callId} not found for joining.`);
            return null;
        }

        // Ensure the user calling this is the intended receiver
        if (identity !== existingCall.receiver_id) {
            console.error(`User ${identity} attempted to join call ${args.callId} intended for ${existingCall.receiver_id}`);
            // Optionally throw an error or just return null
             return null;
            // throw new Error("Unauthorized: Cannot join call not intended for you.");
        }

        // Only update if not already joined
        if (!existingCall.isReceiverJoined) {
            await ctx.db.patch(args.callId, { isReceiverJoined: true });
            console.log(`Receiver ${identity} joined call ${args.callId}.`);
        } else {
             console.log(`Receiver ${identity} is already joined in call ${args.callId}.`);
        }

        return null;
    },
});




