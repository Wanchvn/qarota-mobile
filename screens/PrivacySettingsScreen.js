import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Lock } from 'lucide-react-native';
import { apiRequest } from '../lib/api';
import { useTheme } from '../lib/theme';

export default function PrivacySettingsScreen({ navigation }) {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [settings, setSettings] = useState({
    is_private: false,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await apiRequest('get_privacy_settings.php');
        if (res.success && res.settings) {
          setSettings(res.settings);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const toggleSwitch = async (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    setSaving(true);

    try {
      await apiRequest('update_privacy_settings.php', {
        method: 'POST',
        json: newSettings
      });
    } catch (e) {
      setSettings(settings); // Revert
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <ChevronLeft color={theme.text} size={28} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Privacy</Text>
        <View style={{ width: 36 }}>
           {saving && <ActivityIndicator size="small" color={theme.primary} />}
        </View>
      </View>

      <ScrollView>
        <View style={[styles.row, { borderBottomColor: theme.border }]}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={[styles.label, { color: theme.text }]}>Private Account</Text>
            <Text style={[styles.description, { color: theme.textMuted }]}>
              When your account is private, only people you approve can see your posts and followers.
            </Text>
          </View>
          <Switch
            value={settings.is_private}
            onValueChange={() => toggleSwitch('is_private')}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor="#fff"
          />
        </View>

        <View style={[styles.infoBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Lock color={theme.textMuted} size={20} />
          <Text style={{ color: theme.textMuted, fontSize: 13, marginLeft: 12, flex: 1 }}>
            Your data stays on servers in Ghana and is never sold to third parties.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  description: { fontSize: 13, lineHeight: 18 },
  infoBox: { flexDirection: 'row', alignItems: 'center', margin: 20, padding: 16, borderRadius: 12, borderWidth: 1 },
});