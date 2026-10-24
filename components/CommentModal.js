import React, { useState, useEffect, useCallback, useRef } from 'react'; // <-- Added useRef
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { X } from 'lucide-react-native';
import { apiRequest, MEDIA_BASE } from '../lib/api';
import { timeAgo } from '../lib/timeAgo';

export default function CommentModal({ visible, postId, onClose, onCommentAdded }) {
  const navigation = useNavigation();
  
  // NEW: Ref for the TextInput
  const inputRef = useRef(null); 

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState(null); 

  const getMediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${MEDIA_BASE}/${path.replace(/^\//, '')}`;
  };

  const fetchComments = useCallback(async () => {
    setLoading(true);
    const res = await apiRequest(`comments.php?post_id=${postId}`);
    if (res.success) {
      setComments(res.comments);
    }
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    if (visible && postId) {
      const timeout = setTimeout(fetchComments, 0);
      return () => clearTimeout(timeout);
    } else {
      setReplyTo(null);
      setText('');
    }
    return undefined;
  }, [visible, postId, fetchComments]);

  const handleSubmit = async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);

    const finalParentId = replyTo ? (replyTo.parent_id || replyTo.id) : null;

    const res = await apiRequest('comment_create.php', {
      method: 'POST',
      json: { 
        post_id: postId, 
        content: text.trim(),
        parent_id: finalParentId
      }
    });

    if (res.success && res.comment) {
      await fetchComments(); 
      setText('');
      setReplyTo(null); 
      onCommentAdded();
    }
    setSubmitting(false);
  };

  const goToProfile = (username) => {
    if (!username) return;
    onClose(); 
    navigation.push('Profile', { username }); 
  };

  const handleReplyPress = (item) => {
    setReplyTo(item);
    setText(`@${item.author.username} `); 
    
    // NEW: Automatically open the keyboard
    inputRef.current?.focus(); 
  };

  const renderTextWithMentions = (contentText, isReply) => {
    const parts = contentText.split(/(@[a-zA-Z0-9_]+)/g);
    
    return (
      <Text style={[styles.commentText, isReply && { fontSize: 13 }]}>
        {parts.map((part, index) => {
          if (part.startsWith('@')) {
            const username = part.substring(1); 
            return (
              <Text
                key={index}
                style={{ color: '#C65D3B', fontWeight: '600' }}
                onPress={() => goToProfile(username)}
              >
                {part}
              </Text>
            );
          }
          return <Text key={index}>{part}</Text>;
        })}
      </Text>
    );
  };

  const renderComment = (item, isReply = false) => (
    <View style={[styles.comment, isReply && styles.replyComment]}>
      <TouchableOpacity onPress={() => goToProfile(item.author.username)}>
        {item.author.avatar ? (
          <Image source={{ uri: getMediaUrl(item.author.avatar) }} style={[styles.avatar, isReply && styles.replyAvatar]} />
        ) : (
          <View style={[styles.avatarPlaceholder, isReply && styles.replyAvatar]}>
            <Text style={[styles.avatarText, isReply && { fontSize: 12 }]}>{item.author.name.charAt(0)}</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.commentBody}>
        <TouchableOpacity onPress={() => goToProfile(item.author.username)}>
          <Text style={[styles.commentName, isReply && { fontSize: 13 }]}>{item.author.name}</Text>
        </TouchableOpacity>
        
        {renderTextWithMentions(item.content, isReply)}
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <Text style={styles.commentTime}>{timeAgo(item.created_at)}</Text>
          
          <TouchableOpacity onPress={() => handleReplyPress(item)} style={{ marginLeft: 16 }}>
            <Text style={{ fontSize: 11, color: '#C65D3B', fontWeight: '700' }}>Reply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

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
                <View>
                  {renderComment(item, false)}
                  {item.replies && item.replies.map((reply) => (
                    <React.Fragment key={reply.id}>
                      {renderComment(reply, true)}
                    </React.Fragment>
                  ))}
                </View>
              )}
            />
          )}

          {replyTo && (
            <View style={styles.replyBanner}>
              <Text style={styles.replyBannerText}>Replying to @{replyTo.author.username}</Text>
              <TouchableOpacity onPress={() => { 
                setReplyTo(null); 
                setText(''); 
                inputRef.current?.blur(); // NEW: Close keyboard when canceling reply
              }}>
                <X color="#666" size={16} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef} // <-- NEW: Attach the ref here
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
  
  replyComment: {
    marginLeft: 40,
    marginTop: 4,
    marginBottom: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#E6E6E6',
    paddingLeft: 12,
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },

  avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 12, backgroundColor: '#E6E6E6' },
  avatarPlaceholder: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#C65D3B', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontWeight: 'bold' },
  commentBody: { flex: 1 },
  commentName: { fontWeight: '700', color: '#3E2723', marginBottom: 2 },
  commentText: { fontSize: 14, color: '#3E2723', lineHeight: 20 },
  commentTime: { fontSize: 11, color: '#999' },
  inputRow: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E6E6E6', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#F5EFE6', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100, color: '#3E2723' },
  sendBtn: { marginLeft: 12, padding: 8, minWidth: 50, alignItems: 'center' },
  sendBtnText: { color: '#C65D3B', fontWeight: '700', fontSize: 16 },
  replyBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#E6E6E6', paddingHorizontal: 16, paddingVertical: 8 },
  replyBannerText: { fontSize: 12, color: '#3E2723', fontWeight: '600' }
});