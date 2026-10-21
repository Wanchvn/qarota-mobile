import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Mail } from 'lucide-react-native';
import { apiRequest } from '../lib/api';
import { useTheme } from '../lib/theme';

export default function ForgotPasswordScreen({ navigation }) {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequest = async () => {
    if (!email.trim()) return Alert.alert('Missing', 'Please enter your email address.');
    
    setLoading(true);
    try {
      const res = await apiRequest('forgot_password.php', {
        method: 'POST',
        json: { email: email.trim().toLowerCase() }
      });

      if (res.success) {
        Alert.alert('Code Sent', res.message, [
          { text: 'Enter Code', onPress: () => navigation.navigate('ResetPassword', { email: email.trim().toLowerCase() }) }
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
          <Mail color={theme.primary} size={64} style={{ marginBottom: 20, alignSelf: 'center' }} />
          <Text style={[styles.title, { color: theme.text }]}>Forgot Password?</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Enter your email address and we'll send you a 6-digit code to reset your password.
          </Text>

          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
            placeholder="Email Address"
            placeholderTextColor={theme.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TouchableOpacity 
            style={[styles.btn, { backgroundColor: theme.primary, opacity: loading ? 0.7 : 1 }]} 
            onPress={handleRequest}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send Reset Code</Text>}
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
  input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 20 },
  btn: { padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});