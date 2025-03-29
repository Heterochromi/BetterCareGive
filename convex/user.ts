import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Get the current user's profile information
 * Returns the user's ID, name, and image URL if authenticated
 * Returns null if not authenticated
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    // Check if the user is authenticated
    const identity = await getAuthUserId(ctx);
    if (!identity) {
      return null;
    }
    // Get the user from the users table
    const user = await ctx.db.get(identity);
    if (!user) {
      return null;
    }
    // Return the user's information
    return {
      id: user._id,
      role: user.role,
      name: user.name,
      image: user.image,
      email: user.email,
    };
  },
});

export const pickRole = mutation({
  args: {
    role: v.union(v.literal("caregiver"), v.literal("patient")),
  },
  handler: async (ctx, args) => {
    const identity = await getAuthUserId(ctx);
    if (!identity) {
      return null;
    }
    ctx.db.patch(identity, {
      role: args.role,
    });
  },
});

export const addPatientByEmail = mutation({
  args: {
    patientEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the caregiver's identity
    const caregiverId = await getAuthUserId(ctx);
    if (!caregiverId) {
      throw new Error("Not authenticated");
    }

    // Get the caregiver from the users table
    const caregiver = await ctx.db.get(caregiverId);
    if (!caregiver || caregiver.role !== "caregiver") {
      throw new Error("User is not a caregiver");
    }

    // Find the patient by email
    const patients = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.patientEmail))
      .filter((q) => q.eq(q.field("role"), "patient"))
      .collect();

    if (patients.length === 0) {
      throw new Error("No patient found with that email");
    }

    const patient = patients[0];

    // Check if there's an existing request or relationship
    const existingRequests = await ctx.db
      .query("activeCareGiverRequests")
      .filter((q) => 
        q.eq(q.field("careGiver_id"), caregiverId.toString()) && 
        q.eq(q.field("patient_id"), patient._id.toString())
      )
      .collect();

    if (existingRequests.length > 0) {
      throw new Error("You already have a pending request for this patient");
    }

    // Check if the patient is already assigned to this caregiver
    const existingRelations = await ctx.db
      .query("careGiverToPatient")
      .filter((q) => 
        q.eq(q.field("careGiver_id"), caregiverId.toString()) && 
        q.eq(q.field("patients"), [patient._id])
      )
      .collect();

    if (existingRelations.length > 0) {
      throw new Error("Patient is already under your care");
    }

    // Create a request in the activeCareGiverRequests table
    await ctx.db.insert("activeCareGiverRequests", {
      careGiver_id: caregiverId.toString(),
      patient_id: patient._id.toString(),
      careGiver_name: caregiver.name || "Unknown Caregiver",
      patient_name: patient.name || "Unknown Patient",
    });

    return { 
      success: true, 
      patientName: patient.name,
      message: "Request sent successfully. Waiting for patient confirmation." 
    };
  },
});

export const getCaregiverPatients = query({
  args: {},
  handler: async (ctx) => {
    // Get the caregiver's identity
    const caregiverId = await getAuthUserId(ctx);
    if (!caregiverId) {
      throw new Error("Not authenticated");
    }

    // Get the caregiver from the users table
    const caregiver = await ctx.db.get(caregiverId);
    if (!caregiver || caregiver.role !== "caregiver") {
      throw new Error("User is not a caregiver");
    }

    // Find all the caregiver-patient relationships for this caregiver
    const relations = await ctx.db
      .query("careGiverToPatient")
      .filter((q) => q.eq(q.field("careGiver_id"), caregiverId.toString()))
      .collect();

    // Get the patient details for each relationship
    const patientDetails = await Promise.all(
      relations.map(async (relation) => {
        // Get patient IDs from the patients array
        const patientIds = relation.patients || [];
        if (patientIds.length === 0) return null;
        
        // Get the first patient's details
        const patient = await ctx.db.get(patientIds[0]);
        if (!patient) return null;
        
        return {
          id: patient._id,
          name: patient.name || "Unknown Patient",
          email: patient.email,
          image: patient.image,
        };
      })
    );

    // Filter out any null values and return the patients
    return patientDetails.filter(Boolean);
  },
});

/**
 * Get all pending caregiver requests for the current patient
 */
export const getPatientCareRequests = query({
  args: {},
  handler: async (ctx) => {
    // Get the patient's identity
    const patientId = await getAuthUserId(ctx);
    if (!patientId) {
      throw new Error("Not authenticated");
    }

    // Get the patient from the users table
    const patient = await ctx.db.get(patientId);
    if (!patient || patient.role !== "patient") {
      throw new Error("User is not a patient");
    }

    // Find all pending care requests for this patient
    const requests = await ctx.db
      .query("activeCareGiverRequests")
      .filter((q) => q.eq(q.field("patient_id"), patientId.toString()))
      .collect();

    // Get the caregiver details for each request
    const caregiverRequests = await Promise.all(
      requests.map(async (request) => {
        const caregiverId = request.careGiver_id;
        const caregiver = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("_id"), caregiverId))
          .first();
        
        return {
          requestId: request._id,
          caregiverId: caregiverId,
          caregiverName: request.careGiver_name,
          caregiverImage: caregiver?.image,
          caregiverEmail: caregiver?.email,
        };
      })
    );

    return caregiverRequests;
  },
});

/**
 * Accept a caregiver request
 */
export const acceptCaregiverRequest = mutation({
  args: {
    requestId: v.id("activeCareGiverRequests"),
  },
  handler: async (ctx, args) => {
    // Get the patient's identity
    const patientId = await getAuthUserId(ctx);
    if (!patientId) {
      throw new Error("Not authenticated");
    }

    // Get the patient from the users table
    const patient = await ctx.db.get(patientId);
    if (!patient || patient.role !== "patient") {
      throw new Error("User is not a patient");
    }

    // Get the request
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Request not found");
    }

    // Verify this request is for the current patient
    if (request.patient_id !== patientId.toString()) {
      throw new Error("Request is not for this patient");
    }

    // Get caregiver ID from the string in the request
    const caregiverIdString = request.careGiver_id;
    
    // Query to find the caregiver
    const caregiver = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), caregiverIdString))
      .first();

    if (!caregiver) {
      throw new Error("Caregiver not found");
    }
    
    // Get the actual caregiver ID object
    const caregiverId = caregiver._id;

    // Create the relationship in careGiverToPatient table
    await ctx.db.insert("careGiverToPatient", {
      careGiver_name: caregiver.name || "Unknown Caregiver",
      careGiver_id: caregiverIdString,
      patients: [patientId],
    });

    // Create/update the relationship in patientToCareGiver table
    const patientRelation = await ctx.db
      .query("patientToCareGiver")
      .filter((q) => q.eq(q.field("patient_id"), patientId.toString()))
      .first();

    if (patientRelation) {
      // Update existing relation by adding this caregiver
      const caregivers = patientRelation.care_givers || [];
      if (!caregivers.includes(caregiverId)) {
        await ctx.db.patch(patientRelation._id, {
          care_givers: [...caregivers, caregiverId],
        });
      }
    } else {
      // Create new relation
      await ctx.db.insert("patientToCareGiver", {
        patient_name: patient.name || "Unknown Patient",
        patient_id: patientId.toString(),
        care_givers: [caregiverId],
      });
    }

    // Delete the request
    await ctx.db.delete(args.requestId);

    return { success: true };
  },
});

/**
 * Reject a caregiver request
 */
export const rejectCaregiverRequest = mutation({
  args: {
    requestId: v.id("activeCareGiverRequests"),
  },
  handler: async (ctx, args) => {
    // Get the patient's identity
    const patientId = await getAuthUserId(ctx);
    if (!patientId) {
      throw new Error("Not authenticated");
    }

    // Get the patient from the users table
    const patient = await ctx.db.get(patientId);
    if (!patient || patient.role !== "patient") {
      throw new Error("User is not a patient");
    }

    // Get the request
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Request not found");
    }

    // Verify this request is for the current patient
    if (request.patient_id !== patientId.toString()) {
      throw new Error("Request is not for this patient");
    }

    // Delete the request
    await ctx.db.delete(args.requestId);

    return { success: true };
  },
});
