import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, 
  Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, ShieldCheck, UploadCloud, CheckCircle2, Clock } from 'lucide-react-native';
import { apiRequest, getAuthToken, API_BASE } from '../lib/api';
import { useTheme } from '../lib/theme';

export default function VerificationRequestScreen({ navigation }) {
  const theme = useTheme();
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState('none'); // 'none', 'pending', 'approved'

  // Form State
  const [fullName, setFullName] = useState('');
  const [category, setCategory] = useState('personal'); 
  const [country, setCountry] = useState('Ghana');
  const [idType, setIdType] = useState('national_id');
  const [idNumber, setIdNumber] = useState('');
  const [reason, setReason] = useState('');
  
  // Images
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);

  // Check current status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await apiRequest('me.php');
        if (res.success && res.user) {
          if (res.user.verification_type && res.user.verification_type !== 'none') {
            setCurrentStatus('approved');
          }
        }
      } catch (e) {
        console.log('Error checking verification status:', e);
      } finally {
        setInitialLoading(false);
      }
    };
    checkStatus();
  }, []);

  const pickImage = async (side) => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      return Alert.alert("Permission required", "You need to allow Qarota to access your photos.");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      if (side === 'front') setFrontImage(result.assets[0]);
      else setBackImage(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    if (!fullName || !idNumber || !reason || !frontImage) {
      return Alert.alert('Missing fields', 'Please fill in all required fields and upload the front of your ID.');
    }

    setLoading(true);
    const formData = new FormData();
    
    formData.append('full_legal_name', fullName);
    formData.append('category', category);
    formData.append('country', country);
    formData.append('id_type', idType);
    formData.append('id_number', idNumber);
    formData.append('reason', reason);

    let frontUri = frontImage.uri;
    let backUri = backImage ? backImage.uri : null;

    if (Platform.OS === 'ios') {
      if (frontUri.startsWith('file://')) frontUri = frontUri.replace('file://', '/private');
      if (backUri && backUri.startsWith('file://')) backUri = backUri.replace('file://', '/private');
    }

    const frontFilename = frontUri.split('/').pop();
    const frontMatch = /\.(\w+)$/.exec(frontFilename);
    const frontType = frontMatch ? `image/${frontMatch[1]}` : `image/jpeg`;
    formData.append('id_front', { uri: frontUri, name: frontFilename, type: frontType });

    if (backUri) {
      const backFilename = backUri.split('/').pop();
      const backMatch = /\.(\w+)$/.exec(backFilename);
      const backType = backMatch ? `image/${backMatch[1]}` : `image/jpeg`;
      formData.append('id_back', { uri: backUri, name: backFilename, type: backType });
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/apply_verification.php`);
    xhr.setRequestHeader('Authorization', `Bearer ${getAuthToken()}`);
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.onload = () => {
      setLoading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.success) {
            setCurrentStatus('pending'); // Move to pending state
          } else {
            Alert.alert('Error', data.error || 'Could not submit application.');
          }
        } catch (e) {
          Alert.alert('Error', 'Invalid response from server.');
        }
      } else {
        Alert.alert('Error', `Server responded with status ${xhr.status}`);
      }
    };

    xhr.onerror = () => {
      setLoading(false);
      Alert.alert('Error', 'Network error while uploading.');
    };

    xhr.send(formData);
  };

  if (initialLoading) {
    return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;
  }

  // --- SCREEN STATE: ALREADY VERIFIED ---
  if (currentStatus === 'approved') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
            <ChevronLeft color={theme.text} size={28} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Verification</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.center}>
          <ShieldCheck color={theme.primary} size={80} style={{ marginBottom: 24 }} />
          <Text style={{ color: theme.text, fontSize: 24, fontWeight: '800', marginBottom: 12 }}>You are Verified</Text>
          <Text style={{ color: theme.textMuted, fontSize: 16, textAlign: 'center', lineHeight: 24 }}>
            Your identity has already been verified. A verification badge is displayed on your profile.
          </Text>
          <TouchableOpacity 
            style={[styles.btn, { backgroundColor: theme.primary, marginTop: 32, width: '80%' }]} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.btnText}>Return to Settings</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- SCREEN STATE: PENDING REVIEW ---
  if (currentStatus === 'pending') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
            <ChevronLeft color={theme.text} size={28} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Verification</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.center}>
          <Clock color="#FF9800" size={80} style={{ marginBottom: 24 }} />
          <Text style={{ color: theme.text, fontSize: 24, fontWeight: '800', marginBottom: 12 }}>Application Submitted</Text>
          <Text style={{ color: theme.textMuted, fontSize: 16, textAlign: 'center', lineHeight: 24 }}>
            Your verification request is currently under review. Our team will update your account within 24-48 hours.
          </Text>
          <TouchableOpacity 
            style={[styles.btn, { backgroundColor: theme.primary, marginTop: 32, width: '80%' }]} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.btnText}>Return to Settings</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- SCREEN STATE: NONE (SHOW FORM) ---
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <ChevronLeft color={theme.text} size={28} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Apply for Verification</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          
          <View style={styles.infoBox}>
            <ShieldCheck color={theme.primary} size={24} />
            <Text style={{ color: theme.textMuted, fontSize: 13, marginLeft: 12, flex: 1, lineHeight: 18 }}>
              Verified accounts have a blue checkmark. Your legal name and ID will not be shown publicly, only your username.
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Full Legal Name *</Text>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
              value={fullName}
              onChangeText={setFullName}
              placeholder="As it appears on your ID"
              placeholderTextColor={theme.textMuted}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Category</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {['personal', 'organization'].map(cat => (
                <TouchableOpacity 
                  key={cat}
                  style={[styles.optionBtn, { borderColor: category === cat ? theme.primary : theme.border, backgroundColor: category === cat ? theme.primary + '10' : theme.surface }]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={{ color: category === cat ? theme.primary : theme.textMuted, textTransform: 'capitalize', fontWeight: '600' }}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: theme.text }]}>Country *</Text>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
                value={country}
                onChangeText={setCountry}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: theme.text }]}>ID Type *</Text>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
                value={idType}
                onChangeText={setIdType}
                placeholder="e.g. Passport, National ID"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.text }]}>ID Number *</Text>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
              value={idNumber}
              onChangeText={setIdNumber}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Why do you want to be verified? *</Text>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, height: 100, textAlignVertical: 'top' }]}
              value={reason}
              onChangeText={setReason}
              placeholder="Are you a public figure, journalist, or organization?"
              placeholderTextColor={theme.textMuted}
              multiline
            />
          </View>

          <Text style={[styles.label, { color: theme.text, marginTop: 12, marginBottom: 8 }]}>Upload ID Documents *</Text>
          
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity 
              style={[styles.uploadBox, { backgroundColor: theme.surface, borderColor: frontImage ? theme.primary : theme.border }]}
              onPress={() => pickImage('front')}
            >
              {frontImage ? (
                <Image source={{ uri: frontImage.uri }} style={styles.uploadedImage} />
              ) : (
                <>
                  <UploadCloud color={theme.textMuted} size={28} />
                  <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 8, textAlign: 'center' }}>Front of ID</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.uploadBox, { backgroundColor: theme.surface, borderColor: backImage ? theme.primary : theme.border }]}
              onPress={() => pickImage('back')}
            >
              {backImage ? (
                <Image source={{ uri: backImage.uri }} style={styles.uploadedImage} />
              ) : (
                <>
                  <UploadCloud color={theme.textMuted} size={28} />
                  <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 8, textAlign: 'center' }}>Back of ID (Optional)</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.btn, { backgroundColor: theme.primary, opacity: loading ? 0.7 : 1 }]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Submit Application</Text>}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 60 },
  
  infoBox: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, backgroundColor: 'rgba(198, 93, 59, 0.1)', marginBottom: 24 },
  
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 14, fontSize: 15 },
  
  optionBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  
  uploadBox: { flex: 1, height: 120, borderWidth: 2, borderStyle: 'dashed', borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  uploadedImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  btn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});