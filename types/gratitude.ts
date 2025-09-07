export interface GratitudeEntry {
  id: string;
  text: string;
  date: string;
  color: string;
}

export interface GratitudeStats {
  totalEntries: number;
  currentStreak: number;
  longestStreak: number;
  weeklyCount: number;
}

export interface BackupPayload {
  version: number;
  exportedAt: string;
  isPremium: boolean;
  entries: GratitudeEntry[];
}