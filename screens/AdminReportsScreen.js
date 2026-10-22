import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ShieldAlert, CheckCircle, Trash2, MessageSquare, FileText } from 'lucide-react-native';
import { apiRequest, getAuthenticatedMediaSource } from '../lib/api';
import { useTheme } from '../lib/theme';

export default function AdminReportsScreen({ navigation }) {
  const theme = useTheme();
  
  const [postReports, setPostReports] = useState([]);
  const [dmReports, setDmReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReports = async () => {
    try {
      const res = await apiRequest('admin_get_reports.php'); 
      if (res.success) {
        setPostReports(res.post_reports || []);
        setDmReports(res.dm_reports || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const handleAction = (reportId, action) => {
    Alert.alert(
      `Confirm ${action}`,
      `Are you sure you want to ${action} this report?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: action === 'remove' ? 'destructive' : 'default', onPress: async () => {
            const res = await apiRequest('admin_action_report.php', {
              method: 'POST',
              json: { report_id: reportId, admin_action: action }
            });
            if (res.success) {
              Alert.alert('Success', `Report ${action === 'remove' ? 'removed' : 'dismissed'}.`);
              fetchReports();
            } else {
              Alert.alert('Error', res.error || 'Action failed.');
            }
        }}
      ]
    );
  };

  const ReportCard = ({ report, isDm }) => {
    const reporterName = report.reporter_display_name || report.reporter_username;
    
    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ShieldAlert color={theme.primary} size={18} />
            <Text style={[styles.reasonText, { color: theme.primary }]}>
              {report.reason.toUpperCase()}
            </Text>
          </View>
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>{report.created_at}</Text>
        </View>

        <View style={styles.cardBody}>
          <Text style={{ color: theme.textMuted, fontSize: 13, marginBottom: 8 }}>
            Reported by <Text style={{ fontWeight: 'bold', color: theme.text }}>{reporterName}</Text>
          </Text>
          
          {report.details ? (
            <Text style={[styles.detailsText, { color: theme.textMuted }]}>"{report.details}"</Text>
          ) : null}

          <View style={[styles.previewBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
            {isDm ? (
              <>
                <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 4 }}>
                  Message from @{report.sender_username}
                </Text>
                <Text style={{ color: theme.text }} numberOfLines={4}>
                  {report.message_body || 'Message deleted'}
                </Text>
              </>
            ) : (
              <>
                <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 4 }}>
                  Post by @{report.author_username}
                </Text>
                <Text style={{ color: theme.text }} numberOfLines={4}>
                  {report.post_content}
                </Text>
                {report.post_media && (
                  <Image source={getAuthenticatedMediaSource(`media.php?kind=post&id=${encodeURIComponent(report.post_id)}`)} style={styles.postMedia} />
                )}
              </>
            )}
          </View>
        </View>

        <View style={[styles.actionsRow, { borderTopColor: theme.border }]}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction(report.id, 'dismiss')}>
            <CheckCircle color="#4CAF50" size={18} />
            <Text style={{ color: '#4CAF50', fontWeight: '600', marginLeft: 6 }}>Dismiss</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction(report.id, 'remove')}>
            <Trash2 color="#E53935" size={18} />
            <Text style={{ color: '#E53935', fontWeight: '600', marginLeft: 6 }}>Remove</Text>
          </TouchableOpacity>
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
        <Text style={[styles.title, { color: theme.text }]}>Reported Content</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : (
        <ScrollView 
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        >
          {dmReports.length === 0 && postReports.length === 0 ? (
            <View style={styles.center}>
              <CheckCircle color={theme.border} size={64} style={{ marginBottom: 16 }} />
              <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700' }}>All caught up!</Text>
              <Text style={{ color: theme.textMuted, textAlign: 'center', marginTop: 8 }}>There are no pending reports right now.</Text>
            </View>
          ) : (
            <>
              {dmReports.length > 0 && (
                <View style={{ marginBottom: 24 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <MessageSquare color={theme.text} size={20} />
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Direct Messages ({dmReports.length})</Text>
                  </View>
                  {dmReports.map(report => (
                    <ReportCard key={`dm-${report.id}`} report={report} isDm={true} />
                  ))}
                </View>
              )}

              {postReports.length > 0 && (
                <View style={{ marginBottom: 24 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <FileText color={theme.text} size={20} />
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Posts ({postReports.length})</Text>
                  </View>
                  {postReports.map(report => (
                    <ReportCard key={`post-${report.id}`} report={report} isDm={false} />
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginLeft: 8 },
  
  card: { borderRadius: 12, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1 },
  reasonText: { fontSize: 13, fontWeight: '800', marginLeft: 6 },
  cardBody: { padding: 16 },
  detailsText: { fontStyle: 'italic', fontSize: 14, marginBottom: 12 },
  
  previewBox: { padding: 12, borderRadius: 8, borderWidth: 1 },
  postMedia: { width: '100%', height: 150, borderRadius: 8, marginTop: 8, resizeMode: 'cover' },
  
  actionsRow: { flexDirection: 'row', borderTopWidth: 1 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
});