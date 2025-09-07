import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Flame, Target, CalendarDays, Award } from 'lucide-react-native';
import { useGratitude } from '@/providers/GratitudeProvider';

export default function AccomplishmentsScreen() {
  const { stats, entries } = useGratitude();

  const byMonth = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach(e => {
      const d = new Date(e.date);
      const key = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => {
      const da = new Date(a[0]);
      const db = new Date(b[0]);
      return db.getTime() - da.getTime();
    });
  }, [entries]);

  return (
    <LinearGradient colors={["#0A0E27", "#000814", "#000000"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} testID="accomplishments-scroll">
        <View style={styles.hero}>
          <Award size={24} color="#00D9FF" />
          <Text style={styles.heroTitle}>Accomplishments</Text>
          <Text style={styles.heroSubtitle}>A gentle reflection of your mindful practice</Text>
        </View>

        <View style={styles.cardsRow}>
          <View style={styles.card} testID="acc-total">
            <Sparkles size={18} color="#B24BF3" />
            <Text style={styles.cardValue}>{stats.totalEntries}</Text>
            <Text style={styles.cardLabel}>Gratitudes logged</Text>
          </View>
          <View style={styles.card} testID="acc-streak">
            <Flame size={18} color="#F59E0B" />
            <Text style={styles.cardValue}>{stats.currentStreak}</Text>
            <Text style={styles.cardLabel}>Current streak</Text>
          </View>
        </View>

        <View style={styles.cardsRow}>
          <View style={styles.card} testID="acc-longest">
            <Target size={18} color="#10B981" />
            <Text style={styles.cardValue}>{stats.longestStreak}</Text>
            <Text style={styles.cardLabel}>Longest streak</Text>
          </View>
          <View style={styles.card} testID="acc-week">
            <CalendarDays size={18} color="#60A5FA" />
            <Text style={styles.cardValue}>{stats.weeklyCount}</Text>
            <Text style={styles.cardLabel}>This week</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By month</Text>
          {byMonth.length === 0 ? (
            <Text style={styles.empty}>No data yet</Text>
          ) : (
            <View style={styles.monthList}>
              {byMonth.map(([label, count]) => (
                <View key={label} style={styles.monthRow}>
                  <Text style={styles.monthLabel}>{label}</Text>
                  <View style={styles.barWrap}>
                    <View style={[styles.bar, { width: Math.max(8, Math.min(100, count * 12)) }]} />
                    <Text style={styles.monthCount}>{count}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 120 },
  hero: { alignItems: 'center', marginBottom: 16, gap: 6 },
  heroTitle: { fontSize: 22, color: '#FFFFFF', fontWeight: '700' },
  heroSubtitle: { fontSize: 13, color: '#9CA3AF' },
  cardsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  card: {
    flex: 1,
    backgroundColor: 'rgba(26,31,58,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(178, 75, 243, 0.1)',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 6,
  },
  cardValue: { fontSize: 20, color: '#00D9FF', fontWeight: '700' },
  cardLabel: { fontSize: 12, color: '#9CA3AF' },
  section: { marginTop: 8 },
  sectionTitle: { fontSize: 14, color: '#B24BF3', fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { color: '#6B7280' },
  monthList: { gap: 10 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthLabel: { color: '#FFFFFF' },
  barWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bar: { height: 10, backgroundColor: '#00D9FF', borderRadius: 6 },
  monthCount: { color: '#9CA3AF', width: 24, textAlign: 'right' },
});