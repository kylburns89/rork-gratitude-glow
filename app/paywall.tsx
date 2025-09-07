import React, { useEffect } from 'react';
import { View, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import RevenueCatUI from 'react-native-purchases-ui';
import { router } from 'expo-router';
import { getOfferingIdentifier, getEntitlementIdentifier } from '@/lib/revenuecat';
import { useGratitude } from '@/providers/GratitudeProvider';

export default function PaywallScreen() {
  const offeringId = getOfferingIdentifier();
  const { isPremium, restorePurchases, upgradeToPremium } = useGratitude();
  const entitlementId = getEntitlementIdentifier();

  useEffect(() => {
    if (isPremium) {
      try { router.back(); } catch (_) {}
    }
  }, [isPremium]);

  if (Platform.OS === 'web') {
    return <View style={{ flex: 1 }} />;
  }

  return (
    <LinearGradient colors={["#0A0E27", "#000814"]} style={{ flex: 1 }}>
      {RevenueCatUI?.Paywall ? (
        <RevenueCatUI.Paywall
          options={{}}
          onPurchaseCompleted={async ({ customerInfo }: any) => {
            try {
              const hasPremium = Boolean(customerInfo?.entitlements?.active?.[entitlementId]);
              if (hasPremium) {
                await upgradeToPremium();
              } else {
                await restorePurchases();
              }
            } catch (_) {}
            try { router.back(); } catch (_) {}
          }}
          onRestoreCompleted={async ({ customerInfo }: any) => {
            try {
              const hasPremium = Boolean(customerInfo?.entitlements?.active?.[entitlementId]);
              if (hasPremium) {
                await upgradeToPremium();
              } else {
                await restorePurchases();
              }
            } catch (_) {}
            try { router.back(); } catch (_) {}
          }}
          onDismiss={() => {
            try { router.back(); } catch (_) {}
          }}
        />
      ) : (
        <View style={{ flex: 1 }} />
      )}
    </LinearGradient>
  );
}


