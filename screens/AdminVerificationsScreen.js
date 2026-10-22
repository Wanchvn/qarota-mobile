import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Alert, ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ShieldCheck, Heart, CheckCircle, XCircle } from 'lucide-react-native';
import { apiRequest, getAuthToken, MEDIA_BASE, getAuthenticatedMediaSource } from '../lib/api';
import { useTheme } from '../lib/theme';

export default function AdminVerificationsScreen({ route, navigation }) {
  const theme = useTheme();
  const verifyType = route.params?.type || 'profile'; 
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getMediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    // Make sure MEDIA_BASE includes the root URL, e.g., http://192.168.1.91/qarota
    return `${MEDIA_BASE}/${path.replace(/^\//, '')}`;
  };

  const fetchRequests = async () => {
    try {
      const res = await apiRequest(`admin_get_verifications.php?type=${verifyType}`);
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
    fetchRequests();
  }, [verifyType]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const handleAction = (itemId, action) => {
    Alert.alert(
      `Confirm ${action}`,
      `Are you sure you want to ${action} this verification?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: action === 'reject' ? 'destructive' : 'default', onPress: async () => {
            const res = await apiRequest('admin_action_verification.php', {
              method: 'POST',
              json: { id: itemId, action: action, type: verifyType }
            });
            if (res.success) {
              setItems(prev => prev.filter(i => i.id !== itemId));
              Alert.alert('Success', `Request ${action}d.`);
            } else {
              Alert.alert('Error', res.error || 'Action failed.');
            }
        }}
      ]
    );
  };

  const renderItem = ({ item }) => {
    const isDating = verifyType === 'dating';

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        
        {/* Header */}
        <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isDating ? <Heart color={theme.primary} size={18} /> : <ShieldCheck color={theme.primary} size={18} />}
            <Text style={[styles.userName, { color: theme.text }]}>
              {isDating ? `@${item.username}` : item.full_legal_name}
            </Text>
          </View>
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>ID: {item.id}</Text>
        </View>

        {/* Body */}
        <View style={styles.cardBody}>
          
          {isDating ? (
            // --- DATING VERIFICATION UI ---
            <>
              <Text style={{ color: theme.textMuted, marginBottom: 8, fontSize: 13 }}>
                Code: <Text style={{ fontWeight: 'bold', color: theme.primary }}>{item.code || 'N/A'}</Text>
              </Text>
              {item.selfie_url && (
                <Image
                  source={{
                    uri: getMediaUrl(item.selfie_url),
                    headers: { Authorization: `Bearer ${getAuthToken()}` },
                  }}
                  style={styles.imagePreview}
                />
              )}
            </>
          ) : (
            // --- PROFILE VERIFICATION UI (Matches your DB screenshot) ---
            <>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Account:</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>@{item.username} ({item.name})</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Category:</Text>
                <Text style={[styles.infoValue, { color: theme.text, textTransform: 'capitalize' }]}>{item.category}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Country:</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{item.country}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>ID Type:</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{item.id_type} - {item.id_number}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Reason:</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{item.reason}</Text>
              </View>

              {/* ID Images side-by-side */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                {item.id_front_path && (
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 4 }}>ID Front</Text>
                    <Image source={getAuthenticatedMediaSource(`media.php?kind=verification&id=${encodeURIComponent(item.id)}&slot=front`)} style={styles.idImage} />
                  </View>
                )}
                {item.id_back_path && (
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 4 }}>ID Back</Text>
                    <Image source={getAuthenticatedMediaSource(`media.php?kind=verification&id=${encodeURIComponent(item.id)}&slot=back`)} style={styles.idImage} />
                  </View>
                )}
              </View>
            </>
          )}

        </View>

        {/* Actions */}
        <View style={[styles.actionsRow, { borderTopColor: theme.border }]}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction(item.id, 'reject')}>
            <XCircle color="#E53935" size={18} />
            <Text style={{ color: '#E53935', fontWeight: '600', marginLeft: 6 }}>Reject</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction(item.id, 'approve')}>
            <CheckCircle color="#4CAF50" size={18} />
            <Text style={{ color: '#4CAF50', fontWeight: '600', marginLeft: 6 }}>Approve</Text>
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
        <Text style={[styles.title, { color: theme.text }]}>
          {verifyType === 'dating' ? 'Dating Verifications' : 'Profile Verifications'}
        </Text>
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
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.center}>
              <CheckCircle color={theme.border} size={64} style={{ marginBottom: 16 }} />
              <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700' }}>All caught up!</Text>
              <Text style={{ color: theme.textMuted, textAlign: 'center', marginTop: 8 }}>There are no pending {verifyType} verifications.</Text>
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
  
  infoRow: { flexDirection: 'row', marginBottom: 6 },
  infoLabel: { width: 80, fontSize: 13 },
  infoValue: { flex: 1, fontSize: 13, fontWeight: '500' },
  
  imagePreview: { width: '100%', height: 250, borderRadius: 8, resizeMode: 'cover', backgroundColor: '#E0E0E0', marginTop: 8 },
  idImage: { width: '100%', height: 100, borderRadius: 8, resizeMode: 'cover', backgroundColor: '#E0E0E0' },
  
  actionsRow: { flexDirection: 'row', borderTopWidth: 1 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
});