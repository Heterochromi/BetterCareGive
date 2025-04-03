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
import * as Notifications from 'expo-notifications';
export default function TabLayout() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const {
    permissionsGranted,
    scheduleLocalNotification,
    requestPermissions,
    expoPushToken,
  } = useNotifications();

  requestPermissions();
  const colorScheme = useColorScheme();

  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <>
      <VoiceCalls />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
          headerShown: true,
          header: () => (
            <View style={{ height: 20 }}>
              {/* <Button
                title="test Notifications test Notifications test Notificationstest Notificationstest Notificationstest Notificationstest Notificationstest Notificationstest Notificationstest Notifications"
                onPress={() =>
                  scheduleLocalNotification(
                    {
                      title: "You've got mail! 📬",
                      sound: "mySoundFile.wav", // Provide ONLY the base filename
                    },
                    {
                      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                      seconds: 2,
                      channelId: "new_emails",

                    }
                  )
                }
                >
              </Button> */}
            </View>
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
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="house.fill" color={color} />
            ),
          }}
        />
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
