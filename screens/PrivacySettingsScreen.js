import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Lock } from 'lucide-react-native';
import { useTheme } from '../lib/theme';

export default function PrivacySettingsScreen({ navigation }) {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <ChevronLeft color={theme.text} size={28} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Privacy</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={[styles.infoBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Lock color={theme.textMuted} size={20} />
          <Text style={{ color: theme.textMuted, fontSize: 13, marginLeft: 12, flex: 1 }}>
            Account-wide private profiles are not supported. To limit an individual post, choose its visibility when creating or editing that post.
          </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '700' },
  infoBox: { flexDirection: 'row', alignItems: 'center', margin: 20, padding: 16, borderRadius: 12, borderWidth: 1 },
});