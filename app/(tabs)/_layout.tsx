import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Redirect } from 'expo-router';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useConvexAuth } from "convex/react";
import { View , Text } from 'react-native';
import {Profile} from '@/components/Profile';
export default function TabLayout() {
  const { isLoading, isAuthenticated  } = useConvexAuth();

  const colorScheme = useColorScheme();

  if (!isLoading &&!isAuthenticated) {
    return <Redirect href="/sign-in" />;
  }

  return (
  <>
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarHideOnKeyboard: true,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute',
          },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: () => <><Profile/></>,
        }}
      />
    </Tabs>
  </>
  );
}
