import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { apiRequest } from '../lib/api';
import { useTheme } from '../lib/theme';

const SettingRow = ({ theme, label, description, value, onToggle }) => (
  <View style={[styles.row, { borderBottomColor: theme.border }]}>
    <View style={{ flex: 1, paddingRight: 16 }}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
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

export default function NotificationSettingsScreen({ navigation }) {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [settings, setSettings] = useState({
    notify_likes: true,
    notify_comments: true,
    notify_follows: true,
    notify_messages: true,
    notify_topic_posts: true,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await apiRequest('get_notification_settings.php');
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
    const previousSettings = settings;
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    setSaving(true);

    try {
      const result = await apiRequest('update_notification_settings.php', {
        method: 'POST',
        json: newSettings
      });
      if (!result.success) throw new Error(result.error || 'Notification setting update failed.');
    } catch {
      setSettings(previousSettings);
      Alert.alert('Error', 'Could not save notification settings.');
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
        <Text style={[styles.title, { color: theme.text }]}>Notifications</Text>
        <View style={{ width: 36 }}>
           {saving && <ActivityIndicator size="small" color={theme.primary} />}
        </View>
      </View>

      <ScrollView>
        <SettingRow theme={theme} label="Likes" description="When someone likes your post" value={settings.notify_likes} onToggle={() => toggleSwitch('notify_likes')} />
        <SettingRow theme={theme} label="Comments" description="When someone comments on your post" value={settings.notify_comments} onToggle={() => toggleSwitch('notify_comments')} />
        <SettingRow theme={theme} label="New Followers" description="When someone starts following you" value={settings.notify_follows} onToggle={() => toggleSwitch('notify_follows')} />
        <SettingRow theme={theme} label="Messages" description="When you receive a new direct message" value={settings.notify_messages} onToggle={() => toggleSwitch('notify_messages')} />
        <SettingRow theme={theme} label="Topic Posts" description="When someone posts in a topic you follow" value={settings.notify_topic_posts} onToggle={() => toggleSwitch('notify_topic_posts')} />
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
  description: { fontSize: 13 },
});