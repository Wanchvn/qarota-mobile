import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, Image, ActivityIndicator, 
  TouchableOpacity, RefreshControl, Modal, Alert, TextInput 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker'; 
import { 
  MapPin, Briefcase, GraduationCap, Languages, Star, 
  CheckCircle2, Eye, Lock, Users, Bookmark, Mail, UserPlus, UserMinus, Camera
} from 'lucide-react-native';
import { apiRequest, setAuthToken, MEDIA_BASE, getAuthToken, API_BASE } from '../lib/api'; 
import PostCard from '../components/PostCard';
import CommentModal from '../components/CommentModal';
import PostSkeleton from '../components/PostSkeleton'; 
import { compressImage } from '../lib/imageUtils';
import { useTheme } from '../lib/theme';

export default function ProfileScreen({ route, navigation, onLogout }) {
  const theme = useTheme();
  const viewUsername = route.params?.username || null; 
  
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activePostId, setActivePostId] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // FIXED: Added missing messaging state
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

  const handleLogout = async () => {
    await apiRequest('logout.php', { method: 'POST' });
    await SecureStore.deleteItemAsync('qarota_token');
    setAuthToken(null);
    if (onLogout) onLogout();
  };

  const handleAvatarChange = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      return Alert.alert("Permission required", "You need to allow Qarota to access your photos.");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1, 
    });

    if (!result.canceled) {
      setUploadingAvatar(true);
      const asset = result.assets[0];
      
      const compressedUri = await compressImage(asset.uri);
      
      const formData = new FormData();
      formData.append('avatar', { 
        uri: compressedUri, 
        name: 'avatar.jpg', 
        type: 'image/jpeg' 
      });

      try {
        const response = await fetch(`${API_BASE}/profile_update.php`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
            'Accept': 'application/json',
          },
          body: formData,
        });
        const data = await response.json();
        
        if (data.success) {
          fetchProfile(); 
          Alert.alert('Success', 'Profile picture updated!');
        } else {
          Alert.alert('Error', data.error || 'Could not update picture.');
        }
      } catch (error) {
        Alert.alert('Error', 'Network error while uploading.');
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  const handleFollow = async () => {
    const wasFollowing = profile.is_following;
    
    setProfile(prev => ({ 
      ...prev, 
      is_following: !wasFollowing,
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
          avatar: profile.avatar 
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

  const DetailRow = ({ icon, text }) => {
    if (!text) return null;
    return (
      <View style={styles.detailRow}>
        {icon}
        <Text style={[styles.detailText, { color: theme.text }]}>{text}</Text>
      </View>
    );
  };

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

  const Header = () => (
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
          {uploadingAvatar && (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 40, alignItems: 'center', justifyContent: 'center' }]}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
        </View>
        
        <View style={styles.profileInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
              {viewUsername ? '' : 'Hello, '}{profile.name}
            </Text>
            {profile.is_verified && <CheckCircle2 color={theme.primary} size={18} style={{ marginLeft: 6 }} />}
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
        <DetailRow icon={<MapPin color={theme.textMuted} size={16} />} text={profile.location} />
        <DetailRow icon={<Briefcase color={theme.textMuted} size={16} />} text={profile.work} />
        <DetailRow icon={<GraduationCap color={theme.textMuted} size={16} />} text={profile.education} />
        <DetailRow icon={<Languages color={theme.textMuted} size={16} />} text={profile.languages} />
        <DetailRow icon={<Star color={theme.textMuted} size={16} />} text={profile.interests} />
      </View>

      {!viewUsername && (
        <View style={styles.actionGrid}>
          <TouchableOpacity style={[styles.actionBtn, { borderColor: theme.primary }]} onPress={() => navigation.navigate('EditProfile')}>
            <Text style={[styles.actionBtnText, { color: theme.primary }]}>Edit profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionBtn, { borderColor: theme.primary }]} onPress={handleAvatarChange}>
            <Text style={[styles.actionBtnText, { color: theme.primary }]}>Change picture</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionBtn, { borderColor: theme.primary }]} onPress={() => navigation.navigate('SavedPosts')}>
            <Text style={[styles.actionBtnText, { color: theme.primary }]}>Saved posts</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionBtn, { borderColor: theme.primary }]} onPress={() => navigation.navigate('ExportData')}>
            <Text style={[styles.actionBtnText, { color: theme.primary }]}>Export data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionBtn, { borderColor: theme.border }]} onPress={() => navigation.navigate('Settings')}>
            <Text style={[styles.actionBtnText, { color: theme.textMuted }]}>Privacy</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionBtn, { borderColor: '#E53935' }]} onPress={handleLogout}>
            <Text style={[styles.actionBtnText, { color: '#E53935' }]}>Log out</Text>
          </TouchableOpacity>
        </View>
      )}

      {viewUsername && (
        <View style={styles.actionGrid}>
          <TouchableOpacity 
            style={[styles.actionBtn, { borderColor: profile.is_following ? theme.border : theme.primary, flexDirection: 'row', gap: 6 }]} 
            onPress={handleFollow}
          >
            {profile.is_following ? <UserMinus color={theme.textMuted} size={16} /> : <UserPlus color={theme.primary} size={16} />}
            <Text style={[styles.actionBtnText, { color: profile.is_following ? theme.textMuted : theme.primary }]}>
              {profile.is_following ? 'Unfollow' : 'Follow'}
            </Text>
          </TouchableOpacity>

          {/* FIXED: Added messaging spinner to the button */}
          <TouchableOpacity 
            style={[styles.actionBtn, { borderColor: theme.primary, flexDirection: 'row', gap: 6 }]} 
            onPress={handleMessage}
            disabled={messaging}
          >
            {messaging ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <>
                <Mail color={theme.primary} size={16} />
                <Text style={[styles.actionBtnText, { color: theme.primary }]}>Message</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionBtn, { borderColor: theme.border, flexDirection: 'row', gap: 6 }]} 
            onPress={() => setMenuVisible(true)}
          >
            <Text style={[styles.actionBtnText, { color: theme.textMuted }]}>Options</Text>
          </TouchableOpacity>
        </View>
      )}

      {!viewUsername && (
        <TouchableOpacity 
          style={[styles.composePrompt, { backgroundColor: theme.background, borderColor: theme.border }]}
          onPress={() => navigation.navigate('Compose')}
        >
          <Text style={{ color: theme.textMuted }}>What's on your mind?</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={<Header />}
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
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.primary, borderColor: theme.primary, padding: 14 }]} onPress={handleReport}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Submit Report</Text>
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
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
  composePrompt: { padding: 16, borderRadius: 8, borderWidth: 1, marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  actionSheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 30, paddingTop: 10 },
  sheetBtn: { padding: 16, borderBottomWidth: 1, alignItems: 'center' },
  sheetBtnText: { fontSize: 16, fontWeight: '500' },
  sheetBtnTextDanger: { fontSize: 16, color: '#E53935', fontWeight: '700' },
});