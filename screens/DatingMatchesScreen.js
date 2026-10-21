import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity, 
  ActivityIndicator, RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Heart, MessageCircle } from 'lucide-react-native';
import { apiRequest, MEDIA_BASE } from '../lib/api';
import { useTheme } from '../lib/theme';

export default function DatingMatchesScreen({ navigation }) {
  const theme = useTheme();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getMediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${MEDIA_BASE}/${path.replace(/^\//, '')}`;
  };

  const fetchMatches = async () => {
    try {
      const res = await apiRequest('get_dating_matches.php');
      if (res.success) {
        setMatches(res.matches || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMatches();
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={() => navigation.navigate('Chat', { id: item.conversation_id, name: item.name, avatar: item.avatar })}
    >
      <View style={styles.imageContainer}>
        {item.primary_photo || item.avatar ? (
          <Image source={{ uri: getMediaUrl(item.primary_photo || item.avatar) }} style={styles.image} />
        ) : (
          <View style={[styles.placeholderImage, { backgroundColor: theme.primary }]}>
            <Text style={styles.placeholderText}>{item.name.charAt(0)}</Text>
          </View>
        )}
        
        {/* Chat Icon Overlay */}
        <View style={[styles.chatIconContainer, { backgroundColor: theme.primary }]}>
          <MessageCircle color="#fff" size={16} />
        </View>
      </View>

      <View style={styles.infoContainer}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {item.name}, {item.age}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Tap to message
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <ChevronLeft color={theme.text} size={28} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Your Matches</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.match_id.toString()}
          contentContainerStyle={{ padding: 16 }}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.center}>
              <Heart color={theme.border} size={64} style={{ marginBottom: 16 }} />
              <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700' }}>No matches yet</Text>
              <Text style={{ color: theme.textMuted, textAlign: 'center', marginTop: 8 }}>
                Keep swiping on the Dating tab to find your first match!
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '700' },
  
  card: { width: '48%', borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  imageContainer: { width: '100%', aspectRatio: 1, position: 'relative' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholderImage: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: '#fff', fontSize: 40, fontWeight: 'bold' },
  
  chatIconContainer: { position: 'absolute', bottom: 8, right: 8, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  
  infoContainer: { padding: 12 },
  name: { fontSize: 15, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 2 },
});