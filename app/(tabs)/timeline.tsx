import React, { useRef, useEffect, useMemo, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Platform,
  FlatList,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Calendar, Star, Search, Filter } from "lucide-react-native";
import { useGratitude } from "@/providers/GratitudeProvider";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

type EntryRowProps = {
  id: string;
  text: string;
  date: string;
  color: string;
  onOpen: () => void;
};

function AnimatedEntryRow({ entry, index, onOpen }: {
  entry: { id: string; text: string; date: string; color: string };
  index: number;
  onOpen: () => void;
}) {
  const entryFadeAnim = useRef(new Animated.Value(0)).current;
  const entrySlideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entryFadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 30,
        useNativeDriver: true,
      }),
      Animated.timing(entrySlideAnim, {
        toValue: 0,
        duration: 300,
        delay: index * 30,
        useNativeDriver: true,
      }),
    ]).start();
  }, [entryFadeAnim, entrySlideAnim, index]);

  return (
    <Animated.View
      style={{
        opacity: entryFadeAnim,
        transform: [{ translateY: entrySlideAnim }],
      }}
    >
      <EntryRow
        id={entry.id}
        text={entry.text}
        date={entry.date}
        color={entry.color}
        onOpen={onOpen}
      />
    </Animated.View>
  );
}

function EntryRow({ id, text, date, color, onOpen }: EntryRowProps) {
  const pressScale = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.spring(pressScale, {
      toValue: 0.98,
      tension: 300,
      friction: 15,
      useNativeDriver: true,
    }).start();
  }, [pressScale]);

  const onPressOut = useCallback(() => {
    Animated.spring(pressScale, {
      toValue: 1,
      tension: 300,
      friction: 15,
      useNativeDriver: true,
    }).start();
  }, [pressScale]);

  return (
    <Animated.View style={{ transform: [{ scale: pressScale }] }}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onOpen}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        testID={`entry-card-${id}`}
      >
        <LinearGradient
          colors={["rgba(178, 75, 243, 0.08)", "rgba(0, 217, 255, 0.08)"]}
          style={styles.entryCard}
        >
          <View style={[styles.entryOrb, { backgroundColor: color }]} />
          <View style={styles.entryContent}>
            <Text style={styles.entryText} numberOfLines={2}>
              {text}
            </Text>
            <Text style={styles.entryTime}>
              {new Date(date).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function TimelineScreen() {
  const { entries, deleteEntry, stats } = useGratitude();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [search, setSearch] = useState<string>("");
  const [dayFilter, setDayFilter] = useState<'all' | 'today' | 'week' | 'month'>("all");

  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim]);

  const handleEntryPress = useCallback(async (entryId: string) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({
      pathname: "/entry-detail",
      params: { id: entryId },
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = new Date();
    return entries.filter((e) => {
      const matches = q.length === 0 || e.text.toLowerCase().includes(q);
      if (!matches) return false;
      if (dayFilter === 'today') {
        const d = new Date(e.date);
        return d.toDateString() === now.toDateString();
      }
      if (dayFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return new Date(e.date) >= weekAgo;
      }
      if (dayFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return new Date(e.date) >= monthAgo;
      }
      return true;
    });
  }, [entries, search, dayFilter]);

  const sortedEntries = useMemo(() => (
    [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  ), [filtered]);

  const sections = useMemo(() => {
    const map = new Map<string, typeof entries>();
    sortedEntries.forEach((entry) => {
      const date = new Date(entry.date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      const arr = map.get(date) ?? [] as typeof entries;
      arr.push(entry);
      map.set(date, arr);
    });
    return Array.from(map.entries()).map(([date, arr]) => ({ date, data: arr })) as Array<{ date: string; data: typeof entries }>;
  }, [sortedEntries, entries]);

  const keyExtractor = useCallback((item: typeof entries[number]) => item.id, []);

  const ListEmpty = () => (
    <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
      <Star size={48} color="#B24BF3" style={styles.emptyIcon} />
      <Text style={styles.emptyTitle}>Your journey begins here</Text>
      <Text style={styles.emptyText}>
        Start adding gratitude entries to see your timeline grow
      </Text>
    </Animated.View>
  );

  const StatsHeader = useMemo(() => (
    <View style={styles.statsContainer} testID="timeline-stats">
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.totalEntries}</Text>
        <Text style={styles.statLabel}>Gratitudes</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.currentStreak}</Text>
        <Text style={styles.statLabel}>Streak</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.weeklyCount}</Text>
        <Text style={styles.statLabel}>This Week</Text>
      </View>
    </View>
  ), [stats]);

  return (
    <LinearGradient
      colors={["#0A0E27", "#000814", "#000000"]}
      style={styles.container}
    >
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Search size={16} color="#9CA3AF" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search entries"
            placeholderTextColor="#6B7280"
            style={styles.searchInput}
            testID="timeline-search"
          />
        </View>
        <TouchableOpacity
          onPress={() => {
            const order: Array<typeof dayFilter> = ['all', 'today', 'week', 'month'];
            const idx = order.indexOf(dayFilter);
            const next = order[(idx + 1) % order.length];

            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }

            Animated.sequence([
              Animated.timing(fadeAnim, {
                toValue: 0.7,
                duration: 100,
                useNativeDriver: true,
              }),
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }),
            ]).start();

            setDayFilter(next);
          }}
          style={styles.filterBtn}
          activeOpacity={0.8}
          testID="timeline-filter"
        >
          <Filter size={16} color="#0A0E27" />
          <Text style={styles.filterText}>{dayFilter.toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sections}
        keyExtractor={(section) => section.date}
        renderItem={({ item: section }) => (
          <Animated.View style={[styles.dateGroup, { opacity: fadeAnim }]}>
            <View style={styles.dateHeader}>
              <Calendar size={16} color="#B24BF3" />
              <Text style={styles.dateText}>{section.date}</Text>
            </View>
            {section.data.map((e, idx) => (
              <AnimatedEntryRow
                key={e.id}
                entry={e}
                index={idx}
                onOpen={() => handleEntryPress(e.id)}
              />
            ))}
          </Animated.View>
        )}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        testID="timeline-list"
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 100,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(26,31,58,0.5)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(178, 75, 243, 0.1)',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00D9FF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(178, 75, 243, 0.2)',
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  dateText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#B24BF3",
    marginLeft: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  entryCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(178, 75, 243, 0.1)",
    backgroundColor: '#0B102A',
    flexDirection: "row",
    alignItems: "center",
  },
  entryContent: {
    flex: 1,
  },
  entryText: {
    fontSize: 16,
    color: "#FFFFFF",
    lineHeight: 22,
    marginBottom: 4,
  },
  entryTime: {
    fontSize: 12,
    color: "#6B7280",
  },
  entryOrb: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
    shadowColor: "#00D9FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 10,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26,31,58,0.4)',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(178, 75, 243, 0.1)'
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    paddingVertical: 10,
    marginLeft: 8,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00D9FF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  filterText: {
    color: '#0A0E27',
    fontWeight: '700',
  },
});