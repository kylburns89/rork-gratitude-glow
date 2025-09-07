import { useState, useEffect, useMemo, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import createContextHook from "@nkzw/create-context-hook";
import { GratitudeEntry, GratitudeStats, BackupPayload } from "@/types/gratitude";
import { 
  configureRevenueCat, 
  checkIsPremium, 
  restorePurchasesAndCheck, 
} from "@/lib/revenuecat";

const STORAGE_KEY = "gratitude_entries";
const PREMIUM_KEY = "is_premium";

const COLORS = ["#00D9FF", "#B24BF3", "#FFD700", "#10B981", "#EF4444", "#F59E0B"] as const;

export const [GratitudeProvider, useGratitude] = createContextHook(() => {
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    console.log("GratitudeProvider: initializing loadData");
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [entriesData, premiumData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(PREMIUM_KEY),
      ]);

      if (entriesData !== null && entriesData !== undefined) {
        try {
          // Check if data is already an object (shouldn't happen but defensive coding)
          const dataToProcess = typeof entriesData === 'string' ? entriesData : JSON.stringify(entriesData);
          const parsed = JSON.parse(dataToProcess);
          
          if (Array.isArray(parsed)) {
            // Validate each entry has required fields
            const validEntries = parsed.filter(entry => 
              entry && 
              typeof entry === 'object' && 
              'id' in entry && 
              'text' in entry && 
              'date' in entry && 
              'color' in entry
            ) as GratitudeEntry[];
            
            console.log("GratitudeProvider: loaded entries", validEntries.length);
            setEntries(validEntries);
          } else {
            console.warn("GratitudeProvider: entries data is not an array, clearing");
            await AsyncStorage.removeItem(STORAGE_KEY);
            setEntries([]);
          }
        } catch (parseError) {
          console.error("GratitudeProvider: failed to parse entries, clearing corrupted data", parseError);
          console.error("GratitudeProvider: problematic data:", entriesData);
          await AsyncStorage.removeItem(STORAGE_KEY);
          setEntries([]);
        }
      }
      
      if (premiumData !== null && premiumData !== undefined) {
        try {
          // Check if data is already a boolean or needs parsing
          const dataToProcess = typeof premiumData === 'string' ? premiumData : JSON.stringify(premiumData);
          const parsedPremium = JSON.parse(dataToProcess);
          const isPremiumBool = Boolean(parsedPremium);
          console.log("GratitudeProvider: loaded premium", isPremiumBool);
          setIsPremium(isPremiumBool);
        } catch (parseError) {
          console.error("GratitudeProvider: failed to parse premium data, clearing corrupted data", parseError);
          console.error("GratitudeProvider: problematic premium data:", premiumData);
          await AsyncStorage.removeItem(PREMIUM_KEY);
          setIsPremium(false);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
      // Clear all data if there's a general error
      try {
        await AsyncStorage.multiRemove([STORAGE_KEY, PREMIUM_KEY]);
        setEntries([]);
        setIsPremium(false);
      } catch (clearError) {
        console.error("Failed to clear corrupted data:", clearError);
      }
    } finally {
      try {
        // Configure RevenueCat and refresh premium from entitlements
        if (Platform.OS !== 'web') {
          await configureRevenueCat();
          const entitlementPremium = await checkIsPremium();
          if (entitlementPremium) {
            await AsyncStorage.setItem(PREMIUM_KEY, JSON.stringify(true));
            setIsPremium(true);
          }
        }
      } catch (e) {
        console.warn("GratitudeProvider: RevenueCat sync failed", e);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const saveEntries = async (newEntries: GratitudeEntry[]) => {
    try {
      // Validate entries before saving
      const validEntries = newEntries.filter(entry => 
        entry && 
        typeof entry === 'object' && 
        'id' in entry && 
        'text' in entry && 
        'date' in entry && 
        'color' in entry
      );
      
      const dataToSave = JSON.stringify(validEntries);
      await AsyncStorage.setItem(STORAGE_KEY, dataToSave);
      setEntries(validEntries);
      console.log("GratitudeProvider: saved entries", validEntries.length);
    } catch (error) {
      console.error("Error saving entries:", error);
      // Try to recover by clearing and resetting
      try {
        await AsyncStorage.removeItem(STORAGE_KEY);
        setEntries([]);
      } catch (clearError) {
        console.error("Failed to clear after save error:", clearError);
      }
    }
  };

  const addEntry = useCallback((text: string): void => {
    const newEntry: GratitudeEntry = {
      id: Date.now().toString(),
      text,
      date: new Date().toISOString(),
      color: COLORS[entries.length % COLORS.length],
    };

    const updatedEntries = [...entries, newEntry];
    saveEntries(updatedEntries);
  }, [entries]);

  const updateEntry = useCallback((id: string, text: string): void => {
    const updatedEntries = entries.map((e) => (e.id === id ? { ...e, text } : e));
    console.log('GratitudeProvider: updateEntry', id);
    saveEntries(updatedEntries);
  }, [entries]);

  const deleteEntry = useCallback((id: string): void => {
    const updatedEntries = entries.filter(entry => entry.id !== id);
    saveEntries(updatedEntries);
  }, [entries]);

  const upgradeToPremium = useCallback(async (): Promise<void> => {
    try {
      const dataToSave = JSON.stringify(true);
      await AsyncStorage.setItem(PREMIUM_KEY, dataToSave);
      setIsPremium(true);
    } catch (error) {
      console.error("Error upgrading to premium:", error);
      // Try to recover
      try {
        await AsyncStorage.removeItem(PREMIUM_KEY);
        setIsPremium(false);
      } catch (clearError) {
        console.error("Failed to clear after premium upgrade error:", clearError);
      }
    }
  }, []);

  const purchasePremium = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      await upgradeToPremium();
      return true;
    }
    try {
      await configureRevenueCat();
      // Dynamically import to avoid type deps during web/test builds
      const PurchasesMod: any = await import("react-native-purchases");
      const Purchases: any = PurchasesMod?.default ?? PurchasesMod;
      const offerings = await Purchases.getOfferings();
      let selectedPackage: any = undefined;
      const current = offerings?.current;
      if (current && Array.isArray(current.availablePackages) && current.availablePackages.length > 0) {
        // Prefer annual if present, otherwise first
        selectedPackage = current.availablePackages.find((p: any) => p?.packageType === 'ANNUAL') || current.availablePackages[0];
      }
      if (!selectedPackage) {
        console.warn('No available packages to purchase');
        return false;
      }
      const result = await Purchases.purchasePackage(selectedPackage);
      const success = await checkIsPremium();
      if (success) {
        await AsyncStorage.setItem(PREMIUM_KEY, JSON.stringify(true));
        setIsPremium(true);
        return true;
      }
      return false;
    } catch (e: any) {
      // User cancellation or error
      if (e && (e.userCancelled || e.code === 'PURCHASE_CANCELLED' || e.code === '1')) {
        return false;
      }
      console.error('purchasePremium error', e);
      return false;
    }
  }, [upgradeToPremium]);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;
    try {
      await configureRevenueCat();
      const hasPremium = await restorePurchasesAndCheck();
      if (hasPremium) {
        await AsyncStorage.setItem(PREMIUM_KEY, JSON.stringify(true));
        setIsPremium(true);
        return true;
      }
      return false;
    } catch (e) {
      console.error('restorePurchases error', e);
      return false;
    }
  }, []);

  const importData = useCallback(async (payload: BackupPayload): Promise<void> => {
    try {
      const incoming = Array.isArray(payload.entries) ? payload.entries : [];
      const sanitized: GratitudeEntry[] = incoming.filter(e => e && typeof e === 'object' && 'id' in e && 'text' in e && 'date' in e && 'color' in e) as GratitudeEntry[];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      setEntries(sanitized);
      const premiumBool = Boolean(payload.isPremium ?? false);
      await AsyncStorage.setItem(PREMIUM_KEY, JSON.stringify(premiumBool));
      setIsPremium(premiumBool);
      console.log('GratitudeProvider: importData completed', { count: sanitized.length, premium: premiumBool });
    } catch (error) {
      console.error('GratitudeProvider: importData error', error);
      throw error;
    }
  }, []);

  const exportData = useCallback((): BackupPayload => {
    const payload: BackupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      isPremium: isPremium ?? false,
      entries: entries ?? [],
    };
    return payload;
  }, [entries, isPremium]);

  const clearAllData = useCallback(async (): Promise<void> => {
    try {
      await AsyncStorage.multiRemove([STORAGE_KEY, PREMIUM_KEY]);
      setEntries([]);
      setIsPremium(false);
    } catch (error) {
      console.error("Error clearing data:", error);
    }
  }, []);

  const stats = useMemo<GratitudeStats>(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const weeklyEntries = entries.filter(
      entry => new Date(entry.date) >= weekAgo
    );

    const sortedEntries = [...entries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;

    sortedEntries.forEach(entry => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);

      if (!lastDate) {
        tempStreak = 1;
        lastDate = entryDate;
      } else {
        const prev = lastDate as Date;
        const dayDiff = Math.floor(
          (entryDate.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (dayDiff === 1) {
          tempStreak++;
        } else if (dayDiff > 1) {
          tempStreak = 1;
        }
        lastDate = entryDate;
      }

      longestStreak = Math.max(longestStreak, tempStreak);
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (lastDate !== null) {
      const last: Date = lastDate as Date;
      const daysSinceLastEntry = Math.floor(
        (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
      );
      currentStreak = daysSinceLastEntry <= 1 ? tempStreak : 0;
    } else {
      currentStreak = 0;
    }

    return {
      totalEntries: entries.length,
      currentStreak,
      longestStreak,
      weeklyCount: weeklyEntries.length,
    };
  }, [entries]);

  return useMemo(() => ({
    entries,
    isPremium,
    isLoading,
    stats,
    addEntry,
    updateEntry,
    deleteEntry,
    upgradeToPremium,
    purchasePremium,
    restorePurchases,
    clearAllData,
    importData,
    exportData,
  }), [entries, isPremium, isLoading, stats, addEntry, updateEntry, deleteEntry, upgradeToPremium, purchasePremium, restorePurchases, clearAllData, importData, exportData]);
});