import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ShieldAlert, CheckCircle, XCircle, Trash2 } from 'lucide-react-native';
import { apiRequest, MEDIA_BASE } from '../lib/api';
import { useTheme } from '../lib/theme';

export default function AdminDashboardScreen({ route, navigation }) {
  const theme = useTheme();
  // We can pass a "type" to this screen (e.g., 'reports', 'verifications', 'appeals')
  const adminType = route.params?.type || 'reports'; 
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getMediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${MEDIA_BASE}/${path.replace(/^\//, '')}`;
  };

  // Determine title based on type
  const getTitle = () => {
    switch (adminType) {
      case 'reports': return 'Reported Content';
      case 'verifications': return 'Verification Requests';
      case 'dating': return 'Dating Verifications';
      case 'appeals': return 'Appeals';
      default: return 'Admin Dashboard';
    }
  };

  const fetchData = async () => {
    try {
      // Your backend should have an endpoint that returns reports/verifications based on the type
      const res = await apiRequest(`admin_get_${adminType}.php`); 
      if (res.success) {
        setItems(res.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [adminType]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleAction = (item, action) => {
    Alert.alert(
      `Confirm ${action}`,
      `Are you sure you want to ${action} this?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: action === 'dismiss' ? 'default' : 'destructive', onPress: async () => {
            // Send action to backend
            const res = await apiRequest(`admin_action_${adminType}.php`, {
              method: 'POST',
              json: { id: item.id, action: action }
            });
            if (res.success) {
              setItems(prev => prev.filter(i => i.id !== item.id));
              Alert.alert('Success', `Item ${action}ed.`);
            } else {
              Alert.alert('Error', res.error || 'Action failed.');
            }
        }}
      ]
    );
  };

  const renderReportItem = ({ item }) => (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      
      {/* Header: Why was it reported? */}
      <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ShieldAlert color="#E53935" size={18} />
          <Text style={[styles.reasonText, { color: '#E53935' }]}>Reported for: {item.reason}</Text>
        </View>
        <Text style={{ color: theme.textMuted, fontSize: 12 }}>{item.created_at}</Text>
      </View>

      {/* Body: The Content or User */}
      <View style={styles.cardBody}>
        {item.post_content ? (
          <View style={[styles.postPreview, { backgroundColor: theme.background }]}>
            <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 4 }}>Post by @{item.author_username}</Text>
            <Text style={{ color: theme.text }} numberOfLines={3}>{item.post_content}</Text>
          </View>
        ) : (
          <Text style={{ color: theme.text }}>Reported User: @{item.reported_username}</Text>
        )}
        
        <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 12 }}>
          Reported by: <Text style={{ fontWeight: 'bold' }}>@{item.reporter_username}</Text>
        </Text>
      </View>

      {/* Actions */}
      <View style={[styles.actionsRow, { borderTopColor: theme.border }]}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction(item, 'dismiss')}>
          <CheckCircle color="#4CAF50" size={18} />
          <Text style={{ color: '#4CAF50', fontWeight: '600', marginLeft: 6 }}>Dismiss</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction(item, 'delete')}>
          <Trash2 color="#E53935" size={18} />
          <Text style={{ color: '#E53935', fontWeight: '600', marginLeft: 6 }}>Delete Content</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderVerificationItem = ({ item }) => (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.cardBody}>
        <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>
          {item.user_name} (@{item.username})
        </Text>
        
        {item.selfie_url && (
          <Image source={{ uri: getMediaUrl(item.selfie_url) }} style={styles.selfiePreview} />
        )}
        
        <Text style={{ color: theme.textMuted, marginTop: 8 }}>Code provided: <Text style={{ fontWeight: 'bold', color: theme.text }}>{item.code}</Text></Text>
      </View>

      <View style={[styles.actionsRow, { borderTopColor: theme.border }]}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction(item, 'reject')}>
          <XCircle color="#E53935" size={18} />
          <Text style={{ color: '#E53935', fontWeight: '600', marginLeft: 6 }}>Reject</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction(item, 'approve')}>
          <CheckCircle color="#4CAF50" size={18} />
          <Text style={{ color: '#4CAF50', fontWeight: '600', marginLeft: 6 }}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <ChevronLeft color={theme.text} size={28} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>{getTitle()}</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          renderItem={adminType === 'reports' ? renderReportItem : renderVerificationItem}
          ListEmptyComponent={
            <View style={styles.center}>
              <CheckCircle color={theme.border} size={64} style={{ marginBottom: 16 }} />
              <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700' }}>All caught up!</Text>
              <Text style={{ color: theme.textMuted, textAlign: 'center', marginTop: 8 }}>There are no pending {getTitle().toLowerCase()} right now.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '700' },
  
  card: { borderRadius: 12, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1 },
  reasonText: { fontSize: 13, fontWeight: '700', marginLeft: 6 },
  cardBody: { padding: 16 },
  
  postPreview: { padding: 12, borderRadius: 8, marginTop: 4 },
  
  selfiePreview: { width: '100%', height: 200, borderRadius: 8, resizeMode: 'cover', marginTop: 12 },
  
  actionsRow: { flexDirection: 'row', borderTopWidth: 1 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
});