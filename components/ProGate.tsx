import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { router } from 'expo-router';

interface ProGateProps {
  reason: string;
  children: React.ReactNode;
  testID?: string;
}

export default function ProGate({ reason, children, testID }: ProGateProps) {
  return (
    <View style={styles.wrapper} testID={testID ?? 'pro-gate'}>
      <View style={styles.dimmed} pointerEvents="none">
        {children}
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.85}
        onPress={() => {
          try {
            router.push('/premium');
          } catch (e) {
            console.log('ProGate navigate error', e);
          }
        }}
        style={styles.overlay}
      >
        <Text style={styles.badge} numberOfLines={1}>Pro • Unlock {reason}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  dimmed: {
    opacity: 0.5,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  badge: {
    margin: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(178,75,243,0.9)',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});