import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image, 
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Switch 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { CheckCircle2, XCircle, ChevronLeft, Camera } from 'lucide-react-native';
import { apiRequest, getAuthToken, API_BASE, MEDIA_BASE } from '../lib/api';
import { useTheme } from '../lib/theme';

export default function EditProfileScreen({ navigation }) {
  const theme = useTheme();
  
  // Data state
  const [formData, setFormData] = useState({
    new_username: '',
    display_name: '',
    bio: '',
    location: '',
    occupation: '',
    education: '',
    languages: '',
    interests: '',
    dark_mode: false,
  });

  // Avatar state
  const [avatar, setAvatar] = useState(null); // Current DB avatar
  const [newAvatar, setNewAvatar] = useState(null); // Newly picked image

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Username logic
  const [currentUsername, setCurrentUsername] = useState('');
  const [canChangeUsername, setCanChangeUsername] = useState(true);
  const [daysLeft, setDaysLeft] = useState(0);
  const [usernameStatus, setUsernameStatus] = useState('idle'); // idle, checking, available, taken, invalid
  const [usernameMsg, setUsernameMsg] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiRequest('user_profile.php');
        if (res.success && res.profile) {
          const p = res.profile;
          setCurrentUsername(p.username);
          setAvatar(p.avatar);
          
          setFormData({
            new_username: p.username,
            display_name: p.name || '',
            bio: p.bio || '',
            location: p.location || '',
            occupation: p.work || '', // Mapped from occupation
            education: p.education || '',
            languages: p.languages || '',
            interests: p.interests || '',
            dark_mode: false, // Update if your API returns theme
          });

          // Calculate username cooldown (mock logic if backend doesn't send it yet)
          if (p.username_changed_at) {
            const lastChange = new Date(p.username_changed_at).getTime();
            const nextAllowed = lastChange + (30 * 24 * 60 * 60 * 1000);
            if (Date.now() < nextAllowed) {
              setCanChangeUsername(false);
              setDaysLeft(Math.ceil((nextAllowed - Date.now()) / (24 * 60 * 60 * 1000)));
            }
          }
        }
      } catch (e) {
        Alert.alert('Error', 'Could not load profile.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'new_username' && (value === currentUsername || value.trim() === '')) {
      setUsernameStatus('idle');
      setUsernameMsg('');
    }
  };

  const checkUsernameAvailability = async () => {
    const uname = formData.new_username.trim();
    if (!uname || uname === currentUsername) return;

    setUsernameStatus('checking');
    setUsernameMsg('Checking availability…');

    try {
      const res = await apiRequest(`check_username.php?u=${encodeURIComponent(uname)}`);
      if (res.available) {
        setUsernameStatus('available');
        setUsernameMsg(`✓ @${uname} is available`);
      } else if (res.reason === 'invalid') {
        setUsernameStatus('invalid');
        setUsernameMsg(`✗ ${res.message || 'Invalid username'}`);
      } else if (res.reason === 'taken') {
        setUsernameStatus('taken');
        setUsernameMsg(`✗ @${uname} is taken${res.suggestion ? ` — try "${res.suggestion}"` : ''}`);
      }
    } catch (e) {
      setUsernameStatus('idle');
      setUsernameMsg('Could not check availability.');
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      return Alert.alert("Permission required", "You need to allow Qarota to access your photos.");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // Fixed for newer Expo SDK
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setNewAvatar(result.assets[0]);
    }
  };

  const handleSave = async () => {
    if (!canChangeUsername && formData.new_username !== currentUsername) {
      return Alert.alert('Error', `You can change your username in ${daysLeft} days.`);
    }
    if (usernameStatus === 'taken' || usernameStatus === 'invalid') {
      return Alert.alert('Error', 'Please choose a valid username.');
    }

    setSaving(true);
    const uploadData = new FormData();
    
    // Append all text fields
    Object.keys(formData).forEach(key => {
      if (key === 'dark_mode') {
        uploadData.append('dark_mode', formData[key] ? '1' : '0');
      } else {
        uploadData.append(key, formData[key]);
      }
    });

    // Append avatar if changed
    if (newAvatar) {
      let uriToUpload = newAvatar.uri;
      if (Platform.OS === 'ios' && uriToUpload.startsWith('file://')) {
        uriToUpload = uriToUpload.replace('file://', '/private');
      }
      
      const filename = uriToUpload.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      uploadData.append('avatar', { uri: uriToUpload, name: filename, type });
    }

    // --- REPLACED FETCH WITH XMLHTTPREQUEST ---
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/edit_profile.php`);
    xhr.setRequestHeader('Authorization', `Bearer ${getAuthToken()}`);
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.onload = () => {
      setSaving(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.success) {
            Alert.alert('Success', 'Profile updated successfully.');
            navigation.goBack();
          } else {
            Alert.alert('Error', data.error || 'Could not update profile.');
          }
        } catch (e) {
          Alert.alert('Error', 'Invalid response from server.');
        }
      } else {
        Alert.alert('Error', `Server responded with status ${xhr.status}`);
      }
    };

    xhr.onerror = () => {
      setSaving(false);
      Alert.alert('Error', 'Network error while saving.');
    };

    xhr.send(uploadData);
  };

  if (loading) return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator color={theme.primary} /></View>;

  const displayImage = newAvatar ? newAvatar.uri : (avatar ? `${MEDIA_BASE}/${avatar}` : null);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        {/* HEADER */}
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
            <Text style={{ color: theme.textMuted, fontSize: 16 }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={{ padding: 4 }}>
            {saving ? <ActivityIndicator color={theme.primary} size="small" /> : <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '700' }}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body}  keyboardShouldPersistTaps="handled">
          
          {/* AVATAR */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickImage}>
              {displayImage ? (
                <Image source={{ uri: displayImage }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: theme.border }]}>
                  <Text style={{ color: theme.textMuted }}>Tap to add</Text>
                </View>
              )}
              <View style={[styles.cameraIcon, { backgroundColor: theme.surface }]}>
                <Camera color={theme.primary} size={18} />
              </View>
            </TouchableOpacity>
          </View>

          {/* USERNAME SECTION */}
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Username</Text>
            
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1, color: theme.text, backgroundColor: theme.background, borderColor: theme.border }, !canChangeUsername && { opacity: 0.5 }]}
                value={formData.new_username}
                onChangeText={(val) => handleChange('new_username', val)}
                editable={canChangeUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {canChangeUsername && formData.new_username !== currentUsername && (
                <TouchableOpacity style={[styles.checkBtn, { borderColor: theme.primary }]} onPress={checkUsernameAvailability}>
                  <Text style={{ color: theme.primary, fontWeight: '600' }}>Check</Text>
                </TouchableOpacity>
              )}
            </View>

            {canChangeUsername ? (
              <>
                {usernameStatus === 'checking' && <Text style={[styles.hint, { color: theme.textMuted }]}>{usernameMsg}</Text>}
                {usernameStatus === 'available' && <Text style={[styles.hint, { color: '#4CAF50' }]}>{usernameMsg}</Text>}
                {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <Text style={[styles.hint, { color: '#E53935' }]}>{usernameMsg}</Text>}
                {usernameStatus === 'idle' && <Text style={[styles.hint, { color: theme.textMuted }]}>Current: @{currentUsername}. Can change once every 30 days.</Text>}
              </>
            ) : (
              <Text style={[styles.hint, { color: theme.textMuted }]}>You can change your username again in <Text style={{fontWeight: 'bold', color: theme.text}}>{daysLeft} days</Text>.</Text>
            )}
          </View>

          {/* BASIC INFO */}
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Basic Information</Text>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Display Name</Text>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                value={formData.display_name}
                onChangeText={(val) => handleChange('display_name', val)}
                placeholder="Your preferred name"
                placeholderTextColor={theme.textMuted}
                maxLength={60}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Bio</Text>
              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top', color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                value={formData.bio}
                onChangeText={(val) => handleChange('bio', val)}
                placeholder="Tell people about yourself..."
                placeholderTextColor={theme.textMuted}
                multiline
                maxLength={160}
              />
              <Text style={[styles.hint, { color: theme.textMuted, textAlign: 'right' }]}>{160 - formData.bio.length} characters left</Text>
            </View>
          </View>

          {/* DETAILS */}
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Details</Text>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Location</Text>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                value={formData.location}
                onChangeText={(val) => handleChange('location', val)}
                placeholder="e.g. Tamale, Ghana"
                placeholderTextColor={theme.textMuted}
                maxLength={100}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Occupation</Text>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                value={formData.occupation}
                onChangeText={(val) => handleChange('occupation', val)}
                placeholder="e.g. Software Developer"
                placeholderTextColor={theme.textMuted}
                maxLength={100}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Education</Text>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                value={formData.education}
                onChangeText={(val) => handleChange('education', val)}
                placeholder="e.g. Tamale Technical University"
                placeholderTextColor={theme.textMuted}
                maxLength={150}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Languages</Text>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                value={formData.languages}
                onChangeText={(val) => handleChange('languages', val)}
                placeholder="e.g. Dagbani, English"
                placeholderTextColor={theme.textMuted}
                maxLength={150}
              />
            </View>

            <View style={[styles.formGroup, { marginBottom: 0 }]}>
              <Text style={[styles.label, { color: theme.text }]}>Interests</Text>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                value={formData.interests}
                onChangeText={(val) => handleChange('interests', val)}
                placeholder="e.g. Reading, coding"
                placeholderTextColor={theme.textMuted}
                maxLength={200}
              />
            </View>
          </View>

          {/* APPEARANCE (Optional) */}
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 0 }]}>Dark Mode</Text>
                <Text style={[styles.hint, { color: theme.textMuted, marginTop: 4 }]}>Easier on the eyes at night.</Text>
              </View>
              <Switch
                value={formData.dark_mode}
                onValueChange={(val) => handleChange('dark_mode', val)}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>

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
  body: { padding: 16, paddingBottom: 40 },
  
  avatarSection: { alignItems: 'center', marginBottom: 24, marginTop: 10 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },

  card: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderRadius: 8, padding: 12, fontSize: 15, borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center' },
  hint: { fontSize: 12, marginTop: 6 },
});