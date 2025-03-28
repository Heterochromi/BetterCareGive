import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";
import { ConvexReactClient } from "convex/react";
import { useColorScheme } from "@/hooks/useColorScheme";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ClerkProvider publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <RootLayoutNav />
          <StatusBar style="auto" />
        </ConvexProviderWithClerk>
      </ThemeProvider>
    </ClerkProvider>
  );
}

function RootLayoutNav() {
  const { isSignedIn, isLoaded } = useAuth();

  // Wait for auth to load before deciding navigation
  useEffect(() => {
    if (!isLoaded) return;
    
    if (!isSignedIn) {
      router.replace('/sign-in');
    } else {
      router.replace('/(tabs)');
    }
  }, [isLoaded, isSignedIn]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {!isSignedIn ? (
        <>
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="sign-up" />
        </>
      ) : (
        <Stack.Screen name="(tabs)" />
      )}
    </Stack>
  );
}
