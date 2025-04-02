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
  }).index("by_receiver_id", ["receiver_id"]),
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
  events: defineTable({
    title: v.string(),
    description: v.string(),
    dateTime: v.number(),
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
});

export default schema;
