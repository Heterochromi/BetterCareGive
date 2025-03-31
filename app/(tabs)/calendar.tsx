import React from 'react';
import { Stack } from 'expo-router';
import { Calendar } from '@/components/Calendar';
import { View } from 'react-native';

export default function CalendarPage() {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: 'Calendar',
          headerLargeTitle: true,
        }}
      />
      <Calendar />
    </View>
  );
} 