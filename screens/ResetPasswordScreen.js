import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Lock, Key } from 'lucide-react-native';
import { apiRequest } from '../lib/api';
import { useTheme } from '../lib/theme';

export default function ResetPasswordScreen({ route, navigation }) {
  const theme = useTheme();
  const { email } = route.params;
  
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!token.trim() || !newPassword.trim()) return Alert.alert('Missing', 'Please fill in all fields.');
    if (newPassword.length < 8) return Alert.alert('Weak password', 'Password must be at least 8 characters.');

    setLoading(true);
    try {
      const res = await apiRequest('reset_password.php', {
        method: 'POST',
        json: { email, token: token.trim(), new_password: newPassword }
      });

      if (res.success) {
        Alert.alert('Success', 'Your password has been reset.', [
          { text: 'Log In', onPress: () => navigation.navigate('Login') }
        ]);
      } else {
        Alert.alert('Error', res.error);
      }
    } catch (e) {
      Alert.alert('Error', 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <ChevronLeft color={theme.text} size={28} />
        </TouchableOpacity>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.text }]}>Reset Password</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            We sent a 6-digit code to {email}.
          </Text>

          <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Key color={theme.textMuted} size={20} style={{ marginRight: 12 }} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="6-digit code"
              placeholderTextColor={theme.textMuted}
              value={token}
              onChangeText={setToken}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Lock color={theme.textMuted} size={20} style={{ marginRight: 12 }} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="New Password (min 8 chars)"
              placeholderTextColor={theme.textMuted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity 
            style={[styles.btn, { backgroundColor: theme.primary, opacity: loading ? 0.7 : 1 }]} 
            onPress={handleReset}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Reset Password</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1 },
  content: { padding: 24, paddingTop: 40 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, height: 56, marginBottom: 16 },
  input: { flex: 1, fontSize: 16, height: '100%' },
  btn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});