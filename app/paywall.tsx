import React, { useEffect } from 'react';
import { View, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import RevenueCatUI from 'react-native-purchases-ui';
import { getOfferingIdentifier } from '@/lib/revenuecat';

export default function PaywallScreen() {
  const offeringId = getOfferingIdentifier();

  if (Platform.OS === 'web') {
    return <View style={{ flex: 1 }} />;
  }

  return (
    <LinearGradient colors={["#0A0E27", "#000814"]} style={{ flex: 1 }}>
      {RevenueCatUI?.Paywall ? (
        <RevenueCatUI.Paywall
          options={{ offering: offeringId }}
        />
      ) : (
        <View style={{ flex: 1 }} />
      )}
    </LinearGradient>
  );
}


