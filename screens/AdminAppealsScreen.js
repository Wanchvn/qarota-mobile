import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, CheckCircle, XCircle, UserX } from 'lucide-react-native';
import { apiRequest } from '../lib/api';
import { useTheme } from '../lib/theme';

export default function AdminAppealsScreen({ navigation }) {
  const theme = useTheme();
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAppeals = async () => {
    try {
      const res = await apiRequest('admin_get_appeals.php');
      if (res.success) {
        setAppeals(res.appeals || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAppeals();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppeals();
  };

  const handleAction = (appealId, action) => {
    Alert.alert(
      `Confirm ${action}`,
      `Are you sure you want to ${action} this appeal?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: action === 'reject' ? 'destructive' : 'default', onPress: async () => {
            const res = await apiRequest('admin_action_appeal.php', {
              method: 'POST',
              json: { appeal_id: appealId, action: action }
            });
            if (res.success) {
              setAppeals(prev => prev.filter(a => a.id !== appealId));
              Alert.alert('Success', `Appeal ${action}d.`);
            } else {
              Alert.alert('Error', res.error || 'Action failed.');
            }
        }}
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <UserX color="#E53935" size={18} />
          <Text style={[styles.userName, { color: theme.text }]}>
            @{item.username}
          </Text>
        </View>
        <Text style={{ color: theme.textMuted, fontSize: 12 }}>{item.created_at}</Text>
      </View>

      <View style={styles.cardBody}>
        <Text style={{ color: theme.textMuted, fontSize: 13, marginBottom: 8 }}>
          Ban Reason: <Text style={{ color: theme.text, fontWeight: 'bold' }}>{item.ban_reason || 'Violation of Terms'}</Text>
        </Text>
        
        <View style={[styles.previewBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 4 }}>Appeal Message:</Text>
          <Text style={{ color: theme.text }}>{item.appeal_text}</Text>
        </View>
      </View>

      <View style={[styles.actionsRow, { borderTopColor: theme.border }]}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction(item.id, 'reject')}>
          <XCircle color="#E53935" size={18} />
          <Text style={{ color: '#E53935', fontWeight: '600', marginLeft: 6 }}>Reject</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction(item.id, 'approve')}>
          <CheckCircle color="#4CAF50" size={18} />
          <Text style={{ color: '#4CAF50', fontWeight: '600', marginLeft: 6 }}>Unban User</Text>
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
        <Text style={[styles.title, { color: theme.text }]}>Ban Appeals</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : (
        <FlatList
          data={appeals}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.center}>
              <CheckCircle color={theme.border} size={64} style={{ marginBottom: 16 }} />
              <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700' }}>No pending appeals</Text>
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
  userName: { fontSize: 15, fontWeight: '700', marginLeft: 8 },
  cardBody: { padding: 16 },
  previewBox: { padding: 12, borderRadius: 8, borderWidth: 1 },
  actionsRow: { flexDirection: 'row', borderTopWidth: 1 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
});