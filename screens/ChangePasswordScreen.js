import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Eye, EyeOff, Lock } from 'lucide-react-native';
import { apiRequest } from '../lib/api';
import { useTheme } from '../lib/theme';

export default function ChangePasswordScreen({ navigation }) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return Alert.alert('Missing fields', 'Please fill in all fields.');
    }

    if (newPassword.length < 8) {
      return Alert.alert('Weak password', 'New password must be at least 8 characters.');
    }

    if (newPassword !== confirmPassword) {
      return Alert.alert('Passwords do not match', 'Please make sure your new passwords match.');
    }

    setLoading(true);

    try {
      const res = await apiRequest('change_password.php', {
        method: 'POST',
        json: {
          current_password: currentPassword,
          new_password: newPassword
        }
      });

      if (res.success) {
        Alert.alert('Success', 'Your password has been changed successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', res.error || 'Failed to change password.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const PasswordInput = ({ 
    label, value, onChangeText, show, toggleShow, placeholder 
  }) => (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Lock color={theme.textMuted} size={20} style={{ marginRight: 10 }} />
        <TextInput
          style={[styles.input, { color: theme.text }]}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!show}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity onPress={toggleShow} style={{ padding: 4 }}>
          {show ? <EyeOff color={theme.textMuted} size={20} /> : <Eye color={theme.textMuted} size={20} />}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <ChevronLeft color={theme.text} size={28} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Change Password</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <Text style={[styles.hint, { color: theme.textMuted, marginBottom: 24 }]}>
            Make sure your new password is at least 8 characters long and includes a mix of letters, numbers, and symbols.
          </Text>

          <PasswordInput 
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            show={showCurrent}
            toggleShow={() => setShowCurrent(!showCurrent)}
            placeholder="Enter current password"
          />

          <PasswordInput 
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            show={showNew}
            toggleShow={() => setShowNew(!showNew)}
            placeholder="Enter new password"
          />

          <PasswordInput 
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            show={showNew}
            toggleShow={() => setShowNew(!showNew)}
            placeholder="Confirm new password"
          />

          <TouchableOpacity 
            style={[styles.submitBtn, { backgroundColor: theme.primary, opacity: loading ? 0.7 : 1 }]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Update Password</Text>
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
  scrollContent: { padding: 20 },
  
  hint: { fontSize: 14, lineHeight: 20 },
  
  fieldGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 52 },
  input: { flex: 1, fontSize: 16, height: '100%' },

  submitBtn: { height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});