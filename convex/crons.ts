import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Schedule the notification checker to run every minute
crons.interval(
  "Check and Send Help Notifications", // Descriptive name for the job
  { minutes: 1 }, // Run every 1 minute
  internal.notifications.checkAndSendHelpNotifications, // The internal action to run
  {} // Arguments for the action (none needed in this case)
);

export default crons;
