import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Crons } from "@convex-dev/crons";
import { components, internal } from "./_generated/api";

const crons = new Crons(components.crons);

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
    const identity = await getAuthUserId(ctx);
    if (!identity) {
      throw new Error("Unauthorized");
    }

    let userId = identity;

    if(args.isSetByCareGiver) {
      userId = args.patient.id
    }

    // Insert the event with the new dateTime field
    const eventId = await ctx.db.insert("events", {
      title: args.title,
      description: args.description,
      dateTime: args.dateTime,
      patient: args.patient,
      isSetByCareGiver: args.isSetByCareGiver ?? false,
      careGiver: args.careGiver,
      userId: userId,
      isRepeat: args.isRepeat,
      repeat: args.repeat,
    });

    if(!args.isRepeat) {
      await ctx.scheduler.runAt(args.dateTime, internal.notifications.sendPushNotification, {
        userId: userId, // Send to the other user in the chat
        title: `Scheduled Event: ${args.title}`,
        body: `Time for ${args.title}`, // Use the message content as the body
        data: {
          type: "event",
          eventId: eventId,
        },
      });
    }
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
  args: {
    patientID: v.optional(v.id("users"))
  },
  returns: v.array(eventObjectValidator),
  handler: async (ctx , args) => {
    const identity = await getAuthUserId(ctx);
    if (!identity) {
      return [];
    }
    
    let userID = identity;
    const user = await ctx.db.get(identity);
    
    if (user?.role === "patient") {
      // Patient viewing their own events - userID is already set to identity
    } else if (user?.role === "caregiver") {
      // Only proceed with patient check if patientID is provided
      if (args.patientID) {
        const existingCareGiver = await ctx.db.query("careGiverToPatient")
          .filter((q) => q.eq(q.field("careGiver_id"), identity))
          .collect();
          
        if (existingCareGiver.length === 0) {
          throw new Error("User is not a care giver");
        }
        
        // Check if this caregiver has access to the specified patient
        const hasAccess = existingCareGiver.some(x => 
          x.patients && x.patients.some(patientId => 
            patientId === args.patientID
          )
        );
        
        if (!hasAccess) {
          throw new Error("Caregiver does not have access to this patient");
        }
        
        // Set userID to the patient's ID to get their events
        userID = args.patientID;
      }
    }
    
    // Filter events based on the determined userID
    const events = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("userId"), userID))
      .order("desc")
      .collect();

    return events;
  },
});

export const deleteEvent = mutation({
  args: { eventId: v.id("events") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Make sure getAuthUserId returns Id<"users"> or handle potential string case
    const identity = await getAuthUserId(ctx);
    if (!identity) {
      throw new Error("Unauthorized: No user identity found.");
    }

    // Get the event to be deleted
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      console.warn(`Event with ID ${args.eventId} not found for deletion.`);
      return null;
    }

    const patientId = event.patient.id; // This is Id<"users">

    // Authorization check:
    // 1. Allow deletion if the current user is the patient the event belongs to.
    const isPatientOwner = patientId === identity;

    // 2. Allow deletion if the current user is a caregiver linked to the patient.
    let isLinkedCaregiver = false;
    if (!isPatientOwner) {
        // NOTE: Querying patientToCareGiver using filter because no index is defined.
        // For performance, add `.index("by_patient_id", ["patient_id"])` to patientToCareGiver in schema.ts.
        // ALSO NOTE: Schema defines patient_id as v.string(), but it should likely be v.id("users").
        // Using patientId.toString() here to match the schema, but correcting the schema is recommended.
        const patientCaregiversDoc = await ctx.db
            .query("patientToCareGiver")
            .filter(q => q.eq(q.field("patient_id"), patientId.toString())) // Filter by string representation
            .unique();

        if (patientCaregiversDoc && patientCaregiversDoc.care_givers) {
            // Check if the current user's Id<"users"> is in the array (care_givers is correctly typed)
            isLinkedCaregiver = patientCaregiversDoc.care_givers.includes(identity);
        }
    }

    if (!isPatientOwner && !isLinkedCaregiver) {
      throw new Error("Unauthorized: User is not permitted to delete this event.");
    }

    // Delete the event
    await ctx.db.delete(args.eventId);
    console.log(`Event ${args.eventId} deleted by user ${identity}`);
    return null;
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