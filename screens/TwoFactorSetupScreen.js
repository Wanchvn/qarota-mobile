import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, 
  Alert, TextInput, KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, ShieldCheck, CheckCircle2, LogOut } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { apiRequest } from '../lib/api';
import { useTheme } from '../lib/theme';

export default function TwoFactorSetupScreen({ navigation, onLogout }) { 
  const theme = useTheme();
  
  const [screenState, setScreenState] = useState('loading');
  const [qrUri, setQrUri] = useState(null);
  const [secret, setSecret] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [showManualKey, setShowManualKey] = useState(false);

  useFocusEffect(
    useCallback(() => {
      checkStatus();
    }, [])
  );

  const checkStatus = async () => {
    const res = await apiRequest('get_2fa_status.php');
    if (res.success) {
      setScreenState(res.enabled ? 'on' : 'off');
    } else {
      if (onLogout) onLogout(); // Instant logout, no alert
    }
  };

  const startSetup = async () => {
    setSaving(true);
    const res = await apiRequest('generate_2fa_secret.php');
    setSaving(false);
    
    if (res.success) {
      setQrUri(res.qr_uri);
      setSecret(res.secret);
      setScreenState('setup');
      setShowManualKey(false);
    } else {
      if (onLogout) onLogout(); // Instant logout, no alert
    }
  };

  const verifyAndEnable = async () => {
    if (verificationCode.length !== 6) return Alert.alert('Invalid', 'Enter the 6-digit code from your app.');
    
    setSaving(true);
    const res = await apiRequest('enable_2fa.php', {
      method: 'POST',
      json: { code: verificationCode } 
    });
    setSaving(false);

    if (res.success) {
      Alert.alert('Success', 'Two-factor authentication is now enabled!');
      setScreenState('on');
    } else {
      Alert.alert('Error', res.error || 'Invalid code. Please try again.');
    }
  };

  const disable2FA = () => {
    Alert.alert("Disable 2FA", "Are you sure you want to turn off 2FA? Your account will be less secure.", [
      { text: "Cancel", style: "cancel" },
      { text: "Disable", style: "destructive", onPress: async () => {
          const res = await apiRequest('toggle_2fa.php', { method: 'POST', json: { enabled: false } });
          if (res.success) setScreenState('off');
      }}
    ]);
  };

  if (screenState === 'loading') {
    return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator color={theme.primary} size="large" /></View>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <ChevronLeft color={theme.text} size={28} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Two-factor authentication</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }} 
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.statusTitle, { color: theme.text }]}>
              Status: {screenState === 'on' ? <Text style={{color: '#4CAF50'}}>On</Text> : 'Off'}
            </Text>

            {screenState === 'off' && (
              <>
                <Text style={[styles.description, { color: theme.text }]}>
                  2FA adds a second step to sign-in: after your password, you'll enter a 6-digit code from an authenticator app on your phone. Even if someone steals your password, they can't get in without your phone.
                </Text>
                <Text style={[styles.highlightText, { color: theme.textMuted }]}>
                  Qarota doesn't send codes by SMS — SIM swapping is a real risk in many African countries. We use TOTP instead, which works entirely offline.
                </Text>
                
                <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.primary }]} onPress={startSetup} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <ShieldCheck color="#fff" size={18} style={{ marginRight: 8 }} />
                      <Text style={styles.primaryBtnText}>Set up 2FA</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            {screenState === 'setup' && (
              <>
                <Text style={[styles.description, { color: theme.text, marginBottom: 16 }]}>
                  1. Open your authenticator app.{'\n'}
                  2. Scan the QR code below.{'\n'}
                  3. Enter the 6-digit code it generates.
                </Text>

                {!showManualKey ? (
                  <View style={styles.qrContainer}>
                    {qrUri && <QRCode value={qrUri} size={180} />}
                  </View>
                ) : (
                  <View style={[styles.manualKeyContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 8 }}>Setup Key:</Text>
                    <Text selectable={true} style={{ color: theme.text, fontSize: 18, fontWeight: 'bold', letterSpacing: 2 }}>
                      {secret}
                    </Text>
                  </View>
                )}

                <TouchableOpacity onPress={() => setShowManualKey(!showManualKey)} style={{ marginBottom: 20 }}>
                  <Text style={{ color: theme.primary, textAlign: 'center', fontWeight: '600', fontSize: 13 }}>
                    {showManualKey ? 'Show QR Code instead' : "Can't scan? Enter setup key manually"}
                  </Text>
                </TouchableOpacity>

                <TextInput
                  style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                />

                <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.primary }]} onPress={verifyAndEnable} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify & Enable</Text>}
                </TouchableOpacity>
                
                <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={() => setScreenState('off')}>
                  <Text style={{ color: theme.textMuted }}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}

            {screenState === 'on' && (
              <>
                <View style={{ alignItems: 'center', marginVertical: 20 }}>
                  <CheckCircle2 color="#4CAF50" size={64} />
                  <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold', marginTop: 12 }}>
                    Your account is protected.
                  </Text>
                </View>
                <Text style={[styles.description, { color: theme.text, textAlign: 'center' }]}>
                  You will be asked for a code from your authenticator app next time you log in.
                </Text>
                
                <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: 'transparent', borderColor: '#E53935', borderWidth: 1, marginTop: 20 }]} onPress={disable2FA}>
                  <Text style={[styles.primaryBtnText, { color: '#E53935' }]}>Disable 2FA</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* TEMPORARY FORCE LOGOUT BUTTON */}
          <TouchableOpacity 
            style={{ marginTop: 30, alignItems: 'center', padding: 15, backgroundColor: '#FDECEA', borderRadius: 8 }} 
            onPress={onLogout}
          >
            <LogOut color="#E53935" size={20} style={{ marginBottom: 8 }} />
            <Text style={{ color: '#E53935', fontWeight: 'bold' }}>Force Log Out (Temporary)</Text>
          </TouchableOpacity>
          
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '700' },
  
  card: { padding: 24, borderRadius: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statusTitle: { fontSize: 20, fontWeight: '800', marginBottom: 12 },
  description: { fontSize: 15, lineHeight: 22, marginBottom: 12 },
  highlightText: { fontSize: 13, lineHeight: 18, marginBottom: 24 },
  
  primaryBtn: { flexDirection: 'row', padding: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  
  qrContainer: { alignItems: 'center', marginVertical: 10, padding: 16, backgroundColor: '#fff', borderRadius: 12, alignSelf: 'center' },
  
  manualKeyContainer: { padding: 20, borderRadius: 12, borderWidth: 1, alignItems: 'center', marginVertical: 10 },
  
  input: { borderWidth: 1, borderRadius: 8, padding: 14, fontSize: 20, textAlign: 'center', letterSpacing: 4, marginBottom: 16 }
});