import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, 
  RefreshControl, TouchableOpacity 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ShieldAlert, CheckCircle, XCircle, Clock } from 'lucide-react-native';
import { apiRequest } from '../lib/api';
import { useTheme } from '../lib/theme';
import { timeAgo } from '../lib/timeAgo';

export default function MyReportsScreen({ navigation }) {
  const theme = useTheme();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyReports = async () => {
    try {
      const res = await apiRequest('my_reports.php');
      if (res.success) {
        setReports(res.reports || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMyReports();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyReports();
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'pending':
        return { text: 'Under Review', color: '#FF9800', bg: '#FFF3E0', icon: <Clock color="#FF9800" size={14} /> };
      case 'actioned':
        return { text: 'Action Taken', color: '#4CAF50', bg: '#E8F5E9', icon: <CheckCircle color="#4CAF50" size={14} /> };
      case 'dismissed':
        return { text: 'Dismissed', color: '#E53935', bg: '#FDECEA', icon: <XCircle color="#E53935" size={14} /> };
      default:
        return { text: 'Unknown', color: theme.textMuted, bg: theme.background, icon: null };
    }
  };

  const renderItem = ({ item }) => {
    const status = getStatusDisplay(item.status);

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        
        {/* Header */}
        <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ShieldAlert color={theme.textMuted} size={16} />
            <Text style={[styles.reasonText, { color: theme.text }]}>
              Report: {item.reason.toUpperCase()}
            </Text>
          </View>
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>{timeAgo(item.created_at)}</Text>
        </View>

        {/* Body */}
        <View style={styles.cardBody}>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            {status.icon}
            <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
          </View>

          {item.post_content ? (
            <View style={[styles.excerptBox, { backgroundColor: theme.background }]}>
              <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 4 }}>Reported Post:</Text>
              <Text style={{ color: theme.textMuted, fontStyle: 'italic' }} numberOfLines={2}>
                "{item.post_content}"
              </Text>
            </View>
          ) : (
            <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 8 }}>
              Reported a direct message or user profile.
            </Text>
          )}

          {item.admin_note && (
            <View style={styles.adminNoteRow}>
              <Text style={{ color: theme.textMuted, fontSize: 12 }}>Moderator Note: </Text>
              <Text style={{ color: theme.text, fontSize: 12, fontStyle: 'italic' }}>{item.admin_note}</Text>
            </View>
          )}
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
        <Text style={[styles.title, { color: theme.text }]}>My Reports</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.center}>
              <CheckCircle color={theme.border} size={64} style={{ marginBottom: 16 }} />
              <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700' }}>No reports submitted</Text>
              <Text style={{ color: theme.textMuted, textAlign: 'center', marginTop: 8 }}>If you report a post or user, it will appear here so you can track its status.</Text>
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
  
  card: { borderRadius: 12, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1 },
  reasonText: { fontSize: 13, fontWeight: '700', marginLeft: 8 },
  cardBody: { padding: 16 },
  
  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 12 },
  statusText: { fontSize: 12, fontWeight: '700', marginLeft: 6 },

  excerptBox: { padding: 10, borderRadius: 8, marginBottom: 8 },
  adminNoteRow: { flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' },
});