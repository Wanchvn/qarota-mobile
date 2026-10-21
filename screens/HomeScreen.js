import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Image, Alert } from 'react-native'; // <-- ADDED Alert
import { SafeAreaView } from 'react-native-safe-area-context';
import { Compass, Bell, Search } from 'lucide-react-native'; 
import { apiRequest, MEDIA_BASE } from '../lib/api';
import { useTheme } from '../lib/theme';
import { useAppContext } from '../lib/AppContext';
import PostCard from '../components/PostCard';
import CommentModal from '../components/CommentModal';
import ProfileDropdown from '../components/ProfileDropdown';
import PostSkeleton from '../components/PostSkeleton';

export default function HomeScreen({ navigation, onLogout }) {
  const theme = useTheme();
  const { unreadNotifications } = useAppContext(); 
  
  const [posts, setPosts] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [myAvatar, setMyAvatar] = useState(null);
  const [myName, setMyName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false); 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activePostId, setActivePostId] = useState(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [visiblePostId, setVisiblePostId] = useState(null);
  
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const visibleVideo = viewableItems.find(item => item.item.media_type === 'video');
      setVisiblePostId(visibleVideo ? visibleVideo.item.id : null);
    }
  }).current;

  const getMediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${MEDIA_BASE}/${path.replace(/^\//, '')}`;
  };

  const fetchFeed = async (pageNum = 1, isRefresh = false) => {
    if (!hasMore && pageNum > 1) return;

    try {
      const res = await apiRequest(`feed.php?page=${pageNum}&limit=15`);
      if (res.success) {
        if (pageNum === 1) {
          setPosts(res.posts);
        } else {
          setPosts(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newPosts = res.posts.filter(p => !existingIds.has(p.id));
            return [...prev, ...newPosts];
          });
        }
        setHasMore(res.posts.length === 15);
        setPage(pageNum);
      }

      if (pageNum === 1) {
        const meRes = await apiRequest('me.php');
        if (meRes.success && meRes.user) {
          setMyAvatar(meRes.user.avatar);
          setMyName(meRes.user.display_name || meRes.user.name || meRes.user.username || '');
          setIsAdmin(meRes.user.is_admin === true);
        }

        const suggestRes = await apiRequest('get_suggested_users.php');
        if (suggestRes.success) {
          setSuggestedUsers(suggestRes.suggested || []);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchFeed(1);
    const unsubscribe = navigation.addListener('focus', () => {
      if (page === 1) fetchFeed(1);
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    setHasMore(true);
    fetchFeed(1, true);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore && !loading && !refreshing) {
      setLoadingMore(true);
      fetchFeed(page + 1);
    }
  };

  // --- FIXED: Optimistic Updates & Error Alerts ---
  const handleSuggestedFollow = async (userId) => {
    // 1. Optimistically remove from list
    setSuggestedUsers(prev => prev.filter(u => u.id !== userId));
    
    try {
      const res = await apiRequest('follow.php', { method: 'POST', json: { target_id: userId } });
      
      if (!res.success) {
        // Show error and bring them back
        Alert.alert('Follow Error', res.error || 'Failed to follow user.');
        const suggestRes = await apiRequest('get_suggested_users.php');
        if (suggestRes.success) setSuggestedUsers(suggestRes.suggested || []);
      }
    } catch (e) {
      Alert.alert('Error', 'Network error.');
    }
  };

  const handleLike = async (postId) => {
    setPosts((current) => current.map(p => p.id === postId ? { ...p, stats: { ...p.stats, liked_by_me: !p.stats.liked_by_me, likes: p.stats.liked_by_me ? p.stats.likes - 1 : p.stats.likes + 1 } } : p));
    const res = await apiRequest('like.php', { method: 'POST', json: { post_id: postId } });
    if (!res.success) fetchFeed(1);
  };

  const handleCommentAdded = () => {
    setPosts((current) => current.map(p => p.id === activePostId ? { ...p, stats: { ...p.stats, comments: p.stats.comments + 1 } } : p));
  };

  const handleDelete = (postId) => {
    setPosts((current) => current.filter(p => p.id !== postId));
  };

  const FeedHeader = () => (
    <View>
      <Text style={[styles.pageTitle, { color: theme.text }]}>Your Feed</Text>
      
      {suggestedUsers.length > 0 && (
        <View style={[styles.whoToFollowCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.cardAccent, { backgroundColor: theme.primary }]} />
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Who to follow</Text>
            <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>People you might want to connect with.</Text>
            
            {suggestedUsers.map((user, index) => (
              <View key={user.id} style={[styles.userRow, index === suggestedUsers.length - 1 && { borderBottomWidth: 0 }]}>
                <TouchableOpacity onPress={() => navigation.push('Profile', { username: user.username })}>
                  {user.avatar ? (
                    <Image source={{ uri: getMediaUrl(user.avatar) }} style={styles.avatarImage} />
                  ) : (
                    <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                      <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>{user.name}</Text>
                  <Text style={[styles.userReason, { color: theme.textMuted }]} numberOfLines={1}>@{user.username}</Text>
                </View>

                <TouchableOpacity 
                  style={[styles.followBtn, { backgroundColor: theme.primary }]}
                  onPress={() => handleSuggestedFollow(user.id)}
                >
                  <Text style={styles.followBtnText}>Follow</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.header }]}>
          <Text style={[styles.logo, { color: theme.headerText }]}>Qarota</Text>
        </View>
        <View style={{ padding: 16 }}>
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      
      <View style={[styles.header, { backgroundColor: theme.header }]}>
        <Text style={[styles.logo, { color: theme.headerText }]}>Qarota</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.navigate('SearchTab')} style={{ marginRight: 20 }}>
            <Search color={theme.headerText} size={22} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Discover')} style={{ marginRight: 20 }}>
            <Compass color={theme.headerText} size={22} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={{ marginRight: 20, position: 'relative' }}>
            <Bell color={theme.headerText} size={22} />
            {unreadNotifications > 0 && (
              <View style={{
                position: 'absolute', top: -4, right: -4,
                backgroundColor: '#E53935', width: 16, height: 16, borderRadius: 8,
                alignItems: 'center', justifyContent: 'center'
              }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => setDropdownVisible(true)}>
            {myAvatar ? (
              <Image source={{ uri: getMediaUrl(myAvatar) }} style={{ width: 32, height: 32, borderRadius: 16 }} />
            ) : (
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                  {myName ? myName.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={FeedHeader}
        renderItem={({ item }) => (
          <PostCard 
            post={item} 
            navigation={navigation}
            isVisible={visiblePostId === item.id}
            onLike={() => handleLike(item.id)} 
            onComment={() => setActivePostId(item.id)} 
            onProfilePress={() => navigation.push('Profile', { username: item.author.username })}
            onDelete={handleDelete}
            onTopicPress={(topic) => navigation.push('TopicDetail', { topicName: topic })}
            onEdit={() => navigation.navigate('EditPost', { post: item, onPostUpdated: () => fetchFeed(1) })}
            isMine={item.is_mine}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 20 }}>
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 60, marginBottom: 20 }}>🌍</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Welcome to Qarota!</Text>
            <Text style={[styles.emptySub, { color: theme.textMuted }]}>
              Your feed is empty because you aren't following anyone yet. 
              Tap below to discover new people and topics.
            </Text>
            <TouchableOpacity 
              style={[styles.exploreBtn, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate('Discover')}
            >
              <Text style={styles.exploreBtnText}>Discover People</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity style={[styles.fab, { backgroundColor: theme.primary }]} onPress={() => navigation.navigate('Compose')}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      <CommentModal visible={!!activePostId} postId={activePostId} onClose={() => setActivePostId(null)} onCommentAdded={handleCommentAdded} />

      <ProfileDropdown 
        visible={dropdownVisible} 
        onClose={() => setDropdownVisible(false)} 
        navigation={navigation}
        user={{ avatar: myAvatar ? getMediaUrl(myAvatar) : null, name: myName, is_admin: isAdmin }}
        onLogout={() => {
          setDropdownVisible(false);
          if (onLogout) onLogout();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingVertical: 12, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo: { fontSize: 24, fontWeight: '800' },
  list: { padding: 16, paddingBottom: 100 },
  emptyContainer: { padding: 40, alignItems: 'center', marginTop: 40 },
  emptyTitle: { fontSize: 24, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  emptySub: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  exploreBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  exploreBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  pageTitle: { fontSize: 22, fontWeight: '800', marginBottom: 16, marginTop: 4 },
  whoToFollowCard: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
  cardAccent: { width: 4 },
  cardContent: { flex: 1, padding: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, marginBottom: 16 },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 36, height: 36, borderRadius: 18 },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  userInfo: { flex: 1, marginLeft: 12, marginRight: 8 },
  userName: { fontSize: 15, fontWeight: '600' },
  userReason: { fontSize: 12, marginTop: 2 },
  followBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 6 },
  followBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 8 },
  fabIcon: { color: '#fff', fontSize: 32, fontWeight: '400', marginTop: -4 },
});