import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, 
  FlatList, Image, ActivityIndicator 
} from 'react-native';
import { Heart, X } from 'lucide-react-native';
import { apiRequest, MEDIA_BASE } from '../lib/api';
import { useTheme } from '../lib/theme';

export default function LikesModal({ visible, postId, onClose, navigation }) {
  const theme = useTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const getMediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${MEDIA_BASE}/${path.replace(/^\//, '')}`;
  };

  useEffect(() => {
    if (visible && postId) {
      fetchLikes();
    }
  }, [visible, postId]);

  const fetchLikes = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`get_likes.php?post_id=${postId}`);
      if (res.success) {
        setUsers(res.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const renderUser = ({ item }) => (
    <TouchableOpacity 
      style={[styles.userRow, { borderBottomColor: theme.border }]}
      onPress={() => { onClose(); navigation.push('Profile', { username: item.username }); }}
    >
      {item.avatar ? (
        <Image source={{ uri: getMediaUrl(item.avatar) }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
          <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
        </View>
      )}
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: theme.text }]}>{item.name}</Text>
        <Text style={[styles.userHandle, { color: theme.textMuted }]}>@{item.username}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.closeArea} onPress={onClose} />
        
        <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Heart color="#E53935" size={20} fill="#E53935" />
              <Text style={[styles.headerTitle, { color: theme.text }]}>Likes</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <X color={theme.textMuted} size={24} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.center}><ActivityIndicator color={theme.primary} size="large" /></View>
          ) : (
            <FlatList
              data={users}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderUser}
              contentContainerStyle={{ paddingBottom: 40 }}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Text style={{ color: theme.textMuted }}>No likes yet.</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  closeArea: { flex: 1 },
  sheet: { 
    height: '70%', 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20,
    overflow: 'hidden'
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    borderBottomWidth: 1 
  },
  headerTitle: { fontSize: 18, fontWeight: '700', marginLeft: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  
  userRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '600' },
  userHandle: { fontSize: 14, marginTop: 2 },
});