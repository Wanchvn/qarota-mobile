import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Bookmark, ChevronLeft, FolderPlus, Trash2 } from 'lucide-react-native';
import { apiRequest } from '../lib/api';
import { useTheme } from '../lib/theme';
import PostCard from '../components/PostCard';

export default function SavedPostsScreen({ navigation }) {
  const theme = useTheme();
  const [posts, setPosts] = useState([]);
  const [folders, setFolders] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [defaultCount, setDefaultCount] = useState(0);
  const [folder, setFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [moveModalPostId, setMoveModalPostId] = useState(null);
  const [folderName, setFolderName] = useState('');

  const fetchSaved = useCallback(async () => {
    try {
      const query = folder === null ? '' : `?folder=${encodeURIComponent(folder)}`;
      const res = await apiRequest(`saved.php${query}`);
      if (!res.success) {
        Alert.alert('Error', res.error || 'Could not load saved posts.');
        return;
      }
      setPosts(res.posts || []);
      setFolders(res.folders || []);
      setTotalCount(res.total_count || 0);
      setDefaultCount(res.default_count || 0);
    } catch {
      Alert.alert('Error', 'Could not load saved posts. Check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [folder]);

  useFocusEffect(useCallback(() => {
    fetchSaved();
  }, [fetchSaved]));

  const createFolder = async () => {
    const result = await apiRequest('bookmark_folders.php', {
      method: 'POST',
      json: { action: 'create', name: folderName.trim() },
    });
    if (!result.success) {
      Alert.alert('Could not create folder', result.error || 'Please try again.');
      return;
    }
    setFolderName('');
    setFolderModalVisible(false);
    await fetchSaved();
  };

  const deleteFolder = () => {
    if (folder === null || folder === 0) return;
    const selected = folders.find((item) => item.id === folder);
    if (!selected) return;
    Alert.alert('Delete folder?', `Saved posts will remain in Saved, but will be removed from "${selected.name}".`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const result = await apiRequest('bookmark_folders.php', {
            method: 'POST',
            json: { action: 'delete', folder_id: selected.id },
          });
          if (!result.success) {
            Alert.alert('Error', result.error || 'Could not delete the folder.');
            return;
          }
          setFolder(null);
          setLoading(true);
        },
      },
    ]);
  };

  const movePost = async (postId, folderId) => {
    const result = await apiRequest('move_bookmark.php', {
      method: 'POST',
      json: { post_id: postId, folder_id: folderId },
    });
    if (!result.success) {
      Alert.alert('Error', result.error || 'Could not move the saved post.');
      return;
    }
    setMoveModalPostId(null);
    await fetchSaved();
  };

  const currentPost = posts.find((post) => post.id === moveModalPostId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <ChevronLeft color={theme.text} size={28} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Saved Posts</Text>
        <View style={styles.headerActions}>
          {folder !== null && folder !== 0 ? (
            <TouchableOpacity onPress={deleteFolder} accessibilityLabel="Delete selected folder">
              <Trash2 color={theme.text} size={21} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={() => setFolderModalVisible(true)} accessibilityLabel="Create folder">
            <FolderPlus color={theme.primary} size={23} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[
          { id: 'all', label: `All (${totalCount})`, value: null },
          { id: 'saved', label: `Saved (${defaultCount})`, value: 0 },
          ...folders.map((item) => ({ id: item.id, label: `${item.name} (${item.count})`, value: item.id })),
        ]}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.folderList}
        renderItem={({ item }) => {
          const selected = item.value === folder;
          return (
            <TouchableOpacity
              onPress={() => { setLoading(true); setFolder(item.value); }}
              style={[styles.folderChip, { borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primary : theme.surface }]}
            >
              <Text style={{ color: selected ? '#fff' : theme.text, fontWeight: '600' }}>{item.label}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16, flexGrow: posts.length ? 0 : 1 }}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchSaved(); }}
          renderItem={({ item }) => (
            <View>
              <PostCard
                post={item}
                onLike={() => {}}
                onComment={() => navigation.navigate('PostDetail', { postId: item.id })}
                onProfilePress={() => navigation.push('Profile', { username: item.author.username })}
                onBookmarkChange={fetchSaved}
                isMine={item.is_mine}
              />
              <TouchableOpacity style={styles.moveButton} onPress={() => setMoveModalPostId(item.id)}>
                <Text style={{ color: theme.primary, fontWeight: '600' }}>
                  {item.folder_name ? `Move from ${item.folder_name}` : 'Organize into folder'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Bookmark color={theme.border} size={64} style={{ marginBottom: 16 }} />
              <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700', marginBottom: 8 }}>No saved posts</Text>
              <Text style={{ color: theme.textMuted, textAlign: 'center' }}>Posts you bookmark will appear here.</Text>
            </View>
          }
        />
      )}

      <Modal visible={folderModalVisible} transparent animationType="fade" onRequestClose={() => setFolderModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.dialog, { backgroundColor: theme.surface }]}>
            <Text style={[styles.dialogTitle, { color: theme.text }]}>Create folder</Text>
            <TextInput
              value={folderName}
              onChangeText={setFolderName}
              maxLength={50}
              placeholder="Folder name"
              placeholderTextColor={theme.textMuted}
              style={[styles.folderInput, { color: theme.text, borderColor: theme.border }]}
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity onPress={() => setFolderModalVisible(false)}><Text style={{ color: theme.textMuted }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={createFolder}><Text style={{ color: theme.primary, fontWeight: '700' }}>Create</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={moveModalPostId !== null} transparent animationType="fade" onRequestClose={() => setMoveModalPostId(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.dialog, { backgroundColor: theme.surface, maxHeight: '80%' }]}>
            <Text style={[styles.dialogTitle, { color: theme.text }]}>Move saved post</Text>
            <FlatList
              data={[{ id: 0, name: 'Saved (unsorted)' }, ...folders]}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.folderOption, { borderBottomColor: theme.border }]}
                  onPress={() => currentPost && movePost(currentPost.id, item.id)}
                >
                  <Text style={{ color: theme.text }}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.cancelMove} onPress={() => setMoveModalPostId(null)}>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '700' },
  headerActions: { width: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  folderList: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  folderChip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 18 },
  moveButton: { alignSelf: 'flex-end', paddingHorizontal: 12, paddingBottom: 16 },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.55)' },
  dialog: { borderRadius: 14, padding: 18 },
  dialogTitle: { fontSize: 18, fontWeight: '700', marginBottom: 14 },
  folderInput: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16 },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24 },
  folderOption: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  cancelMove: { alignItems: 'flex-end', paddingTop: 14 },
});
