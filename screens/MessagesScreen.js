import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Alert, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageSquare, Plus } from 'lucide-react-native';
import { apiRequest, MEDIA_BASE } from '../lib/api';
import { useTheme } from '../lib/theme';
import { timeAgo } from '../lib/timeAgo';

export default function MessagesScreen({ navigation }) {
  const theme = useTheme();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleSearchQueryChange = (value) => {
    setSearchQuery(value);
    if (value.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
    }
  };

  const getMediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${MEDIA_BASE}/${path.replace(/^\//, '')}`;
  };

  const fetchConversations = async () => {
    try {
      const res = await apiRequest('messages.php');
      if (res.success) {
        const rawConversations = res.conversations || [];
        
        // --- THE FIX: DEDUPLICATE CONVERSATIONS ---
        // This prevents the same user from showing up twice in the list
        const uniqueConvs = [];
        const seenIds = new Set();

        for (const conv of rawConversations) {
          // Use the other user's ID as the unique key. If it's a group, use the conversation ID.
          const uniqueKey = conv.other_user?.id || conv.id;
          
          if (!seenIds.has(uniqueKey)) {
            seenIds.add(uniqueKey);
            uniqueConvs.push(conv);
          }
        }
        
        setConversations(uniqueConvs);
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

  useEffect(() => {
    const term = searchQuery.trim();
    if (term.length < 2) return undefined;
    let active = true;
    const timeout = setTimeout(async () => {
      setSearching(true);
      const result = await apiRequest(`message_search.php?q=${encodeURIComponent(term)}`);
      if (!active) return;
      setSearchResults(result.success ? (result.results || []) : []);
      setSearching(false);
      if (!result.success) {
        Alert.alert('Search failed', result.error || 'Could not search messages.');
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const getMessagePreview = (lastMessage) => {
    if (!lastMessage || lastMessage.trim() === '') return 'No messages yet';
    
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

  const renderItem = ({ item }) => {
    // Safely fallback to item.name if other_user is missing
    const otherUser = item.other_user || {};
    const name = item.name || otherUser.name || 'Conversation';
    const avatar = item.avatar || otherUser.avatar;
    const hasUnread = Number(item.unread_count || item.unread || 0) > 0;
    
    const isMediaPreview = item.last_message?.includes('uploads/') || item.last_message?.match(/\.(jpeg|jpg|m4a)$/i);

    return (
      <TouchableOpacity 
        style={[styles.chatRow, { borderBottomColor: theme.border }]}
                   onPress={() => navigation.navigate('Chat', { 
          id: item.id, 
          name,
          avatar,
          username: otherUser.username, // <-- Pass username here
          isGroup: Boolean(item.is_group),
        })}
      >
        <View style={styles.avatarContainer}>
          {avatar ? (
            <Image source={{ uri: getMediaUrl(avatar) }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>{name.charAt(0)}</Text>
            </View>
          )}
          {hasUnread && <View style={[styles.unreadDot, { borderColor: theme.background }]} />}
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={[styles.name, { color: theme.text, fontWeight: hasUnread ? '800' : '600' }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.time, { color: hasUnread ? theme.primary : theme.textMuted }]}>
              {timeAgo(item.updated_at || item.created_at)}
            </Text>
          </View>
          
          <Text 
            style={[
              styles.lastMessage, 
              { color: hasUnread ? theme.text : theme.textMuted, fontWeight: hasUnread ? '600' : '400' },
              isMediaPreview && { fontStyle: 'italic' }
            ]} 
            numberOfLines={1}
          >
            {getMessagePreview(item.last_message)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSearchResult = ({ item }) => (
    <TouchableOpacity
      style={[styles.searchResult, { borderBottomColor: theme.border }]}
      onPress={() => {
        setSearchQuery('');
        navigation.navigate('Chat', {
          id: item.conversation_id,
          name: item.conversation || 'Conversation',
          isGroup: Boolean(item.is_group),
        });
      }}
    >
      <View style={styles.searchResultText}>
        <Text style={{ color: theme.text, fontWeight: '700' }}>{item.conversation}</Text>
        <Text style={{ color: theme.textMuted }} numberOfLines={2}>{item.snippet}</Text>
      </View>
      <Text style={{ color: theme.textMuted, fontSize: 12 }}>{timeAgo(item.created_at)}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.header }]}>
        <Text style={[styles.headerTitle, { color: theme.headerText }]}>Messages</Text>
        <TouchableOpacity
          accessibilityLabel="Create group"
          onPress={() => navigation.navigate('CreateGroup')}
          style={styles.headerAction}
        >
          <Plus color={theme.headerText} size={24} />
        </TouchableOpacity>
      </View>

      <TextInput
        value={searchQuery}
        onChangeText={handleSearchQueryChange}
        placeholder="Search messages"
        placeholderTextColor={theme.textMuted}
        style={[styles.searchInput, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
      />
      {searching && <ActivityIndicator color={theme.primary} style={{ marginVertical: 8 }} />}
      <FlatList
        data={searchQuery.trim().length >= 2 ? searchResults : conversations}
        keyExtractor={(item) => String(item.id ?? item.message_id)}
        renderItem={searchQuery.trim().length >= 2 ? renderSearchResult : renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MessageSquare color={theme.border} size={64} style={{ marginBottom: 16 }} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {searchQuery.trim().length >= 2 ? 'No matching messages' : 'No messages yet'}
            </Text>
            <Text style={[styles.emptySub, { color: theme.textMuted }]}>
              {searchQuery.trim().length >= 2 ? 'Try another search term.' : 'When you match with someone or start a conversation, it will appear here.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  headerAction: { padding: 4 },
  searchInput: { marginHorizontal: 14, marginTop: 12, marginBottom: 4, borderWidth: 1, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10 },
  searchResult: { padding: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  searchResultText: { flex: 1, marginRight: 10, gap: 4 },
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