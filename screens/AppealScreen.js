import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { apiRequest, setAuthToken } from '../lib/api';
import { useTheme } from '../lib/theme';

export default function AppealScreen({ navigation, onLogin }) {
  const theme = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [appealText, setAppealText] = useState('');
  const [token, setToken] = useState(null);
  const [appeal, setAppeal] = useState(null);
  const [banReason, setBanReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [banned, setBanned] = useState(true);

  const signInToAppeal = async () => {
    setLoading(true);
    const result = await apiRequest('appeal_login.php', {
      method: 'POST',
      json: { username: username.trim(), password, code: code.trim() },
    });
    setLoading(false);
    if (!result.success || !result.token) {
      Alert.alert('Could not verify account', result.error || 'Please check your credentials and try again.');
      return;
    }
    setToken(result.token);
    setAuthToken(result.token);
    setBanReason(result.ban_reason || 'Not specified');
    await fetchAppealStatus(result.token);
  };

  const fetchAppealStatus = async (authToken = token) => {
    if (!authToken) return;
    setLoading(true);
    const result = await apiRequest('appeal.php');
    setLoading(false);
    if (!result.success) {
      Alert.alert('Error', result.error || 'Could not load your appeal status.');
      return;
    }
    setBanned(Boolean(result.banned));
    setBanReason(result.ban_reason || 'Not specified');
    setAppeal(result.appeal || null);
  };

  const submitAppeal = async () => {
    setLoading(true);
    const result = await apiRequest('appeal.php', {
      method: 'POST',
      json: { appeal_text: appealText.trim() },
    });
    setLoading(false);
    if (!result.success) {
      Alert.alert('Could not submit appeal', result.error || 'Please try again.');
      return;
    }
    setAppeal(result.appeal);
    setAppealText('');
    Alert.alert('Appeal submitted', 'Your appeal is now waiting for review.');
  };

  const continueToAccount = async () => {
    if (!token) return;
    await SecureStore.setItemAsync('qarota_token', token);
    setAuthToken(token);
    onLogin();
  };

  const leaveAppeal = async () => {
    if (token) {
      const result = await apiRequest('appeal.php', {
        method: 'POST',
        json: { action: 'logout' },
      });
      if (!result.success) {
        Alert.alert('Sign-out warning', 'This device is signed out, but the appeal session could not be revoked.');
      }
    }
    setAuthToken(null);
    navigation.navigate('Login');
  };

  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }];
  const actionButton = (label, onPress, disabled = false) => (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: theme.primary, opacity: disabled ? 0.65 : 1 }]}
      onPress={onPress}
      disabled={disabled}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{label}</Text>}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: theme.text }]}>Account appeal</Text>
          {!token ? (
            <>
              <Text style={[styles.description, { color: theme.textMuted }]}>
                Verify your suspended account to check its appeal status or submit an appeal. Two-factor authentication is still required when enabled.
              </Text>
              <TextInput value={username} onChangeText={setUsername} autoCapitalize="none" placeholder="Username or email" placeholderTextColor={theme.textMuted} style={inputStyle} />
              <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" placeholderTextColor={theme.textMuted} style={inputStyle} />
              <TextInput value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholder="Authenticator code (if enabled)" placeholderTextColor={theme.textMuted} style={inputStyle} />
              {actionButton('Continue', signInToAppeal, loading)}
            </>
          ) : (
            <>
              <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.label, { color: theme.textMuted }]}>Suspension reason</Text>
                <Text style={{ color: theme.text }}>{banReason}</Text>
              </View>
              {appeal ? (
                <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.label, { color: theme.textMuted }]}>Latest appeal · {appeal.status}</Text>
                  <Text style={{ color: theme.text }}>{appeal.appeal_text}</Text>
                  {appeal.admin_reply ? <Text style={[styles.reply, { color: theme.textMuted }]}>Admin response: {appeal.admin_reply}</Text> : null}
                </View>
              ) : null}
              {banned && appeal?.status !== 'pending' ? (
                <>
                  <Text style={[styles.description, { color: theme.textMuted }]}>
                    Explain your appeal in 20–2000 characters. A pending appeal must be reviewed before another can be submitted.
                  </Text>
                  <TextInput
                    value={appealText}
                    onChangeText={setAppealText}
                    maxLength={2000}
                    multiline
                    textAlignVertical="top"
                    placeholder="Write your appeal"
                    placeholderTextColor={theme.textMuted}
                    style={[inputStyle, styles.appealInput]}
                  />
                  {actionButton('Submit appeal', submitAppeal, loading || appealText.trim().length < 20)}
                </>
              ) : null}
              {!banned ? (
                <>
                  <Text style={[styles.description, { color: theme.textMuted }]}>
                    This account is no longer suspended. Continue to sign in.
                  </Text>
                  {actionButton('Continue to Qarota', continueToAccount, loading)}
                </>
              ) : null}
              <TouchableOpacity onPress={() => fetchAppealStatus()} style={styles.secondaryAction} disabled={loading}>
                <Text style={{ color: theme.primary, fontWeight: '700' }}>Refresh appeal status</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={leaveAppeal} style={styles.secondaryAction}>
                <Text style={{ color: theme.textMuted }}>Back to sign in</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 16 },
  description: { lineHeight: 21, marginBottom: 18 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 16, marginBottom: 12 },
  appealInput: { minHeight: 150, marginTop: 4 },
  button: { padding: 15, borderRadius: 10, alignItems: 'center', marginVertical: 8 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  infoCard: { padding: 14, borderWidth: 1, borderRadius: 10, marginBottom: 12 },
  label: { fontSize: 12, textTransform: 'uppercase', fontWeight: '700', marginBottom: 6 },
  reply: { marginTop: 10 },
  secondaryAction: { alignItems: 'center', padding: 12 },
});
