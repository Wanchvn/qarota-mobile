import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, UserX, ShieldCheck } from 'lucide-react-native';
import { apiRequest, MEDIA_BASE } from '../lib/api';
import { useTheme } from '../lib/theme';

export default function BlockedUsersScreen({ navigation }) {
  const theme = useTheme();
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getMediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${MEDIA_BASE}/${path.replace(/^\//, '')}`;
  };

  const fetchBlockedUsers = async () => {
    try {
      const res = await apiRequest('get_blocked_users.php');
      if (res.success) {
        setBlockedUsers(res.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBlockedUsers();
  };

  const handleUnblock = (userId, username) => {
    Alert.alert(
      "Unblock User",
      `Are you sure you want to unblock @${username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unblock', style: 'default', onPress: async () => {
            const res = await apiRequest('block.php', {
              method: 'POST',
              json: { target_id: userId, action: 'unblock' }
            });
            if (res.success) {
              setBlockedUsers(prev => prev.filter(u => u.id !== userId));
            } else {
              Alert.alert('Error', res.error || 'Failed to unblock.');
            }
        }}
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={[styles.userRow, { borderBottomColor: theme.border }]}>
      <TouchableOpacity 
        style={styles.userInfoContainer}
        onPress={() => navigation.push('Profile', { username: item.username })}
      >
        {item.avatar ? (
          <Image source={{ uri: getMediaUrl(item.avatar) }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
          </View>
        )}
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: theme.text }]}>{item.name}</Text>
          <Text style={[styles.userHandle, { color: theme.textMuted }]}>@{item.username}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.unblockBtn, { borderColor: theme.border }]} 
        onPress={() => handleUnblock(item.id, item.username)}
      >
        <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>Unblock</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <ChevronLeft color={theme.text} size={28} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Blocked Users</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.center}>
              <ShieldCheck color={theme.border} size={64} style={{ marginBottom: 16 }} />
              <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700' }}>No blocked users</Text>
              <Text style={{ color: theme.textMuted, textAlign: 'center', marginTop: 8 }}>You haven't blocked anyone yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '700' },
  
  userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  userInfoContainer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '700' },
  userHandle: { fontSize: 14, marginTop: 2 },
  
  unblockBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
});