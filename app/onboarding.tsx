import React, { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, View, Text, Dimensions, ScrollView, NativeScrollEvent, NativeSyntheticEvent, TouchableOpacity, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import colors from "@/constants/colors";
import { ArrowRight, Circle, CircleCheck, Sparkles } from "lucide-react-native";

const { width } = Dimensions.get("window");

const ONBOARDING_KEY = "onboarding_completed";

type Slide = {
  key: string;
  title: string;
  subtitle: string;
  image: string;
};

function OnboardingErrorBoundary({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<Error | null>(null);
  if (error) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.fallback} testID="onboarding-error">
          <Text style={styles.fallbackTitle}>Something went wrong</Text>
          <Text style={styles.fallbackText}>Please restart the app.</Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => setError(null)}
            style={styles.primaryButton}
            testID="onboarding-error-retry"
          >
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View
      onLayout={() => {
        try {
          // no-op, just to have a boundary point
        } catch (e) {
          setError(e as Error);
        }
      }}
      style={{ flex: 1 }}
    >
      {children}
    </View>
  );
}

export default function OnboardingScreen() {
  const slides: Slide[] = useMemo(() => [
    {
      key: "constellation",
      title: "Grow your gratitude constellation",
      subtitle: "Each entry becomes a star. Watch patterns emerge as your habit grows.",
      image: "https://images.unsplash.com/photo-1508261303786-0e3b4e3d0e01?q=80&w=1600&auto=format&fit=crop",
    },
    {
      key: "reflect",
      title: "Reflect in moments that matter",
      subtitle: "Quick prompts help you capture small joys without friction.",
      image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop",
    },
    {
      key: "streaks",
      title: "Build uplifting streaks",
      subtitle: "Stay consistent and see your longest streaks shine.",
      image: "https://images.unsplash.com/photo-1465101162946-4377e57745c3?q=80&w=1600&auto=format&fit=crop",
    },
  ], []);

  const [index, setIndex] = useState<number>(0);
  const scrollRef = useRef<ScrollView | null>(null);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(x / width);
    if (newIndex !== index) setIndex(newIndex);
  }, [index]);

  const complete = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(true));
    } catch (e) {
      console.error("Onboarding: failed to set flag", e);
    } finally {
      router.replace("/");
    }
  }, []);

  const next = useCallback(() => {
    const nextIndex = Math.min(index + 1, slides.length - 1);
    if (nextIndex === index) {
      complete();
      return;
    }
    scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
    setIndex(nextIndex);
  }, [index, slides.length, complete]);

  const skip = useCallback(() => {
    complete();
  }, [complete]);

  const isLast = index === slides.length - 1;

  return (
    <OnboardingErrorBoundary>
      <LinearGradient colors={colors.gradients.background} style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <Sparkles color={colors.primary} size={22} />
              <Text style={styles.brand} testID="onboarding-brand">Gratitude Glow</Text>
            </View>
            <TouchableOpacity onPress={skip} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} testID="onboarding-skip">
              <Text style={styles.skip}>Skip</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            testID="onboarding-scroll"
          >
            {slides.map((s) => (
              <View key={s.key} style={{ width }}>
                <View style={styles.slide}>
                  <View style={styles.imageWrap}>
                    <Image
                      source={{ uri: s.image }}
                      style={styles.image}
                      contentFit="cover"
                      transition={300}
                      cachePolicy="memory-disk"
                      accessibilityIgnoresInvertColors
                    />
                    <LinearGradient
                      colors={["rgba(10,14,39,0)", "rgba(10,14,39,0.7)", "#0A0E27"]}
                      style={styles.imageFade}
                    />
                  </View>
                  <View style={styles.textBlock}>
                    <Text style={styles.title} testID={`onboarding-title-${s.key}`}>{s.title}</Text>
                    <Text style={styles.subtitle} testID={`onboarding-subtitle-${s.key}`}>{s.subtitle}</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.dots} accessibilityRole="tablist">
              {slides.map((s, i) => (
                <View key={s.key} style={styles.dotWrap}>
                  {i === index ? (
                    <CircleCheck size={14} color={colors.primary} />
                  ) : (
                    <Circle size={14} color={colors.textMuted} />
                  )}
                </View>
              ))}
            </View>

            <TouchableOpacity
              onPress={next}
              accessibilityRole="button"
              style={[styles.primaryButton, isLast && styles.primaryButtonWide]}
              testID="onboarding-next"
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>{isLast ? "Get Started" : "Next"}</Text>
              {!isLast && <ArrowRight size={18} color={colors.text} style={{ marginLeft: 8 }} />}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </OnboardingErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoRow: { flexDirection: "row", alignItems: "center" },
  brand: { color: colors.text, fontSize: 16, fontWeight: "600" as const, marginLeft: 8 },
  skip: { color: colors.textSecondary, fontSize: 14 },
  slide: { flex: 1, paddingHorizontal: 20, justifyContent: "flex-end" },
  imageWrap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  image: { width: "100%", height: "100%", borderRadius: 0 },
  imageFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 220,
  },
  textBlock: { paddingBottom: 24 },
  title: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700" as const,
    marginBottom: 8,
  },
  subtitle: { color: colors.textSecondary, fontSize: 16, lineHeight: 22 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 16 : 12,
  },
  dots: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  dotWrap: { marginHorizontal: 6 },
  primaryButton: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  primaryButtonWide: { width: "100%" },
  primaryButtonText: { color: colors.text, fontSize: 16, fontWeight: "600" as const },
  fallback: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  fallbackTitle: { color: colors.text, fontSize: 20, fontWeight: "700" as const, marginBottom: 8 },
  fallbackText: { color: colors.textSecondary, fontSize: 14, marginBottom: 16 },
});
