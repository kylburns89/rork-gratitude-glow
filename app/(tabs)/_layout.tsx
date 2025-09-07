import { Tabs } from "expo-router";
import { Sparkles, Clock, User, Trophy } from "lucide-react-native";
import React from "react";
import { Platform } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#00D9FF",
        tabBarInactiveTintColor: "#6B7280",
        tabBarStyle: {
          backgroundColor: "#0A0E27",
          borderTopColor: "#1A1F3A",
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 0 : 5,
          height: Platform.OS === 'ios' ? 85 : 60,
        },
        headerStyle: {
          backgroundColor: "#0A0E27",
          shadowColor: "transparent",
          elevation: 0,
        },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: {
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Constellation",
          headerShown: false,
          tabBarIcon: ({ color }) => <Sparkles size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="timeline"
        options={{
          title: "Timeline",
          headerTitle: "Your Journey",
          tabBarIcon: ({ color }) => <Clock size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="accomplishments"
        options={{
          title: "Accomplishments",
          headerTitle: "Accomplishments",
          tabBarIcon: ({ color }) => <Trophy size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerTitle: "Your Profile",
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}