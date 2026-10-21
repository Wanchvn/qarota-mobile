import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, 
  ActivityIndicator, KeyboardAvoidingView, Platform, Image, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Send } from 'lucide-react-native';
import { apiRequest, MEDIA_BASE } from '../lib/api';
import { useTheme } from '../lib/theme';
import PostCard from '../components/PostCard';
import { timeAgo } from '../lib/timeAgo';

export default function PostDetailScreen({ route, navigation }) {
  const { postId } = route.params;
  const theme = useTheme();
  const flatListRef = useRef();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getMediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${MEDIA_BASE}/${path.replace(/^\//, '')}`;
  };

  const fetchPostDetails = async () => {
    try {
      const res = await apiRequest(`get_post.php?id=${postId}`);
      if (res.success) {
        setPost(res.post);
        setComments(res.comments || []);
      } else {
        Alert.alert('Error', res.error || 'Post not found', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostDetails();
  }, [postId]);

  const handleLike = async () => {
    if (!post) return;
    
    setPost(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        liked_by_me: !prev.stats.liked_by_me,
        likes: prev.stats.liked_by_me ? prev.stats.likes - 1 : prev.stats.likes + 1
      }
    }));

    await apiRequest('like.php', { method: 'POST', json: { post_id: post.id } });
  };

  const handleSendComment = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    
    const commentContent = text.trim();
    setText(''); 

    try {
      const res = await apiRequest('comment_create.php', {
        method: 'POST',
        json: { post_id: postId, content: commentContent }
      });

      if (res.success) {
        setComments(prev => [res.comment, ...prev]);
        
        setPost(prev => ({
          ...prev,
          stats: { ...prev.stats, comments: prev.stats.comments + 1 }
        }));

        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      } else {
        setText(commentContent);
        Alert.alert('Error', res.error || 'Could not post comment');
      }
    } catch (e) {
      setText(commentContent);
      Alert.alert('Error', 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = (commentId) => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
            try {
              const res = await apiRequest('comment_delete.php', {
                method: 'POST',
                json: { comment_id: commentId }
              });
              if (res.success) {
                setComments(prev => prev.filter(c => c.id !== commentId));
                setPost(prev => ({
                  ...prev,
                  stats: { ...prev.stats, comments: Math.max(0, prev.stats.comments - 1) }
                }));
              } else {
                Alert.alert('Error', res.error);
              }
            } catch (e) {
              Alert.alert('Error', 'Network error');
            }
        }}
      ]
    );
  };

  const handleReportComment = (commentId) => {
    Alert.alert(
      "Report Comment",
      "Why are you reporting this comment?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Spam", onPress: () => submitReport(commentId, 'spam') },
        { text: "Harassment", onPress: () => submitReport(commentId, 'harassment') },
        { text: "Other", onPress: () => submitReport(commentId, 'other') }
      ]
    );
  };

  const submitReport = async (commentId, reason) => {
    try {
      const res = await apiRequest('report.php', {
        method: 'POST',
        json: { comment_id: commentId, reason: reason, details: 'Reported from app' }
      });
      if (res.success) {
        Alert.alert('Reported', 'Thank you. Our moderators will review this comment.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error.');
    }
  };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <ChevronLeft color={theme.text} size={28} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Post</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={comments}
          keyExtractor={(item) => item.id.toString()}
          keyboardShouldPersistTaps="handled" // <-- FIXED
          renderItem={({ item }) => (
            // MOVED RENDER COMMENT INLINE BUT KEPT KEYBOARD PERSIST
            <TouchableOpacity 
              activeOpacity={0.7}
              onLongPress={() => {
                if (item.author.is_me) handleDeleteComment(item.id);
                else handleReportComment(item.id);
              }}
              style={[styles.commentRow, { borderBottomColor: theme.border }]}
            >
              {item.author.avatar ? (
                <Image source={{ uri: getMediaUrl(item.author.avatar) }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                  <Text style={styles.avatarText}>{item.author.name.charAt(0)}</Text>
                </View>
              )}
              
              <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                  <Text style={[styles.authorName, { color: theme.text }]}>{item.author.name}</Text>
                  <Text style={[styles.time, { color: theme.textMuted }]}>{timeAgo(item.created_at)}</Text>
                </View>
                <Text style={[styles.commentText, { color: theme.text }]}>{item.content}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListHeaderComponent={
            <>
              {post && (
                <View style={{ paddingTop: 16, paddingHorizontal: 16 }}>
                  <PostCard 
                    post={post} 
                    navigation={navigation} 
                    isVisible={true} 
                    onLike={handleLike} 
                    onComment={() => {}} 
                    onProfilePress={() => navigation.push('Profile', { username: post.author.username })}
                    onTopicPress={(topic) => navigation.push('TopicDetail', { topicName: topic })}
                    onEdit={() => navigation.navigate('EditPost', { post: post, onPostUpdated: fetchPostDetails })}
                    isMine={post.is_mine}
                  />
                  <View style={[styles.commentHeaderDivider, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Comments ({post.stats.comments})</Text>
                  </View>
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ color: theme.textMuted }}>No comments yet. Be the first to reply!</Text>
            </View>
          }
        />

        <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
            placeholder="Write a comment..."
            placeholderTextColor={theme.textMuted}
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, { backgroundColor: text.trim() ? theme.primary : theme.border }]} 
            onPress={handleSendComment}
            disabled={!text.trim() || submitting}
          >
            {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Send color="#fff" size={18} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '700' },
  commentHeaderDivider: { borderBottomWidth: 1, paddingVertical: 12, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  commentRow: { flexDirection: 'row', padding: 16, borderBottomWidth: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  commentContent: { flex: 1 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  authorName: { fontSize: 14, fontWeight: '700' },
  time: { fontSize: 12 },
  commentText: { fontSize: 15, lineHeight: 20 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1 },
  input: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, maxHeight: 100, fontSize: 15 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginLeft: 8, marginBottom: 2 },
});