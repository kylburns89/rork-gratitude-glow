import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Keyboard,
  LayoutChangeEvent,
  Modal,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { X, Sparkles } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useGratitude } from "@/providers/GratitudeProvider";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import colors from "@/constants/colors";

const MAX_CHARS = 280;

function AnimatedChip({ suggestion, index, onPress }: {
  suggestion: string;
  index: number;
  onPress: () => void;
}) {
  const chipFadeAnim = useRef(new Animated.Value(0)).current;
  const chipSlideAnim = useRef(new Animated.Value(20)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(chipFadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(chipSlideAnim, {
        toValue: 0,
        duration: 300,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [chipFadeAnim, chipSlideAnim, index]);
  
  return (
    <Animated.View
      style={{
        opacity: chipFadeAnim,
        transform: [{ translateY: chipSlideAnim }],
      }}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <LinearGradient
          colors={colors.gradients.surface}
          style={styles.stickyChip}
        >
          <Text style={styles.stickyChipText}>{suggestion}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function AddEntryScreen() {
  const params = useLocalSearchParams();
  const editingId = typeof params?.id === 'string' ? params.id : undefined;
  const { addEntry, updateEntry, entries } = useGratitude();
  const existingText = editingId ? (entries.find(e => e.id === editingId)?.text ?? "") : "";
  const [text, setText] = useState<string>(existingText);
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const [bottomBarHeight, setBottomBarHeight] = useState<number>(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const onShow = (e: any) => {
      const height: number = e?.endCoordinates?.height ?? 0;
      setKeyboardHeight(height);
      setIsKeyboardVisible(true);
      console.log('[AddEntry] Keyboard show height:', height);
    };
    const onHide = () => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
      console.log('[AddEntry] Keyboard hide');
    };

    const subShow = Platform.OS === 'ios' ? Keyboard.addListener('keyboardWillShow', onShow) : Keyboard.addListener('keyboardDidShow', onShow);
    const subHide = Platform.OS === 'ios' ? Keyboard.addListener('keyboardWillHide', onHide) : Keyboard.addListener('keyboardDidHide', onHide);

    Animated.stagger(100, [
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      inputRef.current?.focus();
    }, 500);

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (editingId) {
      const latest = entries.find(e => e.id === editingId)?.text ?? "";
      setText(latest);
    }
  }, [editingId, entries]);

  const handleSave = async () => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    
    // Animate success feedback
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    try {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {}
    
    if (editingId) {
      updateEntry(editingId, trimmed);
    } else {
      addEntry(trimmed);
    }
    
    // Animate out before closing
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.back();
    });
  };

  const handleClose = async () => {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {}
    
    // Animate out before closing
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.back();
    });
  };

  const remainingChars = MAX_CHARS - text.length;
  const charCountColor = remainingChars < 20 ? colors.error : colors.textMuted;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={true}
      onRequestClose={handleClose}
    >
      <LinearGradient
        colors={colors.gradients.constellation}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Math.max(insets.top, 12)}
            style={styles.keyboardView}
          >
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
              <TouchableOpacity onPress={handleClose} activeOpacity={0.7} testID="close-button">
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{editingId ? 'Edit Gratitude' : 'Add Gratitude'}</Text>
              <TouchableOpacity
                onPress={handleSave}
                disabled={text.trim().length === 0}
                activeOpacity={0.7}
                testID="save-button"
              >
                <Text style={[
                  styles.saveButton,
                  text.trim().length === 0 && styles.saveButtonDisabled
                ]}>
                  {editingId ? 'Update' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

            <Animated.View
              style={[
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + insets.bottom + 120 }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.promptContainer}>
                  <Sparkles size={20} color={colors.secondary} />
                  <Text style={styles.prompt}>What are you grateful for today?</Text>
                </View>

                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  placeholder="Type your gratitude here..."
                  placeholderTextColor={colors.textDisabled}
                  value={text}
                  onChangeText={setText}
                  multiline
                  maxLength={MAX_CHARS}
                  textAlignVertical="top"
                  autoFocus={false}
                  testID="gratitude-input"
                />

                <View style={styles.footer}>
                  <Text style={[styles.charCount, { color: charCountColor }]}>
                    {remainingChars} characters remaining
                  </Text>
                </View>
              </ScrollView>


            </Animated.View>
          </KeyboardAvoidingView>

          {isKeyboardVisible && (
            <View
              style={[
                styles.stickyChips,
                {
                  bottom: keyboardHeight + bottomBarHeight + 12,
                  paddingBottom: 0,
                },
              ]}
              testID="sticky-inspiration-chips"
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.stickyChipsScroll}
                keyboardShouldPersistTaps="handled"
              >
                {[
                  "A kind gesture from someone",
                  "A moment of peace today",
                  "Something beautiful you noticed",
                ].map((suggestion, index) => (
                  <AnimatedChip
                    key={index}
                    suggestion={suggestion}
                    index={index}
                    onPress={() => {
                      setText(suggestion);
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12), bottom: isKeyboardVisible ? keyboardHeight : 0 }]} onLayout={(e: LayoutChangeEvent) => setBottomBarHeight(e.nativeEvent.layout.height)}>
            <TouchableOpacity
              onPress={handleSave}
              disabled={text.trim().length === 0}
              activeOpacity={0.8}
              style={[
                styles.primaryButton, 
                text.trim().length === 0 && styles.primaryButtonDisabled,
                {
                  transform: [{
                    scale: text.trim().length > 0 ? 1 : 0.95
                  }]
                }
              ]}
              testID="primary-save-button"
            >
              <LinearGradient
                colors={colors.gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButtonBg}
              >
                <Text style={styles.primaryButtonText}>{editingId ? 'Update' : 'Save'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: colors.text,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.primary,
  },
  saveButtonDisabled: {
    color: colors.textDisabled,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  scrollContent: {
    flexGrow: 1,
  },
  promptContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  prompt: {
    fontSize: 16,
    color: colors.secondary,
    marginLeft: 8,
    fontWeight: "500" as const,
  },
  input: {
    backgroundColor: "rgba(26, 31, 58, 0.5)",
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    minHeight: 150,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footer: {
    marginTop: 12,
    alignItems: "flex-end",
  },
  charCount: {
    fontSize: 12,
  },
  bottomBar: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 0,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    opacity: 1,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonBg: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  primaryButtonText: {
    color: colors.background,
    fontWeight: '700' as const,
    fontSize: 16,
  },

  stickyChips: {
    position: 'absolute',
    left: 24,
    right: 24,
  },
  stickyChipsScroll: {
    paddingVertical: 8,
    gap: 8,
  },
  stickyChip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  stickyChipText: {
    color: colors.text,
    fontSize: 13,
  },
});