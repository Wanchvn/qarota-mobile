import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, SectionList, 
  TouchableOpacity, ActivityIndicator, Keyboard, ScrollView 
} from 'react-native';
import { Image } from 'expo-image'; 
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Search as SearchIcon, X, Clock, BadgeCheck } from 'lucide-react-native'; 
import { apiRequest, MEDIA_BASE } from '../lib/api';
import { useTheme } from '../lib/theme';
import PostCard from '../components/PostCard';
import CommentModal from '../components/CommentModal';

const RECENT_KEY = '@qarota_recent_searches';

export default function SearchScreen({ navigation }) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ users: [], posts: [] });
  const [loading, setLoading] = useState(false);
  const [activePostId, setActivePostId] = useState(null);
  
  const [recentSearches, setRecentSearches] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);

  const getMediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${MEDIA_BASE}/${path.replace(/^\//, '')}`;
  };

  // Safe helper to get the first letter
  const getInitial = (name, username) => {
    const display = name || username || 'U';
    return display.charAt(0).toUpperCase();
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const saved = await AsyncStorage.getItem(RECENT_KEY);
        if (saved) setRecentSearches(JSON.parse(saved));
        
        const res = await apiRequest('get_suggested_users.php');
        if (res.success) setSuggestedUsers(res.suggested || []);
      } catch (e) {
        console.log(e);
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults({ users: [], posts: [] });
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      const res = await apiRequest(`search.php?q=${encodeURIComponent(query)}`);
      if (res.success) {
        setResults({ users: res.users || [], posts: res.posts || [] });
      }
      setLoading(false);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const saveSearchQuery = async (text) => {
    if (!text.trim() || text.length < 2) return;
    try {
      const newRecent = [text.trim(), ...recentSearches.filter(t => t.toLowerCase() !== text.trim().toLowerCase())].slice(0, 5);
      setRecentSearches(newRecent);
      await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(newRecent));
    } catch (e) {}
  };

  const clearRecentSearches = async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem(RECENT_KEY);
  };

  const handleLike = async (postId) => {
    const updatedPosts = results.posts.map(p => p.id === postId ? { ...p, stats: { ...p.stats, liked_by_me: !p.stats.liked_by_me, likes: p.stats.liked_by_me ? p.stats.likes - 1 : p.stats.likes + 1 } } : p);
    setResults({ ...results, posts: updatedPosts });
    await apiRequest('like.php', { method: 'POST', json: { post_id: postId } });
  };

  const sections = [];
  if (results.users.length > 0) sections.push({ title: 'People', data: results.users, type: 'user' });
  if (results.posts.length > 0) sections.push({ title: 'Posts', data: results.posts, type: 'post' });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <SearchIcon color={theme.textMuted} size={20} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search Qarota"
            placeholderTextColor={theme.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => saveSearchQuery(query)}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <X color={theme.textMuted} size={18} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && <ActivityIndicator style={{ marginTop: 20 }} color={theme.primary} />}

      {query.length >= 2 ? (
        <>
          {!loading && sections.length === 0 && (
            <Text style={[styles.empty, { color: theme.textMuted }]}>No results found for "{query}"</Text>
          )}
          
          <SectionList
            sections={sections}
            keyExtractor={(item, index) => String(item.id || index)}
            stickySectionHeadersEnabled={false}
            keyboardShouldPersistTaps="handled"
            renderSectionHeader={({ section: { title } }) => (
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
            )}
            renderItem={({ item, section }) => {
              if (section.type === 'user') {
                return (
                  <TouchableOpacity 
                    style={[styles.userRow, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      saveSearchQuery(item.username);
                      Keyboard.dismiss();
                      navigation.push('Profile', { username: item.username });
                    }}
                  >
                    {item.avatar ? (
                      <Image source={{ uri: getMediaUrl(item.avatar) }} style={styles.avatar} contentFit="cover" />
                    ) : (
                      <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                        {/* FIXED: Safe charAt */}
                        <Text style={styles.avatarText}>{getInitial(item.name, item.username)}</Text>
                      </View>
                    )}
                    <View style={styles.info}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.name, { color: theme.text }]}>{item.name || item.username}</Text>
                        {item.is_verified && <BadgeCheck color="#E5A93D" size={16} style={{ marginLeft: 4 }} />}
                      </View>
                      <Text style={[styles.username, { color: theme.textMuted }]}>@{item.username}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }
              
              return (
                <View style={{ paddingHorizontal: 16 }}>
                  <PostCard 
                    post={item} 
                    navigation={navigation}
                    onLike={() => handleLike(item.id)} 
                    onComment={() => setActivePostId(item.id)} 
                    onProfilePress={() => navigation.push('Profile', { username: item.author.username })}
                    onDelete={() => {}}
                    onTopicPress={(topic) => navigation.push('TopicDetail', { topicName: topic })}
                    onEdit={() => {}} 
                    isMine={item.is_mine}
                  />
                </View>
              );
            }}
          />
        </>
      ) : (
        <ScrollView style={{ flex: 1, paddingTop: 16 }} keyboardShouldPersistTaps="handled">
          {recentSearches.length > 0 && (
            <View style={{ marginBottom: 24, paddingHorizontal: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={[styles.sectionTitle, { color: theme.text, marginHorizontal: 0, marginTop: 0 }]}>Recent</Text>
                <TouchableOpacity onPress={clearRecentSearches}>
                  <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '600' }}>Clear</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {recentSearches.map((term, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={[styles.recentPill, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    onPress={() => setQuery(term)}
                  >
                    <Clock color={theme.textMuted} size={14} style={{ marginRight: 6 }} />
                    <Text style={{ color: theme.text, fontSize: 14 }}>{term}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {suggestedUsers.length > 0 && (
            <View style={{ paddingHorizontal: 16 }}>
              <Text style={[styles.sectionTitle, { color: theme.text, marginHorizontal: 0 }]}>Suggested for you</Text>
              {suggestedUsers.map((user) => (
                <TouchableOpacity 
                  key={user.id} 
                  style={[styles.userRow, { borderBottomColor: theme.border }]}
                  onPress={() => {
                    saveSearchQuery(user.username);
                    Keyboard.dismiss();
                    navigation.push('Profile', { username: user.username });
                  }}
                >
                  {user.avatar ? (
                    <Image source={{ uri: getMediaUrl(user.avatar) }} style={styles.avatar} contentFit="cover" />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                      {/* FIXED: Safe charAt */}
                      <Text style={styles.avatarText}>{getInitial(user.name, user.username)}</Text>
                    </View>
                  )}
                  <View style={styles.info}>
                    <Text style={[styles.name, { color: theme.text }]}>{user.name || user.username}</Text>
                    <Text style={[styles.username, { color: theme.textMuted }]}>@{user.username}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <CommentModal visible={!!activePostId} postId={activePostId} onClose={() => setActivePostId(null)} onCommentAdded={() => {}} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1 },
  searchInputContainer: { flexDirection: 'row', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, alignItems: 'center', height: 44 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 16, marginLeft: 8 },
  
  sectionTitle: { fontSize: 18, fontWeight: '800', marginTop: 20, marginBottom: 10, paddingHorizontal: 16 },
  
  recentPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  
  userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700' },
  username: { fontSize: 14, marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 16 },
});