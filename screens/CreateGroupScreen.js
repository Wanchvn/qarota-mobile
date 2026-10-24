import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest, MEDIA_BASE } from '../lib/api';
import { useTheme } from '../lib/theme';

export default function CreateGroupScreen({ navigation }) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleQueryChange = (value) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setUsers([]);
      setSearching(false);
    }
  };

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return undefined;

    let active = true;
    const timeout = setTimeout(async () => {
      setSearching(true);
      const result = await apiRequest(`search.php?q=${encodeURIComponent(term)}`);
      if (!active) return;
      setUsers(result.success ? (result.users || []) : []);
      setSearching(false);
      if (!result.success) {
        Alert.alert('Search failed', result.error || 'Could not search for users.');
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [query]);

  const toggleUser = (user) => {
    setSelected((current) => (
      current.some((member) => member.id === user.id)
        ? current.filter((member) => member.id !== user.id)
        : [...current, user]
    ));
  };

  const createGroup = async () => {
    if (!name.trim() || selected.length === 0 || saving) {
      Alert.alert('Group details required', 'Enter a group name and select at least one member.');
      return;
    }
    setSaving(true);
    const result = await apiRequest('group_conversation.php', {
      method: 'POST',
      json: {
        action: 'create',
        name: name.trim(),
        member_ids: selected.map((member) => member.id),
      },
    });
    setSaving(false);
    if (!result.success) {
      Alert.alert('Could not create group', result.error || 'Please try again.');
      return;
    }
    navigation.replace('Chat', {
      id: result.conversation_id,
      name: name.trim(),
      isGroup: true,
    });
  };

  const renderUser = ({ item }) => {
    const isSelected = selected.some((member) => member.id === item.id);
    const avatar = item.avatar?.startsWith('http')
      ? item.avatar
      : item.avatar ? `${MEDIA_BASE}/${item.avatar.replace(/^\//, '')}` : null;
    return (
      <TouchableOpacity
        onPress={() => toggleUser(item)}
        style={[styles.userRow, { borderBottomColor: theme.border }]}
      >
        {avatar
          ? <Image source={{ uri: avatar }} style={styles.avatar} />
          : <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarLetter}>{item.name?.[0] || '?'}</Text>
          </View>}
        <View style={styles.userText}>
          <Text style={{ color: theme.text, fontWeight: '600' }}>{item.name}</Text>
          <Text style={{ color: theme.textMuted }}>@{item.username}</Text>
        </View>
        <Text style={{ color: theme.primary, fontWeight: '700' }}>{isSelected ? 'Selected' : 'Add'}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Create group</Text>
        <TouchableOpacity
          disabled={saving}
          onPress={createGroup}
          style={[styles.createButton, { backgroundColor: theme.primary, opacity: saving ? 0.6 : 1 }]}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.createText}>Create</Text>}
        </TouchableOpacity>
      </View>
      <TextInput
        value={name}
        onChangeText={setName}
        maxLength={100}
        placeholder="Group name"
        placeholderTextColor={theme.textMuted}
        style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
      />
      <TextInput
        value={query}
        onChangeText={handleQueryChange}
        placeholder="Search people to add"
        placeholderTextColor={theme.textMuted}
        autoCapitalize="none"
        style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
      />
      {selected.length > 0 && (
        <Text style={[styles.selectedCount, { color: theme.textMuted }]}>
          {selected.length} member{selected.length === 1 ? '' : 's'} selected (you will be the group admin)
        </Text>
      )}
      {searching && <ActivityIndicator color={theme.primary} style={styles.searching} />}
      <FlatList
        data={users}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderUser}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          query.trim().length >= 2 && !searching
            ? <Text style={[styles.empty, { color: theme.textMuted }]}>No eligible users found.</Text>
            : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { minHeight: 60, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  title: { fontSize: 22, fontWeight: '800' },
  createButton: { borderRadius: 9, paddingHorizontal: 16, paddingVertical: 9 },
  createText: { color: '#fff', fontWeight: '700' },
  input: { marginHorizontal: 16, marginTop: 14, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  selectedCount: { marginHorizontal: 18, marginTop: 12 },
  searching: { margin: 14 },
  userRow: { minHeight: 68, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#fff', fontWeight: '700' },
  userText: { flex: 1, marginLeft: 12 },
  empty: { padding: 20, textAlign: 'center' },
});
