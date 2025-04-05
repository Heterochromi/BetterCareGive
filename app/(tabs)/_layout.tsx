import { Tabs } from "expo-router";
import React from "react";
import { Button, Platform } from "react-native";
import { Redirect } from "expo-router";

import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useConvexAuth } from "convex/react";
import { View, Text } from "react-native";
import { Profile } from "@/components/Profile";
import { VoiceCalls } from "@/components/VoiceCalls";
import { useNotifications } from "@/hooks/useNotifications";
import Seperator from "@/components/Seperator";
import { registerGlobals } from '@livekit/react-native';
import LIVEKIT from "@/components/LiveKit";
export default function TabLayout() {
  const { isLoading, isAuthenticated } = useConvexAuth();

  const colorScheme = useColorScheme();

  const {
    permissionsGranted,
    scheduleLocalNotification,
    requestPermissions,
    expoPushToken,
  } = useNotifications();
  requestPermissions();
  registerGlobals();

  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <>
      <VoiceCalls />
      {/* <LIVEKIT/> */}
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
          headerShown: false,
          header: () => (
            <View style={{ height: 0, position: "absolute" }}></View>
          ),
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarHideOnKeyboard: true,
          tabBarStyle: Platform.select({
            ios: {
              // Use a transparent background on iOS to show the blur effect
              position: "absolute",
            },
            default: {},
          }),
        }}
      >
        <Tabs.Screen
          name="planner"
          options={{
            title: "Planner",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="calendar" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="chatScreen"
          options={{
            title: "Chat",
            tabBarButton: () => (
              <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <Seperator   />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: () => (
              <>
                <Profile />
              </>
            ),
          }}
        />
      </Tabs>
    </>
  );
}
