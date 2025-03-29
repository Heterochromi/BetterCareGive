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
    patientID: v.optional(v.string()),
  }).index("email", ["email"]),
  patientToCareGiver: defineTable({
    patient_name: v.string(),
    patient_id: v.string(),
    care_givers: v.optional(v.array(v.id("users"))),
  }),
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
  // Your other tables...
});

export default schema;
