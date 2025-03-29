import { query } from "./_generated/server";
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
      name: user.name,
      image: user.image
    };
  },
});

