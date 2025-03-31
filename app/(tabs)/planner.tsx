import React from 'react';
import { Calendar } from '@/components/Calendar';
import { View } from 'react-native';

export default function Planner() {
  return (
    <View style={{ flex: 1 }}>
    <Calendar />
    </View>
  );
} 