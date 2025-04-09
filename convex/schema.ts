import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,
  users: defineTable({
    // Include all the default fields from authTables.users
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    role: v.optional(v.union(v.literal("caregiver"), v.literal("patient"))),
  }).index("email", ["email"]),
  pushTokens: defineTable({
    userId: v.id("users"),
    token: v.string(),
    deviceId: v.string(),
  }).index("by_user", ["userId"]),
  patientToCareGiver: defineTable({
    patient_name: v.string(),
    patient_id: v.string(),
    care_givers: v.optional(v.array(v.id("users"))),
  }),
  onGoingCalls: defineTable({
    caller_id: v.id("users"),
    caller_name: v.string(),
    caller_image: v.string(),
    isCallerJoined: v.boolean(),
    receiver_id: v.id("users"),
    receiver_name: v.string(),
    receiver_image: v.string(),
    isReceiverJoined: v.boolean(),
    channel_name: v.string(),
  }).index("by_receiver_id", ["receiver_id"]).index("by_caller_id", ["caller_id"]).index("by_channel_name", ["channel_name"]),
  careGiverToPatient: defineTable({
    careGiver_name: v.string(),
    careGiver_id: v.string(),
    patients: v.optional(v.array(v.id("users"))),
  }),
  activeCareGiverRequests: defineTable({
    careGiver_id: v.string(),
    patient_id: v.string(),
    patient_name: v.string(),
    careGiver_name: v.string(),
  }),
  helpNotifications: defineTable({
    patient_id: v.id("users"),
    patient_name: v.string(),
    isSetByCareGiver: v.boolean(),
    careGiver_id: v.optional(v.id("users")),
    careGiver_name: v.optional(v.string()),
    is_active: v.boolean(),
    interval: v.number(),
    last_notification_time: v.number(),
  }).index("by_patient_id", ["patient_id"]),
  events: defineTable({
    title: v.string(),
    description: v.string(),
    dateTime: v.number(),
    userLocalDateAndTime: v.string(),
    patient:v.object({
      id:v.id("users"),
      patient_name: v.string(),
    }),
    isSetByCareGiver:v.optional(v.boolean()),
    careGiver:v.optional(v.object({
      id:v.id("users"),
      patient_name: v.string(),
    })),
    userId: v.string(),
    isRepeat:v.optional(v.boolean()),
    repeat:v.optional(v.union(v.literal("daily"), v.literal("weekly") , v.literal("monthly"))),
  }),
  chatRooms: defineTable({
    patient_id: v.id("users"),
    careGiver_id: v.id("users"),
    patient_name: v.string(),
    careGiver_name: v.string(),
    patient_image: v.string(),
    careGiver_image: v.string(),
  }),
  activeAgentRooms: defineTable({
    patient_id: v.id("users"),
    room_name: v.string(),
    token: v.string(),
  }).index("by_patient_id", ["patient_id"]),
  messages: defineTable({
    chatRoom_id: v.id("chatRooms"),
    message: v.string(),
    sender_id: v.id("users"),
    sender_name: v.string(),
    sender_image: v.string(),
  }).index("by_chatRoom", ["chatRoom_id"])
});

export default schema;
