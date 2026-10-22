import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import { apiRequest, setAuthToken } from '../lib/api';
import { useTheme } from '../lib/theme';

export default function LoginScreen({ navigation, onLogin }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your username and password.');
      return;
    }

    setLoading(true);

    const res = await apiRequest('login.php', {
      method: 'POST',
      json: {
        username: username.trim(),
        password: password,
        device_name: Platform.OS + '-app',
      },
    });

    setLoading(false);

    // FIXED: Check for 2FA FIRST to prevent any security bypass
    if (res.success && res.requires_2fa) {
      // 2FA is required! Navigate to the verification screen
      navigation.navigate('TwoFactorVerify', { userId: res.user_id });
    } else if (res.success && res.token) {
      // Normal Login Success
      await SecureStore.setItemAsync('qarota_token', res.token);
      setAuthToken(res.token);
      onLogin();
    } else {
      // Login Failed
      Alert.alert('Login failed', res.error || 'Please check your details.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={[styles.logo, { color: theme.text }]}>Qarota</Text>
        <Text style={[styles.tagline, { color: theme.primary }]}>Africa's social network</Text>

        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
          placeholder="Username"
          placeholderTextColor={theme.textMuted}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
          placeholder="Password"
          placeholderTextColor={theme.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity 
          style={{ alignSelf: 'flex-end', marginBottom: 20 }} 
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 14 }}>
            {t('forgot_password')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: theme.primary }]} 
          onPress={handleLogin} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t('login')}</Text>
          )}
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
          <Text style={{ color: theme.textMuted }}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={{ color: theme.primary, fontWeight: '700' }}>{t('signup')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    fontSize: 40,
    fontWeight: '800',
    textAlign: 'center',
  },
  tagline: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 40,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});