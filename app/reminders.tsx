import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Clock, Plus, Trash2, CalendarDays } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProGate from '@/components/ProGate';
import { useGratitude } from '@/providers/GratitudeProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TimeItem { id: string; hour: number; minute: number }

interface ReminderSettings {
  enabled: boolean;
  reminders: TimeItem[];
  weekdaysOnly: boolean;
}

const STORAGE_KEY = 'reminder_settings_v2';
const LEGACY_STORAGE_KEY = 'reminder_settings_v1';

export default function RemindersScreen() {
  const { isPremium } = useGratitude();
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<ReminderSettings>({ enabled: false, reminders: [{ id: 'r-1', hour: 9, minute: 0 }], weekdaysOnly: false });
  const [loading, setLoading] = useState<boolean>(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }, [fadeAnim]);

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<ReminderSettings>;
          const rems = Array.isArray(parsed.reminders) ? parsed.reminders.filter((r) => typeof r.hour === 'number' && typeof r.minute === 'number' && typeof r.id === 'string') as TimeItem[] : [{ id: 'r-1', hour: 9, minute: 0 }];
          const next: ReminderSettings = {
            enabled: Boolean(parsed.enabled ?? false),
            reminders: rems.length > 0 ? rems : [{ id: 'r-1', hour: 9, minute: 0 }],
            weekdaysOnly: Boolean(parsed.weekdaysOnly ?? false),
          };
          setSettings(next);
        } else {
          const legacy = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
          if (legacy) {
            const p = JSON.parse(legacy) as { enabled?: boolean; hour?: number; minute?: number };
            const next: ReminderSettings = {
              enabled: Boolean(p.enabled ?? false),
              reminders: [{ id: 'r-1', hour: Number.isFinite(p.hour as number) ? (p.hour as number) : 9, minute: Number.isFinite(p.minute as number) ? (p.minute as number) : 0 }],
              weekdaysOnly: false,
            };
            setSettings(next);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          }
        }
      } catch (e) {
        console.error('Reminders load error', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatTime = useCallback((h: number, m: number) => {
    const hh = Math.max(0, Math.min(23, h)).toString().padStart(2, '0');
    const mm = Math.max(0, Math.min(59, m)).toString().padStart(2, '0');
    return `${hh}:${mm}`;
  }, []);

  const saveSettings = useCallback(async (next: ReminderSettings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSettings(next);
    } catch (e) {
      console.error('Save reminder settings error', e);
      Alert.alert('Error', 'Could not save your reminder settings.');
    }
  }, []);

  const scheduleOrCancel = useCallback(async (next: ReminderSettings) => {
    try {
      if (Platform.OS === 'web') {
        return;
      }
      await Notifications.cancelAllScheduledNotificationsAsync();
      if (!next.enabled) return;

      const permission = await Notifications.getPermissionsAsync();
      if (!permission.granted) {
        const req = await Notifications.requestPermissionsAsync();
        if (!req.granted) {
          Alert.alert('Permission needed', 'Enable notifications in system settings to receive reminders.');
          await saveSettings({ ...next, enabled: false });
          return;
        }
      }

      const scheduleForTime = async (h: number, m: number) => {
        if (next.weekdaysOnly) {
          const weekdays = [2, 3, 4, 5, 6];
          for (const wd of weekdays) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Gratitude reminder',
                body: 'Take a moment to note something you are grateful for today ✨',
                sound: true,
              },
              trigger: { type: 'calendar', weekday: wd, hour: h, minute: m, repeats: true } as Notifications.CalendarTriggerInput,
            });
          }
        } else {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Gratitude reminder',
              body: 'Take a moment to note something you are grateful for today ✨',
              sound: true,
            },
            trigger: { type: 'calendar', hour: h, minute: m, repeats: true } as Notifications.CalendarTriggerInput,
          });
        }
      };

      for (const r of next.reminders) {
        const h = Math.max(0, Math.min(23, r.hour));
        const m = Math.max(0, Math.min(59, r.minute));
        await scheduleForTime(h, m);
      }
    } catch (e) {
      console.error('schedule/cancel reminder error', e);
      Alert.alert('Error', 'We could not update your reminder schedule.');
    }
  }, [saveSettings]);

  const handleToggle = useCallback(async (value: boolean) => {
    const next: ReminderSettings = { ...settings, enabled: value };
    await saveSettings(next);
    await scheduleOrCancel(next);
  }, [settings, saveSettings, scheduleOrCancel]);

  const adjustTime = useCallback(async (id: string, deltaH: number, deltaM: number) => {
    const updated = settings.reminders.map((r) =>
      r.id === id
        ? { ...r, hour: (r.hour + deltaH + 24) % 24, minute: (r.minute + deltaM + 60) % 60 }
        : r
    );
    const next: ReminderSettings = { ...settings, reminders: updated };
    await saveSettings(next);
    if (settings.enabled) {
      await scheduleOrCancel(next);
    }
  }, [settings, saveSettings, scheduleOrCancel]);

  const addReminder = useCallback(async () => {
    const last = settings.reminders[settings.reminders.length - 1];
    const nextTime: TimeItem = { id: `r-${Date.now()}`, hour: (last?.hour ?? 9), minute: (last ? (last.minute + 30) % 60 : 0) };
    const next: ReminderSettings = { ...settings, reminders: [...settings.reminders, nextTime] };
    await saveSettings(next);
    if (settings.enabled) await scheduleOrCancel(next);
  }, [settings, saveSettings, scheduleOrCancel]);

  const removeReminder = useCallback(async (id: string) => {
    const filtered = settings.reminders.filter((r) => r.id !== id);
    const next: ReminderSettings = { ...settings, reminders: filtered.length > 0 ? filtered : [{ id: 'r-1', hour: 9, minute: 0 }] };
    await saveSettings(next);
    if (settings.enabled) await scheduleOrCancel(next);
  }, [settings, saveSettings, scheduleOrCancel]);

  const applyPreset = useCallback(async (preset: 'morning' | 'afternoon' | 'evening' | 'x3') => {
    let reminders: TimeItem[] = [];
    if (preset === 'morning') reminders = [{ id: 'p-1', hour: 8, minute: 0 }];
    if (preset === 'afternoon') reminders = [{ id: 'p-1', hour: 13, minute: 0 }];
    if (preset === 'evening') reminders = [{ id: 'p-1', hour: 20, minute: 0 }];
    if (preset === 'x3') reminders = [
      { id: 'p-1', hour: 9, minute: 0 },
      { id: 'p-2', hour: 14, minute: 0 },
      { id: 'p-3', hour: 20, minute: 30 },
    ];
    const next: ReminderSettings = { ...settings, reminders };
    await saveSettings(next);
    if (settings.enabled) await scheduleOrCancel(next);
  }, [settings, saveSettings, scheduleOrCancel]);

  const toggleWeekdaysOnly = useCallback(async (value: boolean) => {
    const next: ReminderSettings = { ...settings, weekdaysOnly: value };
    await saveSettings(next);
    if (settings.enabled) await scheduleOrCancel(next);
  }, [settings, saveSettings, scheduleOrCancel]);

  const Content = (
    <Animated.View style={[styles.content, { opacity: fadeAnim, paddingBottom: 20 + insets.bottom }]} testID="reminders-content">
      <View style={styles.card}>
        <View style={styles.row}>
          <Bell size={20} color="#9CA3AF" />
          <Text style={styles.rowText}>Enable Reminders</Text>
          <Switch
            testID="toggle-reminder"
            value={settings.enabled}
            onValueChange={handleToggle}
            thumbColor={settings.enabled ? '#B24BF3' : undefined}
            trackColor={{ false: '#1A1F3A', true: '#4C1D95' }}
          />
        </View>
        <View style={styles.divider} />

        <View style={styles.row}>
          <CalendarDays size={20} color="#9CA3AF" />
          <Text style={styles.rowText}>Weekdays Only</Text>
          <Switch
            testID="toggle-weekdays"
            value={settings.weekdaysOnly}
            onValueChange={toggleWeekdaysOnly}
            thumbColor={settings.weekdaysOnly ? '#10B981' : undefined}
            trackColor={{ false: '#1A1F3A', true: '#065F46' }}
          />
        </View>

        <View style={styles.divider} />

        <View style={[styles.row, { alignItems: 'flex-start' }]}
          testID="reminder-list">
          <Clock size={20} color="#9CA3AF" />
          <View style={{ flex: 1 }}>
            {settings.reminders.map((r) => (
              <View key={r.id} style={styles.reminderItem} testID={`reminder-${r.id}`}>
                <Text style={styles.timeText}>{formatTime(r.hour, r.minute)}</Text>
                <View style={styles.timeEditor}>
                  <Pressable accessibilityRole="button" onPress={() => adjustTime(r.id, 1, 0)} style={styles.timeButton} testID={`inc-hour-${r.id}`}>
                    <Text style={styles.timeButtonText}>+H</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => adjustTime(r.id, 0, 5)} style={styles.timeButton} testID={`inc-minute-${r.id}`}>
                    <Text style={styles.timeButtonText}>+5m</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => adjustTime(r.id, -1, 0)} style={styles.timeButton} testID={`dec-hour-${r.id}`}>
                    <Text style={styles.timeButtonText}>-H</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => adjustTime(r.id, 0, -5)} style={styles.timeButton} testID={`dec-minute-${r.id}`}>
                    <Text style={styles.timeButtonText}>-5m</Text>
                  </Pressable>
                </View>
                {settings.reminders.length > 1 && (
                  <Pressable accessibilityRole="button" onPress={() => removeReminder(r.id)} style={styles.deleteBtn} testID={`remove-${r.id}`}>
                    <Trash2 size={16} color="#F87171" />
                  </Pressable>
                )}
              </View>
            ))}
            <Pressable accessibilityRole="button" onPress={addReminder} style={styles.addBtn} testID="add-reminder">
              <Plus size={16} color="#B24BF3" />
              <Text style={styles.addText}>Add reminder</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={{ gap: 8 }}>
          <Text style={{ color: '#9CA3AF', marginBottom: 6 }}>Quick presets</Text>
          <View style={styles.presetRow}>
            <Pressable onPress={() => applyPreset('morning')} style={styles.presetChip} testID="preset-morning"><Text style={styles.presetText}>Morning 8:00</Text></Pressable>
            <Pressable onPress={() => applyPreset('afternoon')} style={styles.presetChip} testID="preset-afternoon"><Text style={styles.presetText}>Afternoon 13:00</Text></Pressable>
          </View>
          <View style={styles.presetRow}>
            <Pressable onPress={() => applyPreset('evening')} style={styles.presetChip} testID="preset-evening"><Text style={styles.presetText}>Evening 20:00</Text></Pressable>
            <Pressable onPress={() => applyPreset('x3')} style={styles.presetChip} testID="preset-x3"><Text style={styles.presetText}>3×/day</Text></Pressable>
          </View>
        </View>

        {Platform.OS === 'web' && (
          <Text style={styles.webNote} testID="web-note">
            Reminders are saved here but browser notifications are not supported in this preview. Use the mobile app.
          </Text>
        )}
      </View>
    </Animated.View>
  );

  return (
    <LinearGradient colors={["#0A0E27", "#000814", "#000000"]} style={styles.container}>
      <View style={styles.safePadding} />
      <Stack.Screen options={{ title: 'Reminders', headerTitle: 'Reminders' }} />
      {loading ? (
        <View style={styles.loading} testID="loading-reminders">
          <Text style={{ color: '#9CA3AF' }}>Loading…</Text>
        </View>
      ) : isPremium ? (
        Content
      ) : (
        <ProGate reason="daily reminders" testID="reminders-pro-gate">{Content}</ProGate>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safePadding: { height: Platform.OS === 'ios' ? 0 : 0 },
  content: { flex: 1, padding: 20 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: 'rgba(26, 31, 58, 0.5)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(178, 75, 243, 0.1)',
    padding: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  rowText: { flex: 1, marginLeft: 12, color: '#FFFFFF', fontSize: 16 },
  divider: { height: 1, backgroundColor: 'rgba(178, 75, 243, 0.1)', marginVertical: 8 },
  timeEditor: { flexDirection: 'row', alignItems: 'center' },
  timeText: { color: '#00D9FF', fontSize: 16, width: 64, textAlign: 'center', fontWeight: '600' as const },
  timeButton: {
    backgroundColor: 'rgba(178, 75, 243, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(178, 75, 243, 0.25)'
  },
  timeButtonText: { color: '#B24BF3', fontWeight: '700' as const, fontSize: 12 },
  webNote: { color: '#9CA3AF', fontSize: 12, marginTop: 12 },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(10, 14, 39, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(178, 75, 243, 0.1)',
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  deleteBtn: {
    marginLeft: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.25)'
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(178, 75, 243, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(178, 75, 243, 0.25)'
  },
  addText: { color: '#B24BF3', marginLeft: 6, fontWeight: '700' as const },
  presetRow: { flexDirection: 'row', gap: 8 },
  presetChip: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  presetText: { color: '#E5E7EB', fontSize: 12, fontWeight: '600' as const },
});
