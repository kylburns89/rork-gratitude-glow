import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { GratitudeProvider } from "@/providers/GratitudeProvider";
import { useEffect as useEffectRC } from 'react';
import { configureRevenueCat } from "@/lib/revenuecat";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { trpc, trpcClient } from "@/lib/trpc";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const ONBOARDING_KEY = "onboarding_completed";

function RootLayoutNav() {
  useEffect(() => {
    let mounted = true;
    const checkOnboarding = async () => {
      try {
        const flag = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (!flag) {
          router.replace("/onboarding");
        }
      } catch (e) {
        console.error("RootLayoutNav: failed to read onboarding flag", e);
      } finally {
        // no-op
      }
    };
    checkOnboarding();
    return () => { mounted = false; };
  }, []);

  return (
    <Stack screenOptions={{ 
      headerBackTitle: "Back",
      headerStyle: {
        backgroundColor: '#0A0E27',
      },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: {
        fontWeight: '600',
      },
      contentStyle: {
        backgroundColor: '#0A0E27',
      },
    }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="onboarding"
        options={{
          headerShown: false,
          presentation: "modal",
          contentStyle: { backgroundColor: '#0A0E27' },
        }}
      />
      <Stack.Screen 
        name="add-entry" 
        options={{ 
          presentation: "transparentModal",
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
        }} 
      />
      <Stack.Screen 
        name="entry-detail" 
        options={{ 
          presentation: "transparentModal",
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
        }} 
      />
      <Stack.Screen 
        name="premium" 
        options={{ 
          presentation: "modal",
          headerShown: false,
          contentStyle: { backgroundColor: '#0A0E27' },
        }} 
      />
      <Stack.Screen 
        name="paywall" 
        options={{ 
          presentation: "modal",
          headerShown: false,
          contentStyle: { backgroundColor: '#0A0E27' },
        }} 
      />
      <Stack.Screen 
        name="reminders"
        options={{
          presentation: 'card',
          headerShown: true,
          title: 'Reminders',
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffectRC(() => {
    configureRevenueCat();
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0A0E27' }}>
          <GratitudeProvider>
            <RootLayoutNav />
          </GratitudeProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </trpc.Provider>
  );
}