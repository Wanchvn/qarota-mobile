import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Smartphone, Monitor, LogOut, ShieldCheck } from 'lucide-react-native';
import { apiRequest } from '../lib/api';
import { useTheme } from '../lib/theme';
import { timeAgo } from '../lib/timeAgo';

export default function ActiveSessionsScreen({ navigation }) {
  const theme = useTheme();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSessions = async () => {
    try {
      const res = await apiRequest('get_sessions.php');
      if (res.success) {
        setSessions(res.sessions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSessions();
  };

  const handleRevoke = (sessionId, deviceName) => {
    Alert.alert(
      "Log out device",
      `Are you sure you want to log out of ${deviceName}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Log Out", style: "destructive", onPress: async () => {
            try {
              const res = await apiRequest('revoke_session.php', {
                method: 'POST',
                json: { session_id: sessionId }
              });
              if (res.success) {
                setSessions(prev => prev.filter(s => s.id !== sessionId));
              } else {
                Alert.alert('Error', res.error);
              }
            } catch (e) {
              Alert.alert('Error', 'Network error.');
            }
        }}
      ]
    );
  };

  const renderSession = ({ item }) => {
    const isMobile = item.device_name.toLowerCase().includes('ios') || item.device_name.toLowerCase().includes('android');

    return (
      <View style={[styles.sessionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.iconContainer}>
          {isMobile ? (
            <Smartphone color={theme.primary} size={28} />
          ) : (
            <Monitor color={theme.primary} size={28} />
          )}
        </View>

        <View style={styles.sessionInfo}>
          <Text style={[styles.deviceName, { color: theme.text }]}>
            {item.device_name}
            {item.is_current && <Text style={{ color: theme.primary, fontWeight: 'bold' }}> (Current)</Text>}
          </Text>
          <Text style={[styles.ipAddress, { color: theme.textMuted }]}>IP: {item.ip_address}</Text>
          <Text style={[styles.lastActive, { color: theme.textMuted }]}>Active {timeAgo(item.last_active)}</Text>
        </View>

        {!item.is_current && (
          <TouchableOpacity 
            style={[styles.revokeBtn, { borderColor: '#E53935' }]}
            onPress={() => handleRevoke(item.id, item.device_name)}
          >
            <LogOut color="#E53935" size={16} />
            <Text style={{ color: '#E53935', fontSize: 13, fontWeight: '600', marginLeft: 4 }}>Log out</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <ChevronLeft color={theme.text} size={28} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Active Sessions</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.primary + '10' }}>
        <ShieldCheck color={theme.primary} size={24} />
        <Text style={{ color: theme.text, fontSize: 13, marginLeft: 12, flex: 1 }}>
          If you see a device you don't recognize, log it out immediately and change your password.
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderSession}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: theme.textMuted }}>No active sessions found.</Text>
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
  
  sessionCard: { 
    flexDirection: 'row', alignItems: 'center', padding: 16, 
    borderRadius: 12, borderWidth: 1, marginBottom: 12 
  },
  iconContainer: { 
    width: 50, height: 50, borderRadius: 25, 
    backgroundColor: 'rgba(198, 93, 59, 0.1)', 
    alignItems: 'center', justifyContent: 'center', marginRight: 16 
  },
  sessionInfo: { flex: 1 },
  deviceName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  ipAddress: { fontSize: 13, marginBottom: 2 },
  lastActive: { fontSize: 12 },
  
  revokeBtn: { 
    flexDirection: 'row', alignItems: 'center', 
    paddingVertical: 8, paddingHorizontal: 12, 
    borderRadius: 8, borderWidth: 1 
  },
});