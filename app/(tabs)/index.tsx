import React, { useRef, useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Plus, Lock } from "lucide-react-native";
import { router } from "expo-router";
import { useGratitude } from "@/providers/GratitudeProvider";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import ConstellationView from "@/components/ConstellationView";
import ProGate from "@/components/ProGate";
import colors from "@/constants/colors";

const { width, height } = Dimensions.get("window");

export default function ConstellationScreen() {
  const { entries, isPremium, stats } = useGratitude();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [showPrompt, setShowPrompt] = useState(true);

  useEffect(() => {
    Animated.stagger(200, [
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim, pulseAnim]);

  const handleAddEntry = async () => {
    // Add button press animation
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(pulseAnim, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    if (!isPremium && entries.length >= 30) {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      router.push("/premium");
      return;
    }
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/add-entry");
  };

  const todayPrompt = "What small moment brought you joy today?";

  return (
    <LinearGradient
      colors={colors.gradients.background}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <Text style={styles.title}>Gratitude Glow</Text>
          <Text style={styles.subtitle}>Your constellation of gratitude</Text>
        </Animated.View>

        {showPrompt && entries.length === 0 && (
          <Animated.View 
            style={[
              styles.promptCard, 
              { 
                opacity: fadeAnim,
                transform: [{
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  })
                }]
              }
            ]}
          >
            <LinearGradient
              colors={colors.gradients.surface}
              style={styles.promptGradient}
            >
              <Text style={styles.promptTitle}>Today's Reflection</Text>
              <Text style={styles.promptText}>{todayPrompt}</Text>
            </LinearGradient>
          </Animated.View>
        )}

        <View style={styles.constellationContainer}>
          <ConstellationView entries={entries} isPremium={isPremium} />
        </View>


        <Animated.View 
          style={{ 
            transform: [{ scale: pulseAnim }],
            opacity: fadeAnim,
          }}
        >
          <TouchableOpacity 
            onPress={handleAddEntry} 
            activeOpacity={0.8}
            style={{
              transform: [{ scale: 1 }]
            }}
          >
            <LinearGradient
              colors={colors.gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.addButton}
            >
              <Animated.View
                style={{
                  transform: [{
                    rotate: pulseAnim.interpolate({
                      inputRange: [1, 1.05],
                      outputRange: ['0deg', '5deg'],
                    })
                  }]
                }}
              >
                {!isPremium && entries.length >= 30 ? (
                  <Lock size={28} color={colors.text} />
                ) : (
                  <Plus size={28} color={colors.text} />
                )}
              </Animated.View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  promptCard: {
    marginHorizontal: 24,
    marginBottom: 20,
  },
  promptGradient: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  promptTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.secondary,
    marginBottom: 8,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },
  promptText: {
    fontSize: 18,
    color: colors.text,
    lineHeight: 26,
  },
  constellationContainer: {
    flex: 1,
    marginHorizontal: 24,
    marginVertical: 20,
  },
  addButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 20,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});