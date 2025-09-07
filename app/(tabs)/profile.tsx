import React, { useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Crown, Download, Upload, Bell, Heart, Trash2, Palette, Zap } from "lucide-react-native";
import { useGratitude } from "@/providers/GratitudeProvider";
import ProGate from "@/components/ProGate";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

export default function ProfileScreen() {
  const { isPremium, stats, clearAllData, exportData, importData, restorePurchases } = useGratitude();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleUpgrade = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/premium");
  };

  const handleExport = async () => {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const payload = exportData();
      const json = JSON.stringify(payload, null, 2);

      if (Platform.OS === 'web') {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gratitude-backup-${new Date().toISOString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Alert.alert('Backup exported', 'A file download has started.');
      } else {
        Alert.alert('Copy JSON', 'Backup JSON copied to clipboard. Paste it somewhere safe.', [{ text: 'OK' }]);
      }
    } catch (e) {
      console.error('Export failed', e);
      Alert.alert('Export failed', 'Could not export your data. Please try again.');
    }
  };

  const handleClearData = () => {
    Alert.alert(
      "Clear All Data",
      "This will permanently delete all your gratitude entries. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            if (Platform.OS !== 'web') {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
            clearAllData();
          }
        },
      ]
    );
  };

  return (
    <LinearGradient
      colors={["#0A0E27", "#000814", "#000000"]}
      style={styles.container}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!isPremium && (
          <TouchableOpacity onPress={handleUpgrade} activeOpacity={0.8}>
            <LinearGradient
              colors={["#FFD700", "#FFA500"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.premiumCard}
            >
              <Crown size={24} color="#FFFFFF" />
              <View style={styles.premiumContent}>
                <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
                <Text style={styles.premiumText}>
                  Unlimited entries • Full constellation • Export & more
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Your Journey</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalEntries}</Text>
              <Text style={styles.statLabel}>Total Entries</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.currentStreak}</Text>
              <Text style={styles.statLabel}>Current Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.longestStreak}</Text>
              <Text style={styles.statLabel}>Longest Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.weeklyCount}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          {!isPremium && (
            <TouchableOpacity 
              style={styles.settingItem} 
              activeOpacity={0.7}
              onPress={async () => {
                try {
                  const restored = await restorePurchases();
                  if (restored) {
                    Alert.alert('Restored', 'Your purchases have been restored.');
                  } else {
                    Alert.alert('Nothing to restore', 'We did not find any active purchases.');
                  }
                } catch (e) {
                  Alert.alert('Restore failed', 'Could not restore purchases.');
                }
              }}
              testID="restore-purchases"
            >
              <Upload size={20} color="#9CA3AF" />
              <Text style={styles.settingText}>Restore Purchases</Text>
            </TouchableOpacity>
          )}


          <ProGate reason="premium themes">
            <View style={styles.settingItem}>
              <Bell size={20} color="#9CA3AF" />
              <Text style={styles.settingText}>Daily Reminders</Text>
              <Text style={styles.settingValue}>Pro</Text>
            </View>
          </ProGate>

          <ProGate reason="premium themes">
            <View style={styles.settingItem}>
              <Palette size={20} color="#9CA3AF" />
              <Text style={styles.settingText}>Themes</Text>
              <Text style={styles.settingValue}>Aurora</Text>
            </View>
          </ProGate>

          <ProGate reason="premium themes">
            <View style={styles.settingItem}>
              <Zap size={20} color="#9CA3AF" />
              <Text style={styles.settingText}>Glow Intensity</Text>
              <Text style={styles.settingValue}>Medium</Text>
            </View>
          </ProGate>

          <ProGate reason="exports & backup">
            <TouchableOpacity 
              style={styles.settingItem} 
              activeOpacity={0.7}
              onPress={handleExport}
              testID="export-backup"
            >
              <Download size={20} color="#9CA3AF" />
              <Text style={styles.settingText}>Export Backup (JSON)</Text>
            </TouchableOpacity>
          </ProGate>

          <ProGate reason="exports & backup">
            <TouchableOpacity 
              style={styles.settingItem} 
              activeOpacity={0.7}
              onPress={async () => {
                try {
                  if (Platform.OS === 'web') {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'application/json';
                    input.onchange = async () => {
                      const file = input.files && input.files[0];
                      if (!file) return;
                      const text = await file.text();
                      const payload = JSON.parse(text);
                      await importData(payload);
                      Alert.alert('Import complete', 'Your backup has been imported.');
                    };
                    input.click();
                  } else {
                    Alert.alert('Paste Backup JSON', 'Paste the backup JSON you saved earlier', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'OK' }
                    ]);
                  }
                } catch (e) {
                  console.error('Import failed', e);
                  Alert.alert('Import failed', 'Could not import your data. Ensure the file is a valid backup.');
                }
              }}
              testID="import-backup"
            >
              <Upload size={20} color="#9CA3AF" />
              <Text style={styles.settingText}>Import Backup (JSON)</Text>
            </TouchableOpacity>
          </ProGate>

          

          <TouchableOpacity style={styles.settingItem} activeOpacity={0.7}>
            <Heart size={20} color="#9CA3AF" />
            <Text style={styles.settingText}>Rate App</Text>
          </TouchableOpacity>
        </View>

        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity 
            style={styles.settingItem} 
            activeOpacity={0.7}
            onPress={handleClearData}
          >
            <Trash2 size={20} color="#EF4444" />
            <Text style={[styles.settingText, { color: "#EF4444" }]}>
              Clear All Data
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View 
          style={[
            styles.version,
            {
              opacity: fadeAnim,
            }
          ]}
        >
          <Text style={{ color: '#4B5563', fontSize: 12 }}>Version 1.0.0</Text>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 100,
  },
  premiumCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  premiumContent: {
    flex: 1,
    marginLeft: 16,
  },
  premiumTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  premiumText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
  },
  statsCard: {
    backgroundColor: "rgba(26, 31, 58, 0.5)",
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(178, 75, 243, 0.1)",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
  },
  statItem: {
    width: "50%",
    paddingVertical: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#00D9FF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#B24BF3",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(26, 31, 58, 0.3)",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(178, 75, 243, 0.05)",
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: "#FFFFFF",
    marginLeft: 12,
  },
  settingValue: {
    fontSize: 14,
    color: "#6B7280",
  },
  version: {
    fontSize: 12,
    color: "#4B5563",
    textAlign: "center",
    marginTop: 20,
  },
});