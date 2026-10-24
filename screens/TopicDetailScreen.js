import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, 
  TouchableOpacity, RefreshControl, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Hash, Plus, Check } from 'lucide-react-native';
import { apiRequest } from '../lib/api';
import { useTheme } from '../lib/theme';
import PostCard from '../components/PostCard';

export default function TopicDetailScreen({ route, navigation }) {
  const { topicName } = route.params;
  const theme = useTheme();
  
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isMember, setIsMember] = useState(false);

  const fetchTopicPosts = useCallback(async () => {
    try {
      const res = await apiRequest(`get_topic_posts.php?name=${encodeURIComponent(topicName)}`);
      if (res.success) {
        setPosts(res.posts || []);
        setIsMember(res.is_member || false); // <-- Get member status
      } else {
        setPosts([]);
        setIsMember(false);
        Alert.alert('Could not load topic', res.error || 'Please try again.');
      }
    } catch (e) {
      console.error(e);
      setPosts([]);
      setIsMember(false);
      Alert.alert('Could not load topic', 'Check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [topicName]);

  useEffect(() => {
    return navigation.addListener('focus', fetchTopicPosts);
  }, [fetchTopicPosts, navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTopicPosts();
  };

  const handleToggleJoin = async () => {
    try {
      const res = await apiRequest('topic_toggle.php', {
        method: 'POST',
        json: { topic_name: topicName }
      });
      if (res.success) setIsMember(res.state === 'joined');
      else Alert.alert('Error', res.error || 'Could not update topic membership.');
    } catch (e) {
      Alert.alert('Error', 'Network error. Could not update topic membership.');
    }
  };

  const handleLike = async (postId) => {
    const result = await apiRequest('like.php', { method: 'POST', json: { post_id: postId } });
    if (!result.success) {
      Alert.alert('Could not update like', result.error || 'Please try again.');
      return;
    }
    setPosts((current) => current.map((post) => (
      post.id === postId
        ? { ...post, stats: { ...post.stats, liked_by_me: result.liked, likes: result.like_count } }
        : post
    )));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <ChevronLeft color={theme.text} size={28} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Hash color={theme.primary} size={24} />
          <Text style={[styles.title, { color: theme.text }]}>{topicName}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* JOIN / LEAVE BUTTON */}
      <View style={[styles.actionBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity 
          style={[
            styles.joinBtn, 
            isMember 
              ? { backgroundColor: theme.background, borderColor: theme.border, borderWidth: 1 } 
              : { backgroundColor: theme.primary }
          ]}
          onPress={handleToggleJoin}
        >
          {isMember ? (
            <>
              <Check color={theme.textMuted} size={18} />
              <Text style={{ color: theme.textMuted, fontWeight: '600', marginLeft: 6 }}>Joined</Text>
            </>
          ) : (
            <>
              <Plus color="#fff" size={18} />
              <Text style={{ color: '#fff', fontWeight: '600', marginLeft: 6 }}>Join Topic</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          renderItem={({ item }) => (
            <PostCard 
              post={item} 
              navigation={navigation}
              onLike={() => handleLike(item.id)} 
              onProfilePress={() => navigation.push('Profile', { username: item.author.username })}
              onTopicPress={(t) => navigation.push('TopicDetail', { topicName: t })}
              isMine={item.is_mine}
            />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: theme.textMuted, textAlign: 'center' }}>No posts found for #{topicName}.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '700' },
  
  actionBar: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, alignItems: 'flex-start' },
  joinBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
});