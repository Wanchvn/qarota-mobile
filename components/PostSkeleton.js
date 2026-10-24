import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../lib/theme';

function SkeletonBlock({ opacity, theme, width, height, borderRadius = 4, style }) {
  return (
    <Animated.View
      style={[
        { backgroundColor: theme.border, width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

export default function PostSkeleton() {
  const theme = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.3));

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true })
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {/* Header Skeleton */}
      <View style={styles.header}>
        <SkeletonBlock opacity={opacity} theme={theme} width={40} height={40} borderRadius={20} />
        <View style={styles.headerText}>
          <SkeletonBlock opacity={opacity} theme={theme} width={120} height={16} style={{ marginBottom: 8 }} />
          <SkeletonBlock opacity={opacity} theme={theme} width={80} height={12} />
        </View>
      </View>

      {/* Content Skeleton */}
      <SkeletonBlock opacity={opacity} theme={theme} width="90%" height={16} style={{ marginBottom: 8 }} />
      <SkeletonBlock opacity={opacity} theme={theme} width="70%" height={16} style={{ marginBottom: 16 }} />

      {/* Image Skeleton */}
      <SkeletonBlock opacity={opacity} theme={theme} width="100%" height={250} borderRadius={8} style={{ marginBottom: 16 }} />

      {/* Actions Skeleton */}
      <View style={[styles.actions, { borderTopColor: theme.border }]}>
        <SkeletonBlock opacity={opacity} theme={theme} width={60} height={20} />
        <SkeletonBlock opacity={opacity} theme={theme} width={60} height={20} />
        <SkeletonBlock opacity={opacity} theme={theme} width={20} height={20} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  headerText: { marginLeft: 12, flex: 1 },
  actions: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 12, justifyContent: 'space-between', alignItems: 'center' }
});