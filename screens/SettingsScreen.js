import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronLeft, ChevronRight, Key, Bell, ShieldCheck, 
  Monitor, EyeOff, List, BadgeCheck, Flag, Bookmark, Lock, UserX, Trash2, Globe
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../lib/theme';
import { changeLanguage } from '../lib/i18n';

// --- MOVED OUTSIDE ---
const SettingRow = ({ icon, label, onPress, color, theme }) => (
  <TouchableOpacity 
    style={[styles.row, { borderBottomColor: theme.border }]} 
    onPress={onPress}
  >
    <View style={styles.iconContainer}>
      {icon}
    </View>
    <Text style={[styles.rowLabel, { color: color || theme.text }]}>{label}</Text>
    <ChevronRight color={color || theme.textMuted} size={20} />
  </TouchableOpacity>
);
// --------------------

export default function SettingsScreen({ navigation }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <ChevronLeft color={theme.text} size={28} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>{t('settings')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <SettingRow 
          theme={theme}
          icon={<Key color={theme.textMuted} size={20} />} 
          label={t('password')} 
          onPress={() => navigation.navigate('ChangePassword')} 
        />
        
        <SettingRow 
          theme={theme}
          icon={<Bell color={theme.textMuted} size={20} />} 
          label={t('notifications')} 
          onPress={() => navigation.navigate('NotificationSettings')} 
        />
        
        <SettingRow 
          theme={theme}
          icon={<ShieldCheck color={theme.textMuted} size={20} />} 
          label={t('two_factor')} 
          onPress={() => navigation.navigate('TwoFactorSetup')} 
        />
        
        <SettingRow 
          theme={theme}
          icon={<Monitor color={theme.textMuted} size={20} />} 
          label={t('sessions')} 
          onPress={() => navigation.navigate('ActiveSessions')} 
        />
        
        <SettingRow 
          theme={theme}
          icon={<EyeOff color={theme.textMuted} size={20} />} 
          label={t('data')} 
          onPress={() => navigation.navigate('ExportData')} 
        />
        
        <SettingRow 
          theme={theme}
          icon={<List color={theme.textMuted} size={20} />} 
          label={t('feed')} 
          onPress={() => navigation.navigate('FeedPreferences')} 
        />
        
        <SettingRow 
          theme={theme}
          icon={<BadgeCheck color={theme.textMuted} size={20} />} 
          label={t('verification')} 
          onPress={() => navigation.navigate('VerificationRequest')} 
        />
        
        <SettingRow 
          theme={theme}
          icon={<Flag color={theme.textMuted} size={20} />} 
          label={t('my_reports')} 
          onPress={() => navigation.navigate('MyReports')} 
        />

        <SettingRow 
          theme={theme}
          icon={<UserX color={theme.textMuted} size={20} />} 
          label={t('blocked_users')} 
          onPress={() => navigation.navigate('BlockedUsers')} 
        />
        
        <SettingRow 
          theme={theme}
          icon={<Bookmark color={theme.textMuted} size={20} />} 
          label={t('saved_posts')} 
          onPress={() => navigation.navigate('SavedPosts')} 
        />
        
        <SettingRow 
          theme={theme}
          icon={<Lock color={theme.textMuted} size={20} />} 
          label={t('privacy')} 
          onPress={() => navigation.navigate('PrivacySettings')} 
        />

        {/* LANGUAGE SELECTOR */}
        <View style={{ marginTop: 24, paddingHorizontal: 20, paddingBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Globe color={theme.textMuted} size={18} />
            <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: '700', marginLeft: 8, textTransform: 'uppercase' }}>{t('language')}</Text>
          </View>
          
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {[
              { code: 'en', label: 'English' },
              { code: 'tw', label: 'Twi' },
              { code: 'dg', label: 'Dagbani' },
              { code: 'fr', label: 'Français' }
            ].map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.langBtn, 
                  { 
                    borderColor: i18n.language === lang.code ? theme.primary : theme.border,
                    backgroundColor: i18n.language === lang.code ? theme.primary + '10' : 'transparent'
                  }
                ]}
                onPress={() => changeLanguage(lang.code)}
              >
                <Text style={{ color: i18n.language === lang.code ? theme.primary : theme.text, fontWeight: '600' }}>
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* DANGER ZONE */}
        <View style={{ marginTop: 12, paddingHorizontal: 20, paddingBottom: 40 }}>
          <Text style={{ color: '#E53935', fontSize: 12, fontWeight: '700', marginBottom: 16, textTransform: 'uppercase' }}>Danger Zone</Text>
          <TouchableOpacity 
            style={[styles.row, { borderBottomWidth: 0, paddingHorizontal: 0 }]}
            onPress={() => navigation.navigate('DeleteAccount')}
          >
            <View style={styles.iconContainer}>
              <Trash2 color="#E53935" size={20} />
            </View>
            <Text style={[styles.rowLabel, { color: '#E53935' }]}>{t('delete_account')}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    borderBottomWidth: 1 
  },
  title: { fontSize: 18, fontWeight: '700' },
  scrollContent: { paddingVertical: 8 },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 16, 
    paddingHorizontal: 20, 
    borderBottomWidth: 1 
  },
  iconContainer: {
    width: 32,
    alignItems: 'flex-start',
  },
  rowLabel: { 
    flex: 1, 
    fontSize: 16, 
    fontWeight: '500',
    marginLeft: 8,
  },
  langBtn: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20, 
    borderWidth: 1 
  },
});