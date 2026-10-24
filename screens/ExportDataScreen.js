import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Download, FileJson } from 'lucide-react-native';
import { apiRequest } from '../lib/api';
import { useTheme } from '../lib/theme';

export default function ExportDataScreen({ navigation }) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('request_data_export.php', { method: 'POST' });
      if (res.success) {
        Alert.alert('Export Requested', 'We are preparing your data. You will receive an email with a download link shortly.');
        navigation.goBack();
      } else {
        Alert.alert('Error', res.error || 'Could not request export.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <ChevronLeft color={theme.text} size={28} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Export Data</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
          <FileJson color={theme.primary} size={64} />
        </View>

        <Text style={[styles.heading, { color: theme.text }]}>Your data belongs to you.</Text>
        
        <Text style={[styles.description, { color: theme.textMuted }]}>
          Mobile data exports are not available yet. Use the Export my data page on the Qarota website to download your archive.
        </Text>

        <TouchableOpacity 
          style={[styles.exportBtn, { backgroundColor: theme.primary, opacity: loading ? 0.7 : 1 }]}
          onPress={handleExport}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Download color="#fff" size={20} style={{ marginRight: 8 }} />
              <Text style={styles.exportBtnText}>Request Data Export</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '700' },
  content: { padding: 32, alignItems: 'center', marginTop: 40 },
  
  iconContainer: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  heading: { fontSize: 24, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  description: { fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 40 },

  exportBtn: { flexDirection: 'row', width: '100%', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  exportBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});