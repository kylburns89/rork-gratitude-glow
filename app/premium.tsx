import React, { useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { X, Crown, Check, Sparkles, Download, Bell } from "lucide-react-native";
import { router } from "expo-router";
import { useGratitude } from "@/providers/GratitudeProvider";
let RevenueCatUI: any = null;
if (Platform.OS !== 'web') {
  try {
    // Avoid crashing on web where the native module doesn't exist
    RevenueCatUI = require('react-native-purchases-ui');
  } catch (_) {
    RevenueCatUI = null;
  }
}
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

const features = [
  {
    icon: Sparkles,
    title: "Unlimited Entries",
    description: "Add as many gratitude entries as you want",
  },
  {
    icon: Crown,
    title: "Full Constellation View",
    description: "See your complete galaxy of gratitude",
  },
  {
    icon: Download,
    title: "Export Your Journey",
    description: "Download all your entries as a beautiful PDF",
  },
  {
    icon: Bell,
    title: "Daily Reminders",
    description: "Never forget to practice gratitude",
  },
];

export default function PremiumScreen() {
  const { purchasePremium } = useGratitude();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleClose = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const handleSubscribe = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    try {
      // Use native paywall screen if available
      if (RevenueCatUI?.Paywall && Platform.OS !== 'web') {
        router.push('/paywall');
        return;
      }
      const ok = await purchasePremium();
      if (ok) router.back();
    } catch (e) {
      console.warn('Subscribe failed', e);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={true}
      onRequestClose={handleClose}
    >
      <LinearGradient
        colors={["#0A0E27", "#000814"]}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
              <X size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <LinearGradient
                colors={["#FFD700", "#FFA500"]}
                style={styles.iconContainer}
              >
                <Crown size={32} color="#FFFFFF" />
              </LinearGradient>

              <Text style={styles.title}>Unlock Premium</Text>
              <Text style={styles.subtitle}>
                Expand your gratitude journey with unlimited possibilities
              </Text>

              <View style={styles.features}>
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <View key={index} style={styles.featureItem}>
                      <View style={styles.featureIcon}>
                        <Icon size={20} color="#00D9FF" />
                      </View>
                      <View style={styles.featureContent}>
                        <Text style={styles.featureTitle}>{feature.title}</Text>
                        <Text style={styles.featureDescription}>
                          {feature.description}
                        </Text>
                      </View>
                      <Check size={20} color="#10B981" />
                    </View>
                  );
                })}
              </View>

              <View style={styles.pricing}>
                <Text style={styles.priceLead} testID="pricing-lead">Choose your plan</Text>
                <Text style={styles.priceCombo} testID="pricing-text">$3.99/month or $24.99/year</Text>
                <Text style={styles.discountNote} testID="pricing-discount">(40%+ discount)</Text>
              </View>

              <TouchableOpacity onPress={handleSubscribe} activeOpacity={0.8}>
                <LinearGradient
                  colors={["#00D9FF", "#B24BF3"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.subscribeButton}
                >
                  <Text style={styles.subscribeText} testID="cta-subscribe">Start Free Trial</Text>
                  <Text style={styles.trialText} testID="cta-subscribe-note">7 days free, then $3.99/mo or $24.99/yr</Text>
                </LinearGradient>
              </TouchableOpacity>

              <Text style={styles.terms}>
                Cancel anytime. Terms apply.
              </Text>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
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
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  content: {
    alignItems: "center",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 32,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  features: {
    width: "100%",
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(26, 31, 58, 0.5)",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(178, 75, 243, 0.1)",
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 217, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 12,
    color: "#6B7280",
  },
  pricing: {
    alignItems: "center",
    marginBottom: 24,
  },
  priceLabel: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  price: {
    fontSize: 48,
    fontWeight: "700",
    color: "#00D9FF",
    marginVertical: 4,
  },
  subscribeButton: {
    paddingHorizontal: 48,
    paddingVertical: 20,
    borderRadius: 30,
    alignItems: "center",
    shadowColor: "#B24BF3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  subscribeText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  trialText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
  },
  terms: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 16,
    textAlign: "center",
  },
  priceLead: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  priceCombo: {
    fontSize: 28,
    fontWeight: "700",
    color: "#00D9FF",
    marginTop: 6,
  },
  discountNote: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
});