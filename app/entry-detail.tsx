import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { X, Calendar, Sparkles, Pencil, Trash2 } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useGratitude } from "@/providers/GratitudeProvider";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams();
  const { entries, deleteEntry } = useGratitude();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const entry = entries.find(e => e.id === id);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const handleClose = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Animate out before closing
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.back();
    });
  };

  if (!entry) {
    return null;
  }

  const formattedDate = new Date(entry.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = new Date(entry.date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const handleEdit = async (): Promise<void> => {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.selectionAsync();
      }
    } catch {}
    
    // Animate out before navigating
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.replace({ pathname: '/add-entry', params: { id: entry.id } });
    });
  };

  const handleDelete = async (): Promise<void> => {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        console.log('Deleting entry on web');
      }
    } catch {}
    
    // Animate deletion with shake effect
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1.02,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      try {
        deleteEntry(entry.id);
      } catch (e) {
        console.error('Failed to delete entry', e);
      }
      router.back();
    });
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={["rgba(26, 31, 58, 0.95)", "rgba(10, 14, 39, 0.95)"]}
              style={styles.card}
            >
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                activeOpacity={0.7}
              >
                <X size={24} color="#9CA3AF" />
              </TouchableOpacity>

              <View style={styles.orbContainer}>
                <Animated.View
                  style={[
                    styles.orb,
                    { backgroundColor: entry.color },
                    {
                      transform: [{
                        scale: scaleAnim.interpolate({
                          inputRange: [0.9, 1, 1.1],
                          outputRange: [0.8, 1, 1.2],
                        })
                      }]
                    }
                  ]}
                />
                <Animated.View 
                  style={[
                    styles.orbGlow, 
                    { backgroundColor: entry.color },
                    {
                      opacity: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 0.2],
                      })
                    }
                  ]} 
                />
              </View>

              <Text style={styles.entryText}>{entry.text}</Text>

              <View style={styles.metadata}>
                <View style={styles.metaItem}>
                  <Calendar size={16} color="#B24BF3" />
                  <Text style={styles.metaText}>{formattedDate}</Text>
                </View>
                <Text style={styles.metaTime}>{formattedTime}</Text>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.8} testID="delete-entry-btn">
                  <Trash2 size={16} color="#0A0E27" />
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
                <View style={{ width: 12 }} />
                <TouchableOpacity style={styles.editBtn} onPress={handleEdit} activeOpacity={0.8} testID="edit-entry-btn">
                  <Pencil size={16} color="#0A0E27" />
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.footer}>
                <Sparkles size={16} color="#00D9FF" />
                <Text style={styles.footerText}>
                  This gratitude is part of your constellation
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  safeArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  content: {
    width: "90%",
    maxWidth: 400,
  },
  card: {
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: "rgba(178, 75, 243, 0.2)",
    shadowColor: "#B24BF3",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 1,
  },
  orbContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  orb: {
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: "#00D9FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  orbGlow: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    opacity: 0.2,
  },
  entryText: {
    fontSize: 18,
    color: "#FFFFFF",
    lineHeight: 28,
    textAlign: "center",
    marginBottom: 24,
  },
  metadata: {
    alignItems: "center",
    marginBottom: 24,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  metaText: {
    fontSize: 14,
    color: "#B24BF3",
    marginLeft: 8,
    fontWeight: "500",
  },
  metaTime: {
    fontSize: 12,
    color: "#6B7280",
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34D399',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  editText: {
    color: '#0A0E27',
    fontWeight: '700',
    marginLeft: 8,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F87171',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  deleteText: {
    color: '#0A0E27',
    fontWeight: '700',
    marginLeft: 8,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(178, 75, 243, 0.1)",
  },
  footerText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginLeft: 8,
  },
});