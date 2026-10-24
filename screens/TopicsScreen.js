import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest } from '../lib/api';
import { Plus } from 'lucide-react-native';

export default function TopicsScreen({ navigation }) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTopics = async () => {
    try {
      const res = await apiRequest('topics.php');
      if (res.success) setTopics(res.topics);
      else Alert.alert('Error', res.error || 'Could not load topics.');
    } catch (error) {
      Alert.alert('Error', 'Could not load topics. Check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleMembership = async (topic) => {
    const result = await apiRequest('topic_toggle.php', {
      method: 'POST',
      json: { topic_name: topic.name },
    });
    if (!result.success) {
      Alert.alert('Error', result.error || 'Could not update topic membership.');
      return;
    }
    setTopics((current) => current.map((item) => (
      item.id === topic.id
        ? { ...item, is_member: result.state === 'joined', members: Math.max(0, item.members + (result.state === 'joined' ? 1 : -1)) }
        : item
    )));
  };

  useEffect(() => navigation.addListener('focus', fetchTopics), [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTopics();
  };

  if (loading && !refreshing) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#C65D3B" /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Topics</Text>
        <TouchableOpacity accessibilityLabel="Create topic" onPress={() => navigation.navigate('CreateTopic')}>
          <Plus color="#fff" size={24} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={topics}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C65D3B" />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <TouchableOpacity onPress={() => navigation.navigate('TopicDetail', { topicName: item.name })}>
                <Text style={styles.topicName}>#{item.name}</Text>
              </TouchableOpacity>
              <Text style={styles.memberCount}>{item.members} members</Text>
            </View>
            {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
            
            <TouchableOpacity 
              style={[styles.joinBtn, item.is_member && styles.joinedBtn]}
              onPress={() => toggleMembership(item)}
            >
              <Text style={[styles.joinBtnText, item.is_member && styles.joinedBtnText]}>
                {item.is_member ? 'Joined' : 'Join Topic'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No topics found.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EFE6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5EFE6' },
  header: { paddingVertical: 16, paddingHorizontal: 20, backgroundColor: '#3E2723' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#C65D3B' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E6E6E6' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  topicName: { fontSize: 18, fontWeight: '800', color: '#3E2723' },
  memberCount: { fontSize: 12, color: '#666', fontWeight: '600' },
  desc: { fontSize: 14, color: '#666', marginBottom: 16, lineHeight: 20 },
  joinBtn: { padding: 10, backgroundColor: '#C65D3B', borderRadius: 8, alignItems: 'center' },
  joinBtnText: { color: '#fff', fontWeight: '700' },
  joinedBtn: { backgroundColor: '#E6E6E6' },
  joinedBtnText: { color: '#3E2723' },
  empty: { textAlign: 'center', color: '#666', marginTop: 40 },
});