import { Image, StyleSheet, Platform, Button, TextInput } from 'react-native';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Link } from 'expo-router';
import { View } from 'react-native';
import React from 'react';

export default function HomeScreen() {
  // const tasks = useQuery(api.tasks.get);
  const [text, setText] = React.useState('stuff');

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      {/* <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">ST</ThemedText>
        <HelloWave />
      </ThemedView>
      {tasks?.map(({ _id, text }) => <ThemedText key={_id}>{text}</ThemedText>)}
      <TextInput style={{color:"white"}} value={text} onChange={(e) => {
        setText(e.target.value);
      }}></TextInput> */}
      
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
