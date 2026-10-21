import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { apiRequest, MEDIA_BASE } from '../lib/api';
import { useTheme } from '../lib/theme';

export default function DiscoverScreen({ navigation }) {
  const theme = useTheme();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const getMediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${MEDIA_BASE}/${path.replace(/^\//, '')}`;
  };

  useEffect(() => {
    const fetchSuggestions = async () => {
      const res = await apiRequest('discover.php');
      if (res.success) setSuggestions(res.suggestions);
      setLoading(false);
    };
    fetchSuggestions();
  }, []);

  const getReasonText = (reason) => {
    switch (reason) {
      case 'friends_of_friends': return 'Followed by people you know';
      case 'same_location': return 'Lives in your area';
      case 'shared_language': return 'Speaks your language';
      default: return 'Suggested for you';
    }
  };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator color={theme.primary} /></View>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <ChevronLeft color={theme.text} size={28} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Discover</Text>
        <View style={{ width: 36 }} />
      </View>
      
      <FlatList
        data={suggestions}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <TouchableOpacity 
              style={styles.userRow}
              onPress={() => navigation.push('Profile', { username: item.username })}
            >
              {item.avatar ? (
                <Image source={{ uri: getMediaUrl(item.avatar) }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                  <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                </View>
              )}
              <View style={styles.info}>
                <Text style={[styles.name, { color: theme.text }]}>
                  {item.name}
                  {item.is_verified && <Text style={{ color: '#4CAF50' }}> ✓</Text>}
                </Text>
                <Text style={[styles.reason, { color: theme.textMuted }]}>{getReasonText(item.reason)}</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={[styles.empty, { color: theme.textMuted }]}>No suggestions right now.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  list: { padding: 16 },
  card: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
  userRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 16 },
  avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700' },
  reason: { fontSize: 13, marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 40 },
});