import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, ScrollView, ActivityIndicator, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ShieldCheck, Trash2, X } from 'lucide-react-native';
import { apiRequest, getAuthToken, API_BASE, getAuthenticatedMediaSource } from '../lib/api';
import { useTheme } from '../lib/theme';

export default function DatingProfileScreen({ navigation }) {
  const theme = useTheme();
  const [photos, setPhotos] = useState([]);
  const [verification, setVerification] = useState({ status: 'none' });
  const [loading, setLoading] = useState(true);
  
  // Split loading states so uploading a photo doesn't block the verification submit button
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submittingVerify, setSubmittingVerify] = useState(false);

  // Verification state
  const [verifyCode, setVerifyCode] = useState('');
  const [selfie, setSelfie] = useState(null);

  const fetchProfile = async () => {
    try {
      const res = await apiRequest('my_dating_profile.php');
      if (res.success) {
        setPhotos(res.photos || []);
        // Prevent crash if backend returns null
        setVerification(res.verification || { status: 'none' });
      } else {
        Alert.alert('Error', res.error || 'Could not load profile.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error while loading profile.');
    } finally {
      // Always stop the spinner, even if it errors
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Permission needed', 'Please allow photo library access to upload photos.');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) uploadPhoto(result.assets[0]);
  };

  const uploadPhoto = async (asset) => {
    if (photos.length >= 6) return Alert.alert('Limit reached', 'You can only upload 6 photos.');
    setUploadingPhoto(true);
    
    let uriToUpload = asset.uri;
    if (Platform.OS === 'ios' && uriToUpload.startsWith('file://')) {
      uriToUpload = uriToUpload.replace('file://', '/private');
    }

    const formData = new FormData();
    formData.append('photo', {
      uri: uriToUpload,
      name: 'photo.jpg',
      type: 'image/jpeg'
    });

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/dating_photo_upload.php`);
    xhr.setRequestHeader('Authorization', `Bearer ${getAuthToken()}`);
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.onload = async () => {
      setUploadingPhoto(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.success) {
            await fetchProfile();
          } else {
            Alert.alert('Error', data.error || 'Failed to upload photo.');
          }
        } catch (e) {
          Alert.alert('Error', 'Invalid response.');
        }
      } else {
        Alert.alert('Error', `Server status: ${xhr.status}`);
      }
    };

    xhr.onerror = () => {
      setUploadingPhoto(false);
      Alert.alert('Error', 'Network error during upload.');
    };

    xhr.send(formData);
  };

  const deletePhoto = async (id) => {
    Alert.alert("Delete Photo", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          const res = await apiRequest('dating_photo_delete.php', { method: 'POST', json: { photo_id: id } });
          if (res.success) await fetchProfile();
          else Alert.alert('Error', res.error || 'Failed to delete photo.');
        } catch (e) {
          Alert.alert('Error', 'Network error.');
        }
      }}
    ]);
  };

  const pickSelfie = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Permission needed', 'Please allow camera access to take a verification selfie.');
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) setSelfie(result.assets[0]);
  };

  const submitVerification = async () => {
    if (!/^\d{4}$/.test(verifyCode)) {
      return Alert.alert('Invalid Code', 'Please enter exactly 4 digits.');
    }
    if (!selfie) {
      return Alert.alert('Missing Selfie', 'Please take a selfie holding the code.');
    }
    
    setSubmittingVerify(true);

    let uriToUpload = selfie.uri;
    if (Platform.OS === 'ios' && uriToUpload.startsWith('file://')) {
      uriToUpload = uriToUpload.replace('file://', '/private');
    }

    const formData = new FormData();
    formData.append('code', verifyCode);
    formData.append('selfie', {
      uri: uriToUpload,
      name: 'selfie.jpg',
      type: 'image/jpeg'
    });

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/dating_verify.php`);
    xhr.setRequestHeader('Authorization', `Bearer ${getAuthToken()}`);
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.onload = async () => {
      setSubmittingVerify(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.success) {
            Alert.alert('Submitted', 'Your verification is pending review.');
            setSelfie(null);
            setVerifyCode('');
            await fetchProfile();
          } else {
            Alert.alert('Error', data.error || 'Verification failed.');
          }
        } catch (e) {
          Alert.alert('Error', 'Invalid response.');
        }
      } else {
        Alert.alert('Error', `Server status: ${xhr.status}`);
      }
    };

    xhr.onerror = () => {
      setSubmittingVerify(false);
      Alert.alert('Error', 'Network error during verification.');
    };

    xhr.send(formData);
  };

  const handleClose = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Fix: Navigate to Main stack, then the DatingTab inside it
      navigation.navigate('Main', { screen: 'DatingTab' });
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // Safely extract status so the app doesn't crash if verification is null
  const vStatus = verification?.status || 'none';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.header }]}>
        <Text style={[styles.headerTitle, { color: theme.headerText }]}>Dating Settings</Text>
        <TouchableOpacity onPress={handleClose}>
          <X color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ padding: 20 }}>
        {/* PHOTOS SECTION */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Photos ({photos.length}/6)</Text>
        <Text style={{ color: theme.textMuted, marginBottom: 10 }}>The first photo is your main profile picture.</Text>
        
        <View style={styles.photoGrid}>
          {photos.map((p, index) => (
            <View key={p.id} style={styles.photoWrapper}>
              <Image source={getAuthenticatedMediaSource(`media.php?kind=dating_photo&id=${encodeURIComponent(p.id)}`)} style={styles.photo} />
              <TouchableOpacity style={styles.deleteBtn} onPress={() => deletePhoto(p.id)}>
                <Trash2 color="#fff" size={14} />
              </TouchableOpacity>
              {index === 0 && (
                <View style={styles.mainBadge}>
                  <Text style={{color:'#fff', fontSize:10, fontWeight:'bold'}}>MAIN</Text>
                </View>
              )}
            </View>
          ))}

          {photos.length < 6 && (
            <TouchableOpacity 
              style={[styles.addBtn, { borderColor: theme.border }]} 
              onPress={pickPhoto} 
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? <ActivityIndicator color={theme.primary} /> : <Camera color={theme.primary} size={28} />}
            </TouchableOpacity>
          )}
        </View>

        {/* VERIFICATION SECTION */}
        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 30 }]}>Verification</Text>
        
        {vStatus === 'approved' ? (
          <View style={[styles.verifyBox, { backgroundColor: '#E8F5E9', borderColor: '#4CAF50' }]}>
            <ShieldCheck color="#4CAF50" size={32} />
            <Text style={{ color: '#4CAF50', fontWeight: 'bold', fontSize: 18, marginTop: 8 }}>Verified</Text>
            <Text style={{ color: '#666', textAlign: 'center', marginTop: 4 }}>Your dating profile shows a verified badge.</Text>
          </View>
        ) : vStatus === 'pending' ? (
          <View style={[styles.verifyBox, { backgroundColor: '#FFF3E0', borderColor: '#FF9800' }]}>
            <Text style={{ color: '#FF9800', fontWeight: 'bold', fontSize: 18 }}>Under Review</Text>
            <Text style={{ color: '#666', textAlign: 'center', marginTop: 4 }}>We received your selfie. An admin will review it within 24 hours.</Text>
          </View>
        ) : (
          <View style={[styles.verifyBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {vStatus === 'rejected' && (
              <View style={{ marginBottom: 16, alignItems: 'center' }}>
                <Text style={{ color: '#E53935', fontWeight: 'bold', fontSize: 16 }}>Verification Failed</Text>
                <Text style={{ color: theme.textMuted, textAlign: 'center', marginTop: 4 }}>
                  {verification?.reason || 'Your selfie was not approved. Please try again with better lighting and a clear code.'}
                </Text>
              </View>
            )}

            <Text style={{ color: theme.text, textAlign: 'center', marginBottom: 16 }}>
              To get verified, write the 4-digit code below on a piece of paper, hold it next to your face, and take a selfie.
            </Text>
            
            <TextInput
              style={[styles.codeInput, { color: theme.primary, borderColor: theme.primary }]}
              placeholder="Enter 4-digit code"
              placeholderTextColor={theme.textMuted}
              value={verifyCode}
              onChangeText={setVerifyCode}
              keyboardType="number-pad"
              maxLength={4}
            />

            {selfie && <Image source={{ uri: selfie.uri }} style={styles.selfiePreview} />}

            <TouchableOpacity 
              style={[styles.btn, { backgroundColor: selfie ? '#666' : theme.primary, marginBottom: 10 }]} 
              onPress={pickSelfie}
              disabled={submittingVerify}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>{selfie ? 'Retake Selfie' : 'Take Selfie with Code'}</Text>
            </TouchableOpacity>

            {selfie && (
              <TouchableOpacity 
                style={[styles.btn, { backgroundColor: theme.primary }]} 
                onPress={submitVerification} 
                disabled={submittingVerify}
              >
                {submittingVerify ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Submit for Review</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  photoWrapper: { width: '30%', aspectRatio: 1, borderRadius: 8, position: 'relative' },
  photo: { width: '100%', height: '100%', borderRadius: 8 },
  deleteBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', padding: 4, borderRadius: 12 },
  mainBadge: { position: 'absolute', bottom: 4, left: 4, backgroundColor: '#C65D3B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  addBtn: { width: '30%', aspectRatio: 1, borderRadius: 8, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  verifyBox: { padding: 20, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  codeInput: { fontSize: 24, fontWeight: '800', borderWidth: 2, borderRadius: 8, padding: 10, width: '100%', textAlign: 'center', letterSpacing: 8, marginBottom: 16 },
  selfiePreview: { width: 120, height: 120, borderRadius: 8, marginBottom: 16 },
  btn: { width: '100%', padding: 14, borderRadius: 8, alignItems: 'center' }
});