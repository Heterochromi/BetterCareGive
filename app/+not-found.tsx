import { useConvexAuth } from 'convex/react';
import { Link, Redirect, Stack, useRouter } from 'expo-router';
import { StyleSheet, View, Text, Pressable } from 'react-native';

export default function NotFoundScreen() {
  const router = useRouter();
  const { isAuthenticated , isLoading } = useConvexAuth();
  if (isAuthenticated && !isLoading) {
    return <Redirect href="/(tabs)/profile" />;
  } else if (!isAuthenticated && !isLoading) {
    return <Redirect href="/sign-in" />;
  }
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn't exist.</Text>
        <Pressable onPress={() => router.replace('/(tabs)/planner')} style={styles.link}>
          <Text style={styles.linkText}>Go to home screen!</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: '#2e78b7',
  },
}); 