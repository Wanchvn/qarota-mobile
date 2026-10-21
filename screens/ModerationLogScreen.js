import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, 
  RefreshControl, TouchableOpacity 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ShieldAlert, CheckCircle, Trash2, Clock, User } from 'lucide-react-native';
import { apiRequest } from '../lib/api';
import { useTheme } from '../lib/theme';
import { timeAgo } from '../lib/timeAgo';

export default function ModerationLogScreen({ navigation }) {
  const theme = useTheme();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = async () => {
    try {
      const res = await apiRequest('moderation_log.php');
      if (res.success) {
        setLogs(res.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const getActionDetails = (type) => {
    switch (type) {
      case 'post_removed':
        return { icon: <Trash2 color="#E53935" size={18} />, title: 'Post Removed', color: '#E53935' };
      case 'message_reported':
        return { icon: <ShieldAlert color="#FF9800" size={18} />, title: 'Message Removed', color: '#FF9800' };
      case 'report_dismissed':
        return { icon: <CheckCircle color="#4CAF50" size={18} />, title: 'Report Dismissed', color: '#4CAF50' };
      case 'user_banned':
        return { icon: <User color="#E53935" size={18} />, title: 'User Banned', color: '#E53935' };
      default:
        return { icon: <ShieldAlert color={theme.textMuted} size={18} />, title: 'Moderation Action', color: theme.textMuted };
    }
  };

  const renderItem = ({ item }) => {
    const details = getActionDetails(item.action_type);

    return (
      <View style={[styles.logCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        
        {/* Header */}
        <View style={styles.logHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {details.icon}
            <Text style={[styles.actionTitle, { color: details.color }]}>{details.title}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Clock color={theme.textMuted} size={12} />
            <Text style={{ color: theme.textMuted, fontSize: 12, marginLeft: 4 }}>
              {timeAgo(item.created_at)}
            </Text>
          </View>
        </View>

        {/* Body */}
        <View style={styles.logBody}>
          {item.post_excerpt ? (
            <View style={[styles.excerptBox, { backgroundColor: theme.background }]}>
              <Text style={{ color: theme.textMuted, fontStyle: 'italic' }} numberOfLines={3}>
                "{item.post_excerpt}"
              </Text>
            </View>
          ) : null}

          <View style={styles.metaRow}>
            <Text style={{ color: theme.textMuted, fontSize: 13 }}>
              Policy: <Text style={{ color: theme.text, fontWeight: '600', textTransform: 'capitalize' }}>{item.policy_category || 'N/A'}</Text>
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={{ color: theme.textMuted, fontSize: 13 }}>
              Action by: <Text style={{ color: theme.primary, fontWeight: '600' }}>@{item.admin_username || 'System'}</Text>
            </Text>
          </View>
        </View>

      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <ChevronLeft color={theme.text} size={28} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Public Moderation Log</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.center}>
              <CheckCircle color={theme.border} size={64} style={{ marginBottom: 16 }} />
              <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700' }}>Clean Record</Text>
              <Text style={{ color: theme.textMuted, textAlign: 'center', marginTop: 8 }}>No moderation actions have been taken yet.</Text>
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
  
  logCard: { borderRadius: 12, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  actionTitle: { fontSize: 14, fontWeight: '700', marginLeft: 8 },
  
  logBody: { padding: 12 },
  excerptBox: { padding: 10, borderRadius: 8, marginBottom: 10 },
  metaRow: { flexDirection: 'row', marginBottom: 4 },
});