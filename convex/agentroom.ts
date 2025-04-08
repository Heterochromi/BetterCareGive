import { internalMutation, query , mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getPatientInfo = internalQuery({
  args: {
    patient_id: v.id("users")
  },
  handler: async (ctx, args) => {
    const patient =  await ctx.db.get(args.patient_id);
    return patient;
  }
});



export const createAgentRoom = internalMutation({
  args: {
    patient_id: v.id("users"),
    room_name: v.string(),
    token: v.string(),
  },
  returns: v.id("activeAgentRooms"),
  handler: async (ctx, args): Promise<Id<"activeAgentRooms">> => {
    const roomId = await ctx.db.insert("activeAgentRooms", {
      patient_id: args.patient_id,
      room_name: args.room_name,
      token: args.token,
    });
    return roomId;
  },
});

export const deleteAgentRoom = mutation({
  args: {  },
  returns: v.null(),
  handler: async (ctx, args): Promise<void> => {
    const identity = await getAuthUserId(ctx);
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const room = await ctx.db.query("activeAgentRooms").withIndex("by_patient_id", (q) => q.eq("patient_id", identity)).first();
    if (!room) {
      throw new Error("Room not found");
    }
    await ctx.db.delete(room._id);
  },
});

export const getAgentRoom = query({
  handler: async (ctx) => {
    const identity = await getAuthUserId(ctx);
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const room = await ctx.db.query("activeAgentRooms").withIndex("by_patient_id", (q) => q.eq("patient_id", identity)).first();

    return {token: room?.token ?? ""};
  },
});
