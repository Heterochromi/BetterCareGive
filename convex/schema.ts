import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,
  patientToCareGiver: defineTable({
    patient_name: v.string(),
    patient_id: v.string(),
    care_givers: v.optional(v.array(v.id("users"))),
  }),
  careGiverToPatient: defineTable({
    patient_name: v.string(),
    patient_id: v.string(),
    patients: v.optional(v.array(v.id("users"))),
  }),
  // Your other tables...
});

export default schema;
