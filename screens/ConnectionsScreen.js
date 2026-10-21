import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, UserPlus, UserMinus } from 'lucide-react-native';
import { apiRequest, MEDIA_BASE } from '../lib/api';
import { useTheme } from '../lib/theme';

export default function ConnectionsScreen({ route, navigation }) {
  const { username, initialTab } = route.params; 
  const theme = useTheme();
  
  const [activeTab, setActiveTab] = useState(initialTab || 'followers');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getMediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${MEDIA_BASE}/${path.replace(/^\//, '')}`;
  };

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`get_connections.php?username=${username}&type=${activeTab}`);
      if (res.success) {
        setUsers(res.users || []);
      } else {
        Alert.alert('Error', res.error || 'Could not load connections.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Network error.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConnections();
  };

  const handleFollowToggle = async (userId, isFollowing) => {
    // Optimistic update
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_following: !isFollowing } : u));
    
    try {
      const res = await apiRequest('follow.php', {
        method: 'POST',
        json: { target_id: userId }
      });
      
      if (!res.success) {
        // Revert on failure
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_following: isFollowing } : u));
        Alert.alert('Error', res.error || 'Could not update follow status.');
      }
    } catch (e) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_following: isFollowing } : u));
      Alert.alert('Error', 'Network error.');
    }
  };

  // --- SKELETON LOADER ---
  const UserSkeleton = () => (
    <View style={[styles.userRow, { borderBottomColor: theme.border }]}>
      <View style={[styles.avatarPlaceholder, { backgroundColor: theme.border }]} />
      <View style={styles.userInfo}>
        <View style={{ width: 120, height: 16, backgroundColor: theme.border, borderRadius: 4, marginBottom: 8 }} />
        <View style={{ width: 80, height: 12, backgroundColor: theme.border, borderRadius: 4 }} />
      </View>
    </View>
  );

  const renderUser = ({ item }) => {
    return (
      <TouchableOpacity 
        style={[styles.userRow, { borderBottomColor: theme.border }]}
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
          <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.userHandle, { color: theme.textMuted }]} numberOfLines={1}>@{item.username}</Text>
        </View>

        {!item.is_me && (
          <TouchableOpacity 
            style={[
              styles.followBtn, 
              item.is_following 
                ? { backgroundColor: 'transparent', borderColor: theme.border, borderWidth: 1 } 
                : { backgroundColor: theme.primary }
            ]}
            onPress={() => handleFollowToggle(item.id, item.is_following)}
          >
            {item.is_following ? (
              <Text style={[styles.followBtnText, { color: theme.textMuted }]}>Following</Text>
            ) : (
              <Text style={[styles.followBtnText, { color: '#fff' }]}>Follow</Text>
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <ChevronLeft color={theme.text} size={28} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>@{username}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* TABS */}
      <View style={[styles.tabContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'followers' && { borderBottomColor: theme.primary }]}
          onPress={() => setActiveTab('followers')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'followers' ? theme.primary : theme.textMuted }]}>
            Followers
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'following' && { borderBottomColor: theme.primary }]}
          onPress={() => setActiveTab('following')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'following' ? theme.primary : theme.textMuted }]}>
            Following
          </Text>
        </TouchableOpacity>
      </View>

      {/* LIST */}
      {loading && !refreshing ? (
        <View style={{ paddingTop: 16 }}>
          <UserSkeleton />
          <UserSkeleton />
          <UserSkeleton />
          <UserSkeleton />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderUser}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <UserPlus color={theme.border} size={64} style={{ marginBottom: 16 }} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {activeTab === 'followers' ? 'No followers yet' : 'Not following anyone'}
              </Text>
              <Text style={[styles.emptySub, { color: theme.textMuted }]}>
                {activeTab === 'followers' 
                  ? 'When people follow this account, they will appear here.' 
                  : 'When this account follows people, they will appear here.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '700' },
  
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 15, fontWeight: '600' },
  
  userRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  userInfo: { flex: 1, marginRight: 12 },
  userName: { fontSize: 16, fontWeight: '700' },
  userHandle: { fontSize: 14, marginTop: 2 },
  
  followBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, minWidth: 90, alignItems: 'center' },
  followBtnText: { fontSize: 14, fontWeight: '600' },
  
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});