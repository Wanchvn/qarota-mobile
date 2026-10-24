import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, Image, ActivityIndicator, 
  TouchableOpacity, RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, MessageCircle, UserPlus, BellRing, AtSign, MessageSquare, Users } from 'lucide-react-native'; // <-- Added MessageSquare & Users
import { apiRequest, MEDIA_BASE } from '../lib/api';
import { useTheme } from '../lib/theme';
import { useAppContext } from '../lib/AppContext'; 
import { timeAgo } from '../lib/timeAgo';

export default function NotificationsScreen({ navigation }) {
  const theme = useTheme();
  const { fetchCounts } = useAppContext(); 
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getMediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${MEDIA_BASE}/${path.replace(/^\//, '')}`;
  };

  const fetchNotifications = async () => {
    try {
      const res = await apiRequest('notifications.php');
      
      if (res.success) {
        setNotifications(res.notifications);
        await apiRequest('mark_notifications_read.php', { method: 'POST' });
        fetchCounts(); 
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchNotifications();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleNotificationPress = (item) => {
    if (item.type === 'follow' || item.type === 'friendship') {
      navigation.push('Profile', { username: item.actor.username });
    } else if (item.post_id) {
      // This handles 'like', 'comment', and 'reply' (since they all have post_id)
      navigation.push('PostDetail', { postId: item.post_id });
    } else {
      navigation.push('Profile', { username: item.actor.username });
    }
  };

  const getIconAndColor = (type) => {
    switch (type) {
      case 'like': return { icon: <Heart size={14} color="#fff" fill="#fff" />, color: '#E53935' }; 
      case 'comment': return { icon: <MessageCircle size={14} color="#fff" fill="#fff" />, color: '#1E88E5' };
      case 'reply': return { icon: <MessageSquare size={14} color="#fff" fill="#fff" />, color: '#FB8C00' }; // Orange for replies
      case 'follow': return { icon: <UserPlus size={14} color="#fff" />, color: '#43A047' };
      case 'friendship': return { icon: <Users size={14} color="#fff" />, color: '#8E24AA' }; // Purple for friends
      case 'mention': return { icon: <AtSign size={14} color="#fff" />, color: '#8E24AA' };
      default: return { icon: <BellRing size={14} color="#fff" />, color: theme.primary };
    }
  };

  const getActionText = (type) => {
    switch (type) {
      case 'like': return 'liked your post';
      case 'comment': return 'commented on your post';
      case 'reply': return 'replied to your comment'; // NEW
      case 'follow': return 'started following you';
      case 'friendship': return 'and you are now friends! 🎉'; // NEW
      case 'mention': return 'mentioned you';
      default: return 'interacted with you';
    }
  };

  if (loading && !refreshing) {
    return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Notifications</Text>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        renderItem={({ item }) => {
          const { icon, color } = getIconAndColor(item.type);
          const isUnread = !item.is_read;

          return (
            <TouchableOpacity 
              style={[
                styles.row, 
                { borderBottomColor: theme.border, backgroundColor: theme.surface },
                isUnread && { backgroundColor: theme.primary + '10' } 
              ]}
              onPress={() => handleNotificationPress(item)}
            >
              
              <View style={styles.avatarContainer}>
                {item.actor.avatar ? (
                  <Image source={{ uri: getMediaUrl(item.actor.avatar) }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                    <Text style={styles.avatarText}>{item.actor.name.charAt(0)}</Text>
                  </View>
                )}
                <View style={[styles.iconBadge, { backgroundColor: color, borderColor: theme.surface }]}>
                  {icon}
                </View>
              </View>

              <View style={styles.rowContent}>
                <Text style={[styles.text, { color: theme.text }]}>
                  <Text style={{ fontWeight: '700' }}>{item.actor.name}</Text> {getActionText(item.type)}
                </Text>
                
                {item.preview_text && (
                  <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 2, fontStyle: 'italic' }} numberOfLines={1}>
                    "{item.preview_text}"
                  </Text>
                )}

                <Text style={[styles.time, { color: theme.textMuted, fontWeight: isUnread ? '700' : '400' }]}>
                  {timeAgo(item.created_at)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <BellRing color={theme.border} size={64} style={{ marginBottom: 16 }} />
            <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700', marginBottom: 8 }}>No notifications</Text>
            <Text style={{ color: theme.textMuted, textAlign: 'center' }}>When people interact with you, you'll see it here.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1 },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  
  row: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, alignItems: 'center' },
  
  avatarContainer: { position: 'relative', marginRight: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  iconBadge: { position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  
  rowContent: { flex: 1 },
  text: { fontSize: 15, lineHeight: 20 },
  time: { fontSize: 12, marginTop: 4 },
  
  emptyContainer: { padding: 40, alignItems: 'center', marginTop: 60 },
});