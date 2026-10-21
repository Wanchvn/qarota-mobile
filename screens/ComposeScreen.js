import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image, 
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAudioRecorder, AudioModule, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage'; // <-- ADDED
import { Camera, Video as VideoIcon, Mic, X, Play, Globe, Users, Lock, Hash } from 'lucide-react-native'; 
import { apiRequest, getAuthToken, API_BASE } from '../lib/api';
import { compressImage } from '../lib/imageUtils'; 
import { useTheme } from '../lib/theme';

const DRAFT_KEY = '@qarota_draft';

export default function ComposeScreen({ onClose, onPosted }) {
  const theme = useTheme();
  
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [voiceUri, setVoiceUri] = useState(null);
  const [recordDuration, setRecordDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [visibility, setVisibility] = useState('public');
  
  const [myTopics, setMyTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const timerRef = useRef(null);

  // --- NEW: LOAD DRAFT ON MOUNT ---
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const savedDraft = await AsyncStorage.getItem(DRAFT_KEY);
        if (savedDraft && !content) { // Only load if we don't already have text
          setContent(savedDraft);
        }
      } catch (e) {
        console.log('Failed to load draft', e);
      }
    };
    loadDraft();
  }, []);

  // --- NEW: SAVE DRAFT AS USER TYPES ---
  useEffect(() => {
    const saveDraft = async () => {
      try {
        if (content.trim()) {
          await AsyncStorage.setItem(DRAFT_KEY, content);
        } else {
          await AsyncStorage.removeItem(DRAFT_KEY);
        }
      } catch (e) {
        console.log('Failed to save draft', e);
      }
    };
    
    // Debounce the save so it doesn't write to disk on every single keystroke
    const timeoutId = setTimeout(saveDraft, 500);
    return () => clearTimeout(timeoutId);
  }, [content]);

  useEffect(() => {
    async function prepareAudio() {
      try {
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      } catch (e) { console.log('Audio mode error:', e); }
    }
    prepareAudio();

    const fetchTopics = async () => {
      try {
        const res = await apiRequest('my_topics.php');
        if (res.success) setMyTopics(res.topics || []);
      } catch (e) { console.log('Failed to load topics', e); }
    };
    fetchTopics();

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleDiscard = async () => {
    Alert.alert("Discard Draft?", "Are you sure you want to discard this post?", [
      { text: "Keep Editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: async () => {
          await AsyncStorage.removeItem(DRAFT_KEY);
          onClose();
      }}
    ]);
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) return Alert.alert("Permission required", "Allow access to photos.");

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        setImage(result.assets[0]);
        setVideo(null);
        setVoiceUri(null);
      }
    } catch (err) {
      Alert.alert("Photo Error", err.message);
    }
  };

  const pickVideo = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) return Alert.alert("Permission required", "Allow access to videos.");

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 60,
      });

      if (!result.canceled) {
        setVideo(result.assets[0]);
        setImage(null);
        setVoiceUri(null);
      }
    } catch (err) {
      Alert.alert("Video Error", err.message);
    }
  };

  const startRecording = async () => {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) return Alert.alert('Permission required', 'Allow microphone access.');
      
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setRecordDuration(0);
      setImage(null);
      setVideo(null);
      
      timerRef.current = setInterval(() => setRecordDuration(prev => prev + 1), 1000);
    } catch (err) {
      Alert.alert('Recording Error', err.message);
    }
  };

  const stopRecording = async () => {
    if (!audioRecorder.isRecording) return;
    if (timerRef.current) clearInterval(timerRef.current);
    
    try {
      await audioRecorder.stop();
      setVoiceUri(audioRecorder.uri);
    } catch (err) {
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const cancelRecording = async () => {
    if (!audioRecorder.isRecording) return;
    if (timerRef.current) clearInterval(timerRef.current);
    await audioRecorder.stop();
    setVoiceUri(null);
    setRecordDuration(0);
  };

  const handlePost = async () => {
    if (!content.trim() && !image && !video && !voiceUri) {
      return Alert.alert('Empty post', 'Please add something to post.');
    }

    setLoading(true);
    let endpoint = 'post_create.php';
    
    const formData = new FormData();
    formData.append('content', content.trim());
    formData.append('visibility', visibility);
    
    if (selectedTopic) {
      formData.append('topic_id', selectedTopic.toString());
    }

    if (image) {
      const compressedUri = await compressImage(image.uri);
      formData.append('image', { uri: compressedUri, name: 'post_image.jpg', type: 'image/jpeg' });
    } else if (video) {
      endpoint = 'post_video.php';
      formData.append('duration', String(video.duration ? Math.round(video.duration) : 0));
      const videoUri = Platform.OS === 'ios' && !video.uri.startsWith('file://') ? `file://${video.uri}` : video.uri;
      formData.append('video', { uri: videoUri, name: 'video.mp4', type: 'video/mp4' });
    } else if (voiceUri) {
      endpoint = 'post_voice.php';
      formData.append('duration', String(recordDuration));
      const audioUri = Platform.OS === 'ios' && !voiceUri.startsWith('file://') ? `file://${voiceUri}` : voiceUri;
      formData.append('voice', { uri: audioUri, name: 'voice.m4a', type: 'audio/m4a' });
    }

    try {
      const response = await fetch(`${API_BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getAuthToken()}`, 'Accept': 'application/json' },
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        await AsyncStorage.removeItem(DRAFT_KEY); // <-- CLEAR DRAFT ON SUCCESS
        onPosted();
      } else {
        Alert.alert('Error', data.error || 'Upload failed');
      }
    } catch (err) {
      Alert.alert('Error', 'Network error.');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          {/* UPDATED: Use handleDiscard for Cancel button */}
          <TouchableOpacity onPress={handleDiscard} disabled={loading}>
            <Text style={[styles.cancelBtn, { color: theme.textMuted }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>New Post</Text>
          <TouchableOpacity onPress={handlePost} disabled={loading}>
            {loading ? <ActivityIndicator color={theme.primary} size="small" /> : <Text style={[styles.postBtn, { color: theme.primary }]}>Post</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="What's on your mind?"
            placeholderTextColor={theme.textMuted}
            multiline
            value={content}
            onChangeText={setContent}
            maxLength={500}
            autoFocus
          />

          {myTopics.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ color: theme.textMuted, fontSize: 13, marginBottom: 8, fontWeight: '600' }}>Tag a topic:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                {myTopics.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.topicPill, 
                      { 
                        backgroundColor: selectedTopic === t.id ? theme.primary + '20' : theme.surface,
                        borderColor: selectedTopic === t.id ? theme.primary : theme.border
                      }
                    ]}
                    onPress={() => setSelectedTopic(selectedTopic === t.id ? null : t.id)}
                  >
                    <Hash color={selectedTopic === t.id ? theme.primary : theme.textMuted} size={14} />
                    <Text style={{ color: selectedTopic === t.id ? theme.primary : theme.textMuted, fontWeight: '600', marginLeft: 4 }}>
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {image && (
            <View style={styles.previewContainer}>
              <Image source={{ uri: image.uri }} style={styles.previewImage} />
              <TouchableOpacity style={styles.removeBtn} onPress={() => setImage(null)}>
                <X color="#fff" size={16} />
              </TouchableOpacity>
            </View>
          )}

          {video && (
            <View style={styles.previewContainer}>
              <View style={[styles.previewImage, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
                <VideoIcon color="#fff" size={48} />
                <Text style={{ color: '#fff', marginTop: 10, fontWeight: 'bold' }}>Video Attached</Text>
              </View>
              <TouchableOpacity style={styles.removeBtn} onPress={() => setVideo(null)}>
                <X color="#fff" size={16} />
              </TouchableOpacity>
            </View>
          )}

          {voiceUri && (
            <View style={[styles.voicePreview, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Mic color={theme.primary} size={20} style={{ marginRight: 8 }} />
                <Text style={{ color: theme.text, fontWeight: '600' }}>Voice Note ({recordDuration}s)</Text>
              </View>
              <TouchableOpacity onPress={() => setVoiceUri(null)}>
                <X color={theme.textMuted} size={20} />
              </TouchableOpacity>
            </View>
          )}

          {audioRecorder.isRecording && (
            <View style={[styles.recordingRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={{ color: '#E53935', fontWeight: 'bold' }}>● Recording... {recordDuration}s</Text>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <TouchableOpacity onPress={cancelRecording}><Text style={{ color: theme.textMuted }}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity onPress={stopRecording}><Text style={{ color: theme.primary, fontWeight: 'bold' }}>Stop</Text></TouchableOpacity>
              </View>
            </View>
          )}

          <View style={[styles.visibilityContainer, { borderTopColor: theme.border }]}>
            <Text style={{ color: theme.textMuted, marginBottom: 12, fontWeight: '600' }}>Who can see this?</Text>
            
            <TouchableOpacity style={styles.visibilityRow} onPress={() => setVisibility('public')}>
              <Globe color={visibility === 'public' ? theme.primary : theme.textMuted} size={20} />
              <Text style={[styles.visibilityText, { color: visibility === 'public' ? theme.primary : theme.textMuted, fontWeight: visibility === 'public' ? '700' : '400' }]}>
                Public — anyone on Qarota
              </Text>
              <View style={[styles.radio, { borderColor: visibility === 'public' ? theme.primary : theme.border }]}>
                {visibility === 'public' && <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.visibilityRow} onPress={() => setVisibility('followers')}>
              <Users color={visibility === 'followers' ? theme.primary : theme.textMuted} size={20} />
              <Text style={[styles.visibilityText, { color: visibility === 'followers' ? theme.primary : theme.textMuted, fontWeight: visibility === 'followers' ? '700' : '400' }]}>
                Followers only
              </Text>
              <View style={[styles.radio, { borderColor: visibility === 'followers' ? theme.primary : theme.border }]}>
                {visibility === 'followers' && <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.visibilityRow} onPress={() => setVisibility('private')}>
              <Lock color={visibility === 'private' ? theme.primary : theme.textMuted} size={20} />
              <Text style={[styles.visibilityText, { color: visibility === 'private' ? theme.primary : theme.textMuted, fontWeight: visibility === 'private' ? '700' : '400' }]}>
                Only me
              </Text>
              <View style={[styles.radio, { borderColor: visibility === 'private' ? theme.primary : theme.border }]}>
                {visibility === 'private' && <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />}
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={pickImage}>
              <Camera color={theme.text} size={24} style={{ marginBottom: 8 }} />
              <Text style={{ color: theme.text, fontWeight: '600' }}>Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={pickVideo}>
              <VideoIcon color={theme.text} size={24} style={{ marginBottom: 8 }} />
              <Text style={{ color: theme.text, fontWeight: '600' }}>Video</Text>
            </TouchableOpacity>

            {!audioRecorder.isRecording && !voiceUri && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={startRecording}>
                <Mic color={theme.text} size={24} style={{ marginBottom: 8 }} />
                <Text style={{ color: theme.text, fontWeight: '600' }}>Voice</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '700' },
  cancelBtn: { fontSize: 16 },
  postBtn: { fontSize: 16, fontWeight: '700' },
  body: { padding: 20 },
  input: { fontSize: 18, minHeight: 120, textAlignVertical: 'top' },
  previewContainer: { marginTop: 16, position: 'relative' },
  previewImage: { width: '100%', height: 250, borderRadius: 12, resizeMode: 'cover' },
  removeBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  voicePreview: { marginTop: 16, padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1 },
  recordingRow: { marginTop: 16, padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1 },
  visibilityContainer: { marginTop: 24, paddingTop: 16, borderTopWidth: 1 },
  visibilityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  visibilityText: { flex: 1, fontSize: 14, marginLeft: 12 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  actionsRow: { flexDirection: 'row', marginTop: 24, gap: 12 },
  actionBtn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  topicPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginRight: 8 },
});