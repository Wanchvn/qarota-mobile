import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, Image, ActivityIndicator, Platform,
  TouchableOpacity, RefreshControl, Modal, Alert, TextInput 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store'; 
import { 
  MapPin, Briefcase, GraduationCap, Languages, Star, 
  BadgeCheck, Mail, UserPlus, UserMinus, Users
} from 'lucide-react-native';
import { apiRequest, MEDIA_BASE } from '../lib/api'; 
import PostCard from '../components/PostCard';
import CommentModal from '../components/CommentModal';
import PostSkeleton from '../components/PostSkeleton'; 
import { useTheme } from '../lib/theme';

export default function ProfileScreen({ route, navigation, onLogout }) {
  const theme = useTheme();
  const viewUsername = route.params?.username || null; 
  
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activePostId, setActivePostId] = useState(null);
  
  const [myUsername, setMyUsername] = useState(null);
  const [messaging, setMessaging] = useState(false); 

  const [menuVisible, setMenuVisible] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');

  const getMediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${MEDIA_BASE}/${path.replace(/^\//, '')}`;
  };

  const fetchProfile = async () => {
    const endpoint = viewUsername ? `user_profile.php?username=${viewUsername}` : 'user_profile.php';
    const res = await apiRequest(endpoint);
    if (res.success) {
      setProfile(res.profile);
      setPosts(res.posts);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await apiRequest('me.php');
        if (res.success && res.user) {
          setMyUsername(res.user.username);
        }
      } catch (e) {
        console.log("Could not fetch my username", e);
      }
    };
    fetchMe();
  }, []);

  useEffect(() => {
    navigation.setOptions({ title: viewUsername ? `@${viewUsername}` : 'My Profile' });
    const unsubscribe = navigation.addListener('focus', () => {
      fetchProfile();
    });
    return unsubscribe;
  }, [navigation, viewUsername]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const handleFollow = async () => {
    const wasFollowing = profile.is_following;
    const willBeFriend = !wasFollowing && profile.is_followed_by; // If I follow them, and they follow me
    
    setProfile(prev => ({ 
      ...prev, 
      is_following: !wasFollowing,
      is_friend: willBeFriend,
      stats: {
        ...prev.stats,
        followers: wasFollowing ? prev.stats.followers - 1 : prev.stats.followers + 1
      }
    }));

    const res = await apiRequest('follow.php', {
      method: 'POST',
      json: { target_id: profile.id }
    });

    if (!res.success) {
      setProfile(prev => ({ 
        ...prev, 
        is_following: wasFollowing,
        is_friend: wasFollowing && profile.is_followed_by, // rollback
        stats: {
          ...prev.stats,
          followers: wasFollowing ? prev.stats.followers + 1 : prev.stats.followers - 1
        }
      }));
      Alert.alert('Follow Error', res.error || 'Could not update follow status.');
    }
  };

  const handleMessage = async () => {
    if (messaging) return; 
    setMessaging(true);

    try {
      const res = await apiRequest('message_start.php', {
        method: 'POST',
        json: { target_id: profile.id }
      });

      if (res.success && res.conversation_id) {
        navigation.navigate('Chat', { 
          id: res.conversation_id, 
          name: profile.name,
          avatar: profile.avatar,
          username: profile.username
        });
      } else {
        Alert.alert('Message Error', res.error || 'Could not start conversation.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error while starting chat.');
    } finally {
      setMessaging(false);
    }
  };

  const handleBlock = async () => {
    setMenuVisible(false);
    Alert.alert(
      profile.is_blocked ? "Unblock User" : "Block User",
      `Are you sure you want to ${profile.is_blocked ? 'unblock' : 'block'} @${profile.username}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Yes", style: "destructive", onPress: async () => {
            const res = await apiRequest('block.php', {
              method: 'POST',
              json: { target_id: profile.id, action: profile.is_blocked ? 'unblock' : 'block' }
            });
            if (res.success) fetchProfile();
        }}
      ]
    );
  };

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    const res = await apiRequest('report.php', {
      method: 'POST',
      json: { target_id: profile.id, reason: 'other', details: reportReason }
    });
    if (res.success) {
      setReportModal(false);
      setMenuVisible(false);
      setReportReason('');
      Alert.alert("Reported", "Thank you. Our moderators will review this account.");
    }
  };

  const handleLike = async (postId) => {
    setPosts((current) => current.map(p => p.id === postId ? { ...p, stats: { ...p.stats, liked_by_me: !p.stats.liked_by_me, likes: p.stats.liked_by_me ? p.stats.likes - 1 : p.stats.likes + 1 } } : p));
    const res = await apiRequest('like.php', { method: 'POST', json: { post_id: postId } });
    if (!res.success) fetchProfile();
  };

  const handleCommentAdded = () => {
    setPosts((current) => current.map(p => p.id === activePostId ? { ...p, stats: { ...p.stats, comments: p.stats.comments + 1 } } : p));
  };

  const handleDelete = (postId) => {
    setPosts((current) => current.filter(p => p.id !== postId));
  };

  const renderDetailRow = (icon, text) => (
    text ? (
      <View style={styles.detailRow}>
        {icon}
        <Text style={[styles.detailText, { color: theme.text }]}>{text}</Text>
      </View>
    ) : null
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={{ padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.border }} />
            <View style={{ marginLeft: 16, flex: 1 }}>
              <View style={{ width: 150, height: 24, backgroundColor: theme.border, marginBottom: 8, borderRadius: 4 }} />
              <View style={{ width: 100, height: 16, backgroundColor: theme.border, borderRadius: 4 }} />
            </View>
          </View>
          <View style={{ width: '100%', height: 60, backgroundColor: theme.border, borderRadius: 4, marginBottom: 20 }} />
        </View>
        <View style={{ paddingHorizontal: 16 }}>
          <PostSkeleton />
          <PostSkeleton />
        </View>
      </View>
    );
  }

  if (!profile) {
    return <View style={[styles.center, { backgroundColor: theme.background }]}><Text style={{ color: theme.textMuted }}>User not found.</Text></View>;
  }

  const isMyProfile = !viewUsername || viewUsername === myUsername;

  const profileHeader = (
    <View style={styles.headerContainer}>
      
      <View style={styles.profileRow}>
        <View style={{ position: 'relative' }}>
          {profile.avatar ? (
            <Image source={{ uri: getMediaUrl(profile.avatar) }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>{profile.name.charAt(0)}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.profileInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
              {isMyProfile ? 'Hello, ' : ''}{profile.name}
            </Text>
            {profile.is_verified && <BadgeCheck color="#E5A93D" size={20} style={{ marginLeft: 6 }} />}
          </View>
          <Text style={[styles.username, { color: theme.textMuted }]}>@{profile.username}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: theme.text }]}>{profile.stats.posts}</Text>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>posts</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.stat} 
          onPress={() => navigation.push('Connections', { username: profile.username, initialTab: 'followers' })}
        >
          <Text style={[styles.statNum, { color: theme.text }]}>{profile.stats.followers}</Text>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>followers</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.stat} 
          onPress={() => navigation.push('Connections', { username: profile.username, initialTab: 'following' })}
        >
          <Text style={[styles.statNum, { color: theme.text }]}>{profile.stats.following}</Text>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>following</Text>
        </TouchableOpacity>
      </View>

      {profile.bio ? <Text style={[styles.bio, { color: theme.text }]}>{profile.bio}</Text> : null}

      <View style={styles.detailsContainer}>
        {renderDetailRow(<MapPin color={theme.textMuted} size={16} />, profile.location)}
        {renderDetailRow(<Briefcase color={theme.textMuted} size={16} />, profile.work)}
        {renderDetailRow(<GraduationCap color={theme.textMuted} size={16} />, profile.education)}
        {renderDetailRow(<Languages color={theme.textMuted} size={16} />, profile.languages)}
        {renderDetailRow(<Star color={theme.textMuted} size={16} />, profile.interests)}
      </View>

      {isMyProfile && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]} 
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.primaryBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isMyProfile && (
        <View style={styles.actionsContainer}>
          <View style={styles.profileActionsRow}>
            
            {/* FIXED BUTTON LOGIC HERE */}
            <TouchableOpacity 
              style={[
                styles.profileActionBtn, 
                { 
                  borderColor: profile.is_friend ? theme.primary : (profile.is_following ? theme.border : theme.primary), 
                  backgroundColor: profile.is_friend ? theme.primary : (profile.is_following ? 'transparent' : theme.primary) 
                }
              ]} 
              onPress={handleFollow}
            >
              {profile.is_friend ? (
                <>
                  <Users color="#fff" size={18} />
                  <Text style={[styles.profileActionText, { color: '#fff' }]}>Friends</Text>
                </>
              ) : profile.is_following ? (
                <>
                  <UserMinus color={theme.textMuted} size={18} />
                  <Text style={[styles.profileActionText, { color: theme.textMuted }]}>Following</Text>
                </>
              ) : profile.is_followed_by ? (
                <>
                  <UserPlus color="#fff" size={18} />
                  <Text style={[styles.profileActionText, { color: '#fff' }]}>Follow Back</Text>
                </>
              ) : (
                <>
                  <UserPlus color="#fff" size={18} />
                  <Text style={[styles.profileActionText, { color: '#fff' }]}>Follow</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.profileActionBtn, { borderColor: theme.primary, backgroundColor: 'transparent' }]} 
              onPress={handleMessage}
              disabled={messaging}
            >
              {messaging ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <>
                  <Mail color={theme.primary} size={18} />
                  <Text style={[styles.profileActionText, { color: theme.primary }]}>Message</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={[styles.secondaryBtn, { width: '100%', marginTop: 10, borderColor: theme.border, backgroundColor: theme.surface }]} 
            onPress={() => setMenuVisible(true)}
          >
            <Text style={[styles.secondaryBtnText, { color: theme.textMuted }]}>More Options</Text>
          </TouchableOpacity>
        </View>
      )}

      {isMyProfile && (
        <TouchableOpacity 
          style={[styles.composePrompt, { backgroundColor: theme.background, borderColor: theme.border }]}
          onPress={() => navigation.navigate('Compose')}
        >
          <Text style={{ color: theme.textMuted }}>What&apos;s on your mind?</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={profileHeader}
        renderItem={({ item }) => (
          <PostCard 
            post={item} 
            navigation={navigation} 
            onLike={() => handleLike(item.id)} 
            onComment={() => setActivePostId(item.id)} 
            onProfilePress={() => navigation.push('Profile', { username: item.author.username })}
            onDelete={handleDelete}
            onTopicPress={(topic) => navigation.push('TopicDetail', { topicName: topic })}
            onEdit={() => navigation.navigate('EditPost', { post: item, onPostUpdated: fetchProfile })}
            isMine={item.is_mine}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={{ textAlign: 'center', color: theme.textMuted }}>No posts yet.</Text>
          </View>
        }
      />

      <CommentModal 
        visible={!!activePostId} 
        postId={activePostId} 
        onClose={() => setActivePostId(null)} 
        onCommentAdded={handleCommentAdded} 
      />

      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={[styles.actionSheet, { backgroundColor: theme.surface }]}>
            <TouchableOpacity style={[styles.sheetBtn, { borderBottomColor: theme.border }]} onPress={() => { setMenuVisible(false); setReportModal(true); }}>
              <Text style={[styles.sheetBtnText, { color: theme.text }]}>Report User</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sheetBtn, { borderBottomColor: theme.border }]} onPress={handleBlock}>
              <Text style={styles.sheetBtnTextDanger}>
                {profile.is_blocked ? 'Unblock User' : 'Block User'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetBtn} onPress={() => setMenuVisible(false)}>
              <Text style={[styles.sheetBtnText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={reportModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={{ backgroundColor: theme.surface, padding: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16, marginTop: 'auto' }}>
            <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 16, color: theme.text }}>Report @{profile.username}</Text>
            <TextInput
              style={{ backgroundColor: theme.background, color: theme.text, padding: 12, borderRadius: 8, height: 100, textAlignVertical: 'top', marginBottom: 16 }}
              placeholder="Why are you reporting this user?"
              placeholderTextColor={theme.textMuted}
              multiline
              value={reportReason}
              onChangeText={setReportReason}
            />
            <TouchableOpacity style={[styles.primaryBtn, { marginBottom: 0 }]} onPress={handleReport}>
              <Text style={styles.primaryBtnText}>Submit Report</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ padding: 16, alignItems: 'center' }} onPress={() => setReportModal(false)}>
              <Text style={{ color: theme.textMuted }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 40 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  headerContainer: { marginBottom: 20 },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, marginRight: 16 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  profileInfo: { flex: 1 },
  name: { fontSize: 22, fontWeight: '800' },
  username: { fontSize: 14, marginTop: 2 },
  statsRow: { flexDirection: 'row', marginBottom: 16 },
  stat: { marginRight: 20, flexDirection: 'row', alignItems: 'baseline' },
  statNum: { fontSize: 16, fontWeight: '700', marginRight: 4 },
  statLabel: { fontSize: 13 },
  bio: { fontSize: 15, lineHeight: 22, marginBottom: 16 },
  detailsContainer: { marginBottom: 16 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  detailText: { fontSize: 14, marginLeft: 10, flex: 1 },
  
  // ACTION STYLES
  actionsContainer: { marginBottom: 16, marginTop: 8 },
  primaryBtn: { paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  
  secondaryBtn: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryBtnText: { fontSize: 13, fontWeight: '600' },

  // PROFILE ACTIONS ROW (For other users)
  profileActionsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  profileActionBtn: { flex: 1, flexDirection: 'row', paddingVertical: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  profileActionText: { fontSize: 15, fontWeight: '700' },

  composePrompt: { padding: 16, borderRadius: 8, borderWidth: 1, marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  actionSheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 30, paddingTop: 10 },
  sheetBtn: { padding: 16, borderBottomWidth: 1, alignItems: 'center' },
  sheetBtnText: { fontSize: 16, fontWeight: '500' },
  sheetBtnTextDanger: { fontSize: 16, color: '#E53935', fontWeight: '700' },
});