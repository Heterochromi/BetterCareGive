import React, { useState } from 'react';
import { View, StyleSheet, Text, Image, TouchableOpacity, Platform } from 'react-native';
import { openAuthSessionAsync } from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { useAuthActions } from "@convex-dev/auth/react";
import { GoogleLogo } from '@/assets/svgs/svgs';
import { Redirect } from 'expo-router';
import { useConvexAuth } from "convex/react";

const redirectTo = makeRedirectUri();

function SignIn() {
    const { isLoading, isAuthenticated } = useConvexAuth();
  
      if (!isAuthenticated) {
        return <Redirect href="/(tabs)" />;
      }
  const { signIn } = useAuthActions();
  const handleSignIn = async () => {
    const { redirect } = await signIn("google", { redirectTo });
    if (Platform.OS === "web") {
      return;
    }
    const result = await openAuthSessionAsync(redirect!.toString(), redirectTo);
    if (result.type === "success") {
      const { url } = result;
      const code = new URL(url).searchParams.get("code")!;
      await signIn("google", { code });
      // Navigate to the tabs screen after successful sign-in
    }
  };
  return (
    <TouchableOpacity onPress={handleSignIn} style={styles.googleButton}>
      <View style={styles.buttonContent}>
        <GoogleLogo width={30} height={30}/>
        <Text style={styles.buttonText}>Continue with Google</Text>
        <View></View>
      </View>
    </TouchableOpacity>
  );
}

export default function SignInScreen() {
  return (
    <View style={styles.container}>
     <SignIn/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 8,
  },
  googleButton: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    borderWidth: 1,
    borderColor: '#dadce0',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonText: {
    color: '#3c4043',
    fontSize: 17,
    fontWeight: '500',
  }
});