import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageSquare } from 'lucide-react-native';
import { apiRequest, MEDIA_BASE } from '../lib/api';
import { useTheme } from '../lib/theme';
import { timeAgo } from '../lib/timeAgo';

export default function MessagesScreen({ navigation }) {
  const theme = useTheme();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getMediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${MEDIA_BASE}/${path.replace(/^\//, '')}`;
  };

  const fetchConversations = async () => {
    try {
      const res = await apiRequest('messages.php');
      if (res.success) {
        setConversations(res.conversations || []);
      } else {
        Alert.alert('Error', res.error || 'Could not load messages.');
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
    const unsubscribe = navigation.addListener('focus', () => {
      fetchConversations();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  // --- NEW: Helper to format the last message ---
  const getMessagePreview = (lastMessage) => {
    if (!lastMessage) return 'No messages yet';
    
    // Check if the message is a media file path
    if (lastMessage.match(/\.(jpeg|jpg|gif|png)$/i) || lastMessage.includes('img_')) {
      return '📷 Photo';
    }
    if (lastMessage.match(/\.(m4a|mp3|wav)$/i) || lastMessage.includes('voice_')) {
      return '🎤 Voice Note';
    }
    
    // Otherwise, return the normal text message
    return lastMessage;
  };
  // ----------------------------------------------

  const renderItem = ({ item }) => {
    const otherUser = item.other_user;
    const hasUnread = item.unread_count > 0;
    
    // Check if it's a media file to apply italic styling
    const isMediaPreview = item.last_message?.includes('uploads/') || item.last_message?.match(/\.(jpeg|jpg|m4a)$/i);

    return (
      <TouchableOpacity 
        style={[styles.chatRow, { borderBottomColor: theme.border }]}
        onPress={() => navigation.navigate('Chat', { 
          id: item.id, 
          name: otherUser.name, 
          avatar: otherUser.avatar 
        })}
      >
        <View style={styles.avatarContainer}>
          {otherUser.avatar ? (
            <Image source={{ uri: getMediaUrl(otherUser.avatar) }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>{otherUser.name.charAt(0)}</Text>
            </View>
          )}
          {hasUnread && <View style={[styles.unreadDot, { borderColor: theme.background }]} />}
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={[styles.name, { color: theme.text, fontWeight: hasUnread ? '800' : '600' }]} numberOfLines={1}>
              {otherUser.name}
            </Text>
            <Text style={[styles.time, { color: hasUnread ? theme.primary : theme.textMuted }]}>
              {timeAgo(item.updated_at)}
            </Text>
          </View>
          
          <Text 
            style={[
              styles.lastMessage, 
              { color: hasUnread ? theme.text : theme.textMuted, fontWeight: hasUnread ? '600' : '400' },
              isMediaPreview && { fontStyle: 'italic' } // Make media previews italic
            ]} 
            numberOfLines={1}
          >
            {getMessagePreview(item.last_message)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.header }]}>
        <Text style={[styles.headerTitle, { color: theme.headerText }]}>Messages</Text>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MessageSquare color={theme.border} size={64} style={{ marginBottom: 16 }} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No messages yet</Text>
            <Text style={[styles.emptySub, { color: theme.textMuted }]}>When you match with someone or start a conversation, it will appear here.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingVertical: 16, paddingHorizontal: 20 },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  chatRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  avatarContainer: { position: 'relative', marginRight: 16 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  unreadDot: { position: 'absolute', top: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#E53935', borderWidth: 2 },
  chatInfo: { flex: 1 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 16, flex: 1, marginRight: 8 },
  time: { fontSize: 12 },
  lastMessage: { fontSize: 14 },
  emptyContainer: { padding: 40, alignItems: 'center', marginTop: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});