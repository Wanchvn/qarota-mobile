import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest, MEDIA_BASE } from '../lib/api';
import { useTheme } from '../lib/theme';

export default function GroupDetailsScreen({ route, navigation }) {
  const { id } = route.params;
  const theme = useTheme();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);

  const handleQueryChange = (value) => {
    setQuery(value);
    if (value.trim().length < 2) setUsers([]);
  };

  const loadGroup = useCallback(async () => {
    const result = await apiRequest('group_conversation.php', {
      method: 'POST',
      json: { action: 'details', conversation_id: id },
    });
    if (result.success) {
      setGroup(result.conversation);
      setName(result.conversation.name);
      setMembers(result.members || []);
      navigation.setOptions({ title: result.conversation.name });
    } else {
      Alert.alert('Group unavailable', result.error || 'Could not load group details.');
    }
    setLoading(false);
  }, [id, navigation]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadGroup);
    return unsubscribe;
  }, [navigation, loadGroup]);

  useEffect(() => {
    const term = query.trim();
    if (!group?.is_admin || term.length < 2) return undefined;
    let active = true;
    const timeout = setTimeout(async () => {
      const result = await apiRequest(`search.php?q=${encodeURIComponent(term)}`);
      if (!active) return;
      const memberIds = new Set(members.map((member) => member.id));
      setUsers(result.success ? (result.users || []).filter((user) => !memberIds.has(user.id)) : []);
      if (!result.success) Alert.alert('Search failed', result.error || 'Could not search for users.');
    }, 250);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [group?.is_admin, members, query]);

  const updateGroup = async (action, extra = {}, refresh = true) => {
    if (changing) return false;
    setChanging(true);
    const result = await apiRequest('group_conversation.php', {
      method: 'POST',
      json: { action, conversation_id: id, ...extra },
    });
    setChanging(false);
    if (!result.success) {
      Alert.alert('Could not update group', result.error || 'Please try again.');
      return false;
    }
    if (refresh) await loadGroup();
    return true;
  };

  const saveName = async () => {
    const cleanedName = name.trim();
    if (!cleanedName || cleanedName.length > 100) {
      Alert.alert('Invalid name', 'Enter a group name between 1 and 100 characters.');
      return;
    }
    await updateGroup('rename', { name: cleanedName });
  };

  const addMember = async (member) => {
    const added = await updateGroup('add_member', { user_id: member.id });
    if (added) {
      setQuery('');
      setUsers([]);
    }
  };

  const confirmLeave = () => {
    Alert.alert('Leave group?', 'You will no longer be able to read or send messages in this group.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          if (await updateGroup('leave', {}, false)) navigation.goBack();
        },
      },
    ]);
  };

  const renderMember = ({ item }) => {
    const avatar = item.avatar?.startsWith('http')
      ? item.avatar
      : item.avatar ? `${MEDIA_BASE}/${item.avatar.replace(/^\//, '')}` : null;
    return (
      <View style={[styles.memberRow, { borderBottomColor: theme.border }]}>
        {avatar
          ? <Image source={{ uri: avatar }} style={styles.avatar} />
          : <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarLetter}>{item.name?.[0] || '?'}</Text>
          </View>}
        <View style={styles.memberInfo}>
          <Text style={{ color: theme.text, fontWeight: '600' }}>{item.name}{item.is_me ? ' (you)' : ''}</Text>
          <Text style={{ color: theme.textMuted }}>@{item.username} · {item.role}</Text>
        </View>
        {group?.is_admin && !item.is_me && (
          <View style={styles.memberActions}>
            <TouchableOpacity
              disabled={changing}
              onPress={() => updateGroup('set_role', {
                user_id: item.id,
                role: item.role === 'admin' ? 'member' : 'admin',
              })}
            >
              <Text style={{ color: theme.primary, fontWeight: '600' }}>
                {item.role === 'admin' ? 'Demote' : 'Make admin'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={changing}
              onPress={() => Alert.alert('Remove member?', `Remove ${item.name} from this group?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => updateGroup('remove_member', { user_id: item.id }) },
              ])}
            >
              <Text style={{ color: '#E53935', fontWeight: '600' }}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView keyboardShouldPersistTaps="handled">
        {group?.is_admin && (
          <View style={styles.renameRow}>
            <TextInput
              value={name}
              onChangeText={setName}
              maxLength={100}
              placeholder="Group name"
              placeholderTextColor={theme.textMuted}
              style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
            />
            <TouchableOpacity
              onPress={saveName}
              disabled={changing}
              style={[styles.button, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>
        )}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Members ({group?.member_count || members.length})
        </Text>
        <FlatList
          data={members}
          keyExtractor={(member) => String(member.id)}
          renderItem={renderMember}
          scrollEnabled={false}
        />
        {group?.is_admin && (
          <View style={styles.addSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Add members</Text>
            <TextInput
              value={query}
              onChangeText={handleQueryChange}
              placeholder="Search people"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
            />
            {users.map((member) => (
              <TouchableOpacity key={member.id} style={[styles.searchUser, { borderBottomColor: theme.border }]} onPress={() => addMember(member)}>
                <Text style={{ color: theme.text }}>{member.name} (@{member.username})</Text>
                <Text style={{ color: theme.primary, fontWeight: '700' }}>Add</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <TouchableOpacity style={[styles.leaveButton, { borderColor: '#E53935' }]} onPress={confirmLeave} disabled={changing}>
          <Text style={{ color: '#E53935', fontWeight: '700' }}>Leave group</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  renameRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 8 },
  input: { flex: 1, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  button: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 9 },
  buttonText: { color: '#fff', fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', paddingHorizontal: 16, paddingVertical: 12 },
  memberRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#fff', fontWeight: '700' },
  memberInfo: { flex: 1, marginLeft: 12 },
  memberActions: { alignItems: 'flex-end', gap: 8 },
  addSection: { paddingTop: 8 },
  searchUser: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between' },
  leaveButton: { borderWidth: 1, borderRadius: 9, padding: 14, alignItems: 'center', margin: 16 },
});
