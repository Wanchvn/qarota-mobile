import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { apiRequest, MEDIA_BASE } from '../lib/api';
import { timeAgo } from '../lib/timeAgo';

export default function CommentModal({ visible, postId, onClose, onCommentAdded }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const getMediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${MEDIA_BASE}/${path.replace(/^\//, '')}`;
  };

  useEffect(() => {
    if (visible && postId) {
      fetchComments();
    }
  }, [visible, postId]);

  const fetchComments = async () => {
    setLoading(true);
    const res = await apiRequest(`comments.php?post_id=${postId}`);
    if (res.success) {
      setComments(res.comments);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);

    const res = await apiRequest('comment_create.php', {
      method: 'POST',
      json: { post_id: postId, content: text.trim() }
    });

    if (res.success && res.comment) {
      setComments([...comments, res.comment]);
      setText('');
      onCommentAdded();
    }
    setSubmitting(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView 
        style={styles.overlay} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Comments</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeBtn}>Close</Text></TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator style={{ flex: 1 }} color="#C65D3B" />
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.list}
              ListEmptyComponent={<Text style={styles.empty}>No comments yet. Be the first!</Text>}
              renderItem={({ item }) => (
                <View style={styles.comment}>
                  {item.author.avatar ? (
                    <Image source={{ uri: getMediaUrl(item.author.avatar) }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}><Text style={styles.avatarText}>{item.author.name.charAt(0)}</Text></View>
                  )}
                  <View style={styles.commentBody}>
                    <Text style={styles.commentName}>{item.author.name}</Text>
                    <Text style={styles.commentText}>{item.content}</Text>
                    <Text style={styles.commentTime}>{timeAgo(item.created_at)}</Text>
                  </View>
                </View>
              )}
            />
          )}

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Add a comment..."
              value={text}
              onChangeText={setText}
              multiline
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSubmit} disabled={submitting || !text.trim()}>
              {submitting ? (
                <ActivityIndicator color="#C65D3B" size="small" />
              ) : (
                <Text style={styles.sendBtnText}>Post</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#F5EFE6', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '75%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E6E6E6', backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  title: { fontSize: 18, fontWeight: '700', color: '#3E2723' },
  closeBtn: { color: '#C65D3B', fontSize: 16 },
  list: { padding: 16 },
  empty: { textAlign: 'center', color: '#666', marginTop: 20 },
  comment: { flexDirection: 'row', marginBottom: 16 },
  avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 12, backgroundColor: '#E6E6E6' },
  avatarPlaceholder: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#C65D3B', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontWeight: 'bold' },
  commentBody: { flex: 1 },
  commentName: { fontWeight: '700', color: '#3E2723', marginBottom: 2 },
  commentText: { fontSize: 14, color: '#3E2723', lineHeight: 20 },
  commentTime: { fontSize: 11, color: '#999', marginTop: 4 },
  inputRow: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E6E6E6', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#F5EFE6', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100, color: '#3E2723' },
  sendBtn: { marginLeft: 12, padding: 8, minWidth: 50, alignItems: 'center' },
  sendBtnText: { color: '#C65D3B', fontWeight: '700', fontSize: 16 },
});