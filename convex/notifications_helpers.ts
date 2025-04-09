import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx } from "./_generated/server";

// Helper internal query to get active settings (used by the cron action)
export const getActiveHelpSettings = internalQuery({
    args: {},
    handler: async (ctx: QueryCtx, args: {}) => {
        return await ctx.db
            .query("helpNotifications")
            .filter(q => q.eq(q.field("is_active"), true))
            .collect();
    }
});

// Helper internal mutation to update only the timestamp (used by the cron action)
export const updateLastNotificationTime = internalMutation({
    args: {
        settingId: v.id("helpNotifications"),
        time: v.number()
    },
    handler: async (ctx: MutationCtx, args: { settingId: Id<"helpNotifications">, time: number }) => {
        await ctx.db.patch(args.settingId, { last_notification_time: args.time });
    }
}); 