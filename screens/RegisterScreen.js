import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, User, Mail, Lock, UserPlus } from 'lucide-react-native';
import { apiRequest } from '../lib/api';
import { useTheme } from '../lib/theme';

// --- FIX 1: MOVED OUTSIDE THE COMPONENT ---
const InputField = ({ icon, placeholder, value, onChangeText, secureTextEntry, keyboardType, autoCapitalize, theme }) => (
  <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
    {icon}
    <TextInput
      style={[styles.input, { color: theme.text }]}
      placeholder={placeholder}
      placeholderTextColor={theme.textMuted}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize || 'none'}
      autoCorrect={false}
    />
  </View>
);
// ------------------------------------------

export default function RegisterScreen({ navigation }) {
  const theme = useTheme();
  
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username || !email || !password) {
      return Alert.alert('Missing fields', 'Username, email, and password are required.');
    }

    setLoading(true);

    try {
      const res = await apiRequest('register.php', {
        method: 'POST',
        json: {
          display_name: displayName,
          username: username.toLowerCase().replace(/\s+/g, ''), 
          email: email.toLowerCase(),
          password: password
        }
      });

      if (res.success) {
        Alert.alert('Account created', 'Your account has been created. Please sign in to continue.', [
          { text: 'Sign in', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }) }
        ]);
      } else {
        Alert.alert('Registration Failed', res.error || 'Could not create account.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error. Please try again.');
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Create Account</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        {/* FIX 2: ADDED keyboardShouldPersistTaps */}
        <ScrollView 
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled" 
        >
          
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <View style={[styles.iconCircle, { backgroundColor: theme.primary + '20' }]}>
              <UserPlus color={theme.primary} size={40} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Join Qarota</Text>
            <Text style={{ color: theme.textMuted, textAlign: 'center', marginTop: 8, paddingHorizontal: 20 }}>
              Your data stays in Ghana. Your voice can&apos;t be silenced.
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Display Name (Optional)</Text>
            <InputField 
              theme={theme} // Pass theme to the outside component
              icon={<User color={theme.textMuted} size={20} style={{ marginRight: 10 }} />}
              placeholder="e.g. Iddrisu Umar"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Username *</Text>
            <InputField 
              theme={theme}
              icon={<User color={theme.textMuted} size={20} style={{ marginRight: 10 }} />}
              placeholder="e.g. wanchvn"
              value={username}
              onChangeText={setUsername}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Email Address *</Text>
            <InputField 
              theme={theme}
              icon={<Mail color={theme.textMuted} size={20} style={{ marginRight: 10 }} />}
              placeholder="e.g. hello@qarota.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Password *</Text>
            <InputField 
              theme={theme}
              icon={<Lock color={theme.textMuted} size={20} style={{ marginRight: 10 }} />}
              placeholder="At least 8 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity 
            style={[styles.registerBtn, { backgroundColor: theme.primary, opacity: loading ? 0.7 : 1 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerBtnText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginLinkContainer}>
            <Text style={{ color: theme.textMuted }}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={{ color: theme.primary, fontWeight: '700' }}>Log in</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { padding: 24, paddingBottom: 60 },
  
  iconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800' },
  
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, height: 52 },
  input: { flex: 1, fontSize: 16, height: '100%' },

  registerBtn: { height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  registerBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  loginLinkContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
});