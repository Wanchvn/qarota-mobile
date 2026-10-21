import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Users, Wifi, ShieldAlert } from 'lucide-react-native';
import { apiRequest } from '../lib/api';
import { useTheme } from '../lib/theme';

export default function FeedPreferencesScreen({ navigation }) {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [settings, setSettings] = useState({
    show_unfollowed: false,
    high_data: true,
    safe_mode: false,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await apiRequest('get_feed_preferences.php');
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
      await apiRequest('update_feed_preferences.php', {
        method: 'POST',
        json: newSettings
      });
    } catch (e) {
      setSettings(settings); // Revert on failure
      Alert.alert('Error', 'Could not save preference.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;
  }

  const SettingRow = ({ icon, title, description, value, onToggle }) => (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
        {icon}
      </View>
      <View style={{ flex: 1, paddingRight: 16 }}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.description, { color: theme.textMuted }]}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: theme.border, true: theme.primary }}
        thumbColor="#fff"
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <ChevronLeft color={theme.text} size={28} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Feed Preferences</Text>
        <View style={{ width: 36 }}>
          {saving && <ActivityIndicator size="small" color={theme.primary} />}
        </View>
      </View>

      <ScrollView>
        <SettingRow 
          icon={<Users color={theme.primary} size={22} />}
          title="Show Unfollowed Posts"
          description="Include public posts from people you don't follow in your feed. Turn this off for a strictly chronological feed."
          value={settings.show_unfollowed}
          onToggle={() => toggleSwitch('show_unfollowed')}
        />

        <SettingRow 
          icon={<Wifi color={theme.primary} size={22} />}
          title="High Data Mode"
          description="Automatically load and play videos and high-resolution images in the feed. Turn off to save data."
          value={settings.high_data}
          onToggle={() => toggleSwitch('high_data')}
        />

        <SettingRow 
          icon={<ShieldAlert color={theme.primary} size={22} />}
          title="Safe Mode"
          description="Hide posts that contain sensitive content or have been flagged by moderators."
          value={settings.safe_mode}
          onToggle={() => toggleSwitch('safe_mode')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  
  row: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  iconContainer: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  description: { fontSize: 13, lineHeight: 18 },
});