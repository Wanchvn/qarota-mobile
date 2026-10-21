import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  User, Heart, Settings, Megaphone, Flag, 
  Image as ImageIcon, ShieldCheck, BookOpen, LogOut, ChevronDown 
} from 'lucide-react-native';
import { useTheme } from '../lib/theme';

export default function ProfileDropdown({ visible, onClose, navigation, user, onLogout }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const isAdmin = user?.is_admin === true; 
  
  // FIXED: Checks for display_name, name, or username
  const displayName = user?.display_name || user?.name || user?.username || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  const handleNavigate = (screen, params) => {
    onClose();
    navigation.navigate(screen, params);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        
        <View style={[styles.dropdown, { backgroundColor: theme.surface, borderColor: theme.border, top: insets.top + 50 }]}>
          
          <TouchableOpacity style={styles.userHeader} onPress={() => handleNavigate('Profile')}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={[styles.userSub, { color: theme.textMuted }]}>View your profile</Text>
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('Profile')}>
            <User color={theme.textMuted} size={20} />
            <Text style={[styles.menuText, { color: theme.text }]}>My Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('Main', { screen: 'DatingTab' })}>
            <Heart color={theme.textMuted} size={20} />
            <Text style={[styles.menuText, { color: theme.text }]}>Dating</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('Settings')}>
            <Settings color={theme.textMuted} size={20} />
            <Text style={[styles.menuText, { color: theme.text }]}>Settings</Text>
            <ChevronDown color={theme.textMuted} size={16} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          {isAdmin && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.border, marginVertical: 8 }]} />
              <Text style={styles.adminLabel}>ADMIN</Text>

              <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('AdminAppeals')}>
                <Megaphone color={theme.textMuted} size={20} />
                <Text style={[styles.menuText, { color: theme.text }]}>Appeals</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('AdminReports')}>
                <Flag color={theme.textMuted} size={20} />
                <Text style={[styles.menuText, { color: theme.text }]}>Reported content</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('AdminVerifications', { type: 'profile' })}>
                <ImageIcon color={theme.textMuted} size={20} />
                <Text style={[styles.menuText, { color: theme.text }]}>Verification requests</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('AdminVerifications', { type: 'dating' })}>
                <ShieldCheck color={theme.textMuted} size={20} />
                <Text style={[styles.menuText, { color: theme.text }]}>Dating verifications</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('ModerationLog')}>
                <BookOpen color={theme.textMuted} size={20} />
                <Text style={[styles.menuText, { color: theme.text }]}>Moderation</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={[styles.divider, { backgroundColor: theme.border, marginVertical: 8 }]} />

          <TouchableOpacity style={styles.menuItem} onPress={onLogout}>
            <LogOut color={theme.textMuted} size={20} />
            <Text style={[styles.menuText, { color: theme.text }]}>Log out</Text>
          </TouchableOpacity>

        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.1)' },
  dropdown: {
    position: 'absolute',
    right: 16,
    width: 260,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  userHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  userInfo: { marginLeft: 12, flex: 1 },
  userName: { fontSize: 15, fontWeight: '700' },
  userSub: { fontSize: 12, marginTop: 2 },
  divider: { height: 1, marginHorizontal: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  menuText: { fontSize: 15, marginLeft: 12, fontWeight: '500' },
  adminLabel: { fontSize: 11, fontWeight: '700', color: '#C65D3B', marginLeft: 16, marginBottom: 4, marginTop: 4 },
});