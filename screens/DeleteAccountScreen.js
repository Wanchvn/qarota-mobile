import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, AlertTriangle, Trash2 } from 'lucide-react-native';
import { apiRequest } from '../lib/api';
import { useTheme } from '../lib/theme';

export default function DeleteAccountScreen({ navigation, onLogout }) {
  const theme = useTheme();
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = () => {
    if (confirmText !== 'DELETE') {
      return Alert.alert('Incorrect confirmation', 'Please type DELETE exactly as shown.');
    }
    if (!password) {
      return Alert.alert('Password required', 'Please enter your password to confirm.');
    }

    Alert.alert(
      "Final Warning",
      "This will permanently delete your account, posts, messages, and matches. This cannot be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Forever', style: 'destructive', onPress: submitDeletion }
      ]
    );
  };

  const submitDeletion = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('delete_account.php', {
        method: 'POST',
        json: { password }
      });

      if (res.success) {
        Alert.alert('Account Deleted', 'Your account has been permanently deleted.', [
          { text: 'OK', onPress: onLogout } // This will kick them back to login
        ]);
      } else {
        Alert.alert('Error', res.error || 'Could not delete account.');
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
        <Text style={[styles.title, { color: theme.text }]}>Delete Account</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          
          <View style={styles.warningBox}>
            <AlertTriangle color="#E53935" size={48} style={{ marginBottom: 16 }} />
            <Text style={[styles.warningTitle, { color: '#E53935' }]}>This action is permanent</Text>
            <Text style={[styles.warningText, { color: theme.text }]}>
              When you delete your account, all your posts, comments, likes, messages, and dating matches will be permanently erased. 
              There is no "undo" button.
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.text }]}>
              Type <Text style={{ fontWeight: 'bold', color: '#E53935' }}>DELETE</Text> to confirm:
            </Text>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder="DELETE"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Enter your password:</Text>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Current password"
              placeholderTextColor={theme.textMuted}
              secureTextEntry
            />
          </View>

          <TouchableOpacity 
            style={[styles.deleteBtn, { backgroundColor: '#E53935', opacity: loading ? 0.7 : 1 }]}
            onPress={handleDelete}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Trash2 color="#fff" size={20} style={{ marginRight: 8 }} />
                <Text style={styles.deleteBtnText}>Permanently Delete Account</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20 },
  
  warningBox: { alignItems: 'center', marginBottom: 32 },
  warningTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  warningText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },

  fieldGroup: { marginBottom: 20 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 16, fontSize: 16 },

  deleteBtn: { flexDirection: 'row', padding: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  deleteBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});