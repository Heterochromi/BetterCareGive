import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

// Define the validator for the patient object based on the schema
const patientValidator = v.object({
  id: v.id("users"),
  patient_name: v.string(),
});

// Define the validator for the optional caregiver object based on the schema
const caregiverValidator = v.optional(
  v.object({
    id: v.id("users"),
    // Schema uses patient_name here, ensure this matches your intent
    patient_name: v.string(),
  })
);

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    dateTime: v.number(),
    patient: patientValidator,
    isSetByCareGiver: v.optional(v.boolean()),
    careGiver: caregiverValidator,
    isRepeat: v.optional(v.boolean()),
    repeat: v.optional(
      v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"))
    ),
  },
  returns: v.id("events"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const userId = identity.subject;

    // Insert the event with the new dateTime field
    const eventId = await ctx.db.insert("events", {
      title: args.title,
      description: args.description,
      dateTime: args.dateTime,
      patient: args.patient,
      isSetByCareGiver: args.isSetByCareGiver,
      careGiver: args.careGiver,
      userId: userId,
      isRepeat: args.isRepeat,
      repeat: args.repeat,
    });

    return eventId;
  },
});

// Define the full event object validator for query returns
const eventObjectValidator = v.object({
  _id: v.id("events"),
  _creationTime: v.number(),
  title: v.string(),
  description: v.string(),
  dateTime: v.number(),
  patient: patientValidator,
  isSetByCareGiver: v.optional(v.boolean()),
  careGiver: caregiverValidator,
  userId: v.string(),
  isRepeat: v.optional(v.boolean()),
  repeat: v.optional(
    v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"))
  ),
});

export const list = query({
  args: {},
  returns: v.array(eventObjectValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userId = identity.subject;

    // TODO: Refine filtering based on user role (patient/caregiver relationships)
    const events = await ctx.db
      .query("events")
      // This filter needs refinement
      .filter((q) => q.eq(q.field("userId"), userId)) // Simplistic user filter
      // Consider ordering by dateTime
      .order("desc") // Example: order by most recent first
      .collect();

    return events;
  },
});

// Get events within a specific day (start and end timestamps)
export const getByDateRange = query({
  args: { startOfDay: v.number(), endOfDay: v.number() },
  returns: v.array(eventObjectValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userId = identity.subject;

    // TODO: Refine filtering based on user role and relationships
    const events = await ctx.db
      .query("events")
      // Filter by user (needs refinement) AND dateTime range
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), userId), // Simplistic user filter
          q.gte(q.field("dateTime"), args.startOfDay),
          q.lt(q.field("dateTime"), args.endOfDay)
        )
      )
      // Consider ordering by dateTime within the day
      .order("asc")
      .collect();

    return events;
  },
});

// Keep the old getByDate for now but mark as deprecated or remove later
// Or modify it to calculate start/end internally if needed, though less efficient
// export const getByDate = ... (old implementation)