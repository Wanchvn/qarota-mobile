import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Key } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import { apiRequest, setAuthToken } from '../lib/api';
import { useTheme } from '../lib/theme';

export default function TwoFactorVerifyScreen({ route, navigation, onLogin }) {
  const { userId } = route.params;
  const theme = useTheme();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) return Alert.alert('Invalid Code', 'Please enter the 6-digit code.');
    
    setLoading(true);
    const res = await apiRequest('login_2fa.php', {
      method: 'POST',
      json: { user_id: userId, code }
    });
    setLoading(false);

    if (res.success && res.token) {
      // Save the new token and log in
      await SecureStore.setItemAsync('qarota_token', res.token);
      setAuthToken(res.token);
      onLogin();
    } else {
      Alert.alert('Verification Failed', res.error || 'Incorrect code.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <Key color={theme.primary} size={60} style={{ alignSelf: 'center', marginBottom: 20 }} />
          <Text style={[styles.title, { color: theme.text }]}>Two-Factor Auth</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Open your authenticator app and enter the 6-digit code for Qarota.
          </Text>

          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
            placeholder="000000"
            placeholderTextColor={theme.textMuted}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />

          <TouchableOpacity 
            style={[styles.btn, { backgroundColor: theme.primary }]} 
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify Code</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 32, paddingTop: 80 },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 24, textAlign: 'center', letterSpacing: 8, marginBottom: 20 },
  btn: { padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});