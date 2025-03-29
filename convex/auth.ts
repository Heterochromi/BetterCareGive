import { convexAuth } from "@convex-dev/auth/server";
import Google from "@auth/core/providers/google";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
    providers: [
        Google({
          profile(googleProfile) {
            return {
              id: googleProfile.sub, // Google uses 'sub' as the unique identifier
              name: googleProfile.name,
              email: googleProfile.email,
              image: googleProfile.picture, // This is the Google profile image URL
            };
          },
        }),
      ],
    callbacks: {
      async redirect({ redirectTo }) {
        // Allow redirects to both your app scheme and Expo development URLs
        if (
          redirectTo.startsWith("myapp:/") ||
          redirectTo.startsWith("exp://")
        ) {
          return redirectTo;
        }
        throw new Error(`Invalid redirectTo URI ${redirectTo}`);
      },
    },
  });