import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, 
  ActivityIndicator, KeyboardAvoidingView, Platform, Image, Alert, Modal 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Camera, Mic, Play, Pause, Square, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAudioRecorder, AudioModule, RecordingPresets, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { apiRequest, MEDIA_BASE, getAuthToken, API_BASE } from '../lib/api';
import { useTheme } from '../lib/theme';
import { timeAgo } from '../lib/timeAgo';

// --- AUDIO PLAYER COMPONENT ---
const AudioMessage = ({ uri, isMine, theme }) => {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player); // Tracks if it's playing or paused

  const handleTogglePlay = () => {
    try {
      if (status.playing) {
        player.pause();
      } else {
        player.play();
      }
    } catch (e) {
      Alert.alert("Error", "Could not play voice note.");
    }
  };

  return (
    <TouchableOpacity onPress={handleTogglePlay} style={{ flexDirection: 'row', alignItems: 'center', padding: 4 }}>
      <View style={{ backgroundColor: '#fff', padding: 8, borderRadius: 20, marginRight: 10 }}>
        {status.playing ? (
          <Pause color={theme.primary} size={16} fill={theme.primary} />
        ) : (
          <Play color={theme.primary} size={16} fill={theme.primary} />
        )}
      </View>
      <Text style={{ color: isMine ? '#fff' : theme.text, fontWeight: 'bold' }}>
        {status.playing ? 'Playing...' : 'Voice Note'}
      </Text>
    </TouchableOpacity>
  );
};
// ------------------------------
// -------------------------------------------------------------------

export default function ChatScreen({ route, navigation }) {
  const { id, name } = route.params;
  const theme = useTheme();
  const flatListRef = useRef();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [myId, setMyId] = useState(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [otherIsTyping, setOtherIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  
  // Image Viewer State
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImage, setViewerImage] = useState(null);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);

  const getMediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${MEDIA_BASE}/${path.replace(/^\//, '')}`;
  };

  const fetchMessages = async () => {
    try {
      const res = await apiRequest(`messages_fetch.php?conversation_id=${id}`);
      if (res.success) {
        setMessages(res.messages);
        setMyId(res.me);
        setOtherIsTyping(res.is_typing);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function prepareAudio() {
      try {
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      } catch (e) { console.log('Audio mode error:', e); }
    }
    prepareAudio();

    navigation.setOptions({ title: name });
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => {
      clearInterval(interval);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [id]);

  const handleTextChange = (val) => {
    setText(val);
    if (val.trim().length > 0 && !typingTimeoutRef.current) {
      apiRequest('set_typing.php', { method: 'POST', json: { conversation_id: id } }).catch(() => {});
      typingTimeoutRef.current = setTimeout(() => { typingTimeoutRef.current = null; }, 2000);
    }
  };

  const handleSendText = async () => {
    if (!text.trim() || sending) return;
    const tempText = text;
    setText(''); 
    setSending(true);

    const optimisticMessage = {
      id: Date.now().toString(),
      sender_id: myId,
      body: tempText,
      message_type: 'text', 
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const res = await apiRequest('message_send.php', {
        method: 'POST',
        json: { conversation_id: id, body: tempText }
      });
      if (res.success) fetchMessages();
      else {
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
        setText(tempText);
        Alert.alert('Error', res.error);
      }
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      setText(tempText);
    } finally {
      setSending(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return Alert.alert('Permission required', 'Allow access to photos.');

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });

      if (!result.canceled) {
        uploadMedia(result.assets[0].uri, 'image', 'image/jpeg');
      }
    } catch (error) {
      Alert.alert("Error", "Could not open gallery.");
    }
  };

  const startRecording = async () => {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) return Alert.alert('Permission required', 'Allow microphone access.');

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await new Promise(resolve => setTimeout(resolve, 200));

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
    } catch (err) {
      console.log("Recording Error:", err);
      Alert.alert('Recording Error', 'Could not start recording. Try again.');
    }
  };

  const stopRecording = async () => {
    try {
      await audioRecorder.stop();
      setIsRecording(false);
      if (audioRecorder.uri) {
        uploadMedia(audioRecorder.uri, 'voice', 'audio/m4a');
      }
    } catch (err) {
      setIsRecording(false);
    }
  };

  const uploadMedia = async (uri, type, mimeType) => {
    setUploadingMedia(true);
    
    let uriToUpload = uri;
    if (Platform.OS === 'ios' && uri.startsWith('file://')) {
      uriToUpload = uri.replace('file://', '/private');
    }

    const formData = new FormData();
    formData.append('conversation_id', id.toString());
    formData.append('type', type);
    formData.append('file', {
      uri: uriToUpload,
      name: type === 'image' ? 'photo.jpg' : 'voice.m4a',
      type: mimeType
    });

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/message_upload.php`);
    
    xhr.setRequestHeader('Authorization', `Bearer ${getAuthToken()}`);
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.onload = () => {
      setUploadingMedia(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.success) {
            fetchMessages();
          } else {
            Alert.alert('Upload Error', data.error || 'Failed to upload media.');
          }
        } catch (e) {
          Alert.alert('Error', 'Invalid response from server.');
        }
      } else {
        Alert.alert('Upload Error', `Server responded with status ${xhr.status}`);
      }
    };

    xhr.onerror = (e) => {
      setUploadingMedia(false);
      console.error('XHR Upload Error:', e);
      Alert.alert('Error', 'Network error during upload. Check your server connection.');
    };

    xhr.send(formData);
  };

  const handleLongPress = (message) => {
    if (message.sender_id !== myId || message.is_deleted) return;
    Alert.alert("Delete Message", "Delete this message?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          const res = await apiRequest('message_delete.php', { method: 'POST', json: { message_id: message.id } });
          if (res.success) {
            setMessages(prev => prev.map(m => m.id === message.id ? { ...m, body: 'Message deleted', is_deleted: true } : m));
          }
      }}
    ]);
  };

  const renderMessage = ({ item }) => {
    const isMine = item.sender_id === myId;
    const bubbleStyle = isMine ? [styles.bubble, styles.bubbleMine] : [styles.bubble, styles.bubbleTheirs];

    const msgType = item.message_type || item.type; 
    const isImage = msgType === 'image' || (item.body && item.body.match(/\.(jpeg|jpg|gif|png)$/i));
    const isVoice = msgType === 'voice' || (item.body && item.body.match(/\.(m4a|mp3|wav)$/i));

    return (
      <TouchableOpacity activeOpacity={0.8} onLongPress={() => handleLongPress(item)} style={bubbleStyle}>
        
        {isImage && !item.is_deleted ? (
          <TouchableOpacity onPress={() => {
            setViewerImage(getMediaUrl(item.body));
            setViewerVisible(true);
          }}>
            <Image source={{ uri: getMediaUrl(item.body) }} style={styles.messageImage} />
          </TouchableOpacity>
        ) : 
        
        isVoice && !item.is_deleted ? (
          <AudioMessage 
            uri={getMediaUrl(item.body)} 
            isMine={isMine} 
            theme={theme} 
          />
        ) : 
        
        (
          <Text style={[
            styles.msgText, 
            isMine ? styles.msgTextMine : { color: theme.text },
            item.is_deleted && { fontStyle: 'italic', opacity: 0.7 }
          ]}>
            {item.body}
          </Text>
        )}

        <Text style={[styles.time, isMine ? styles.timeMine : { color: theme.textMuted }]}>
          {timeAgo(item.created_at)}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
        
        {otherIsTyping && (
          <View style={styles.typingContainer}>
            <Text style={[styles.typingText, { color: theme.textMuted }]}>{name} is typing...</Text>
          </View>
        )}

        {uploadingMedia && (
          <View style={{ padding: 10, alignItems: 'center' }}>
             <ActivityIndicator size="small" color={theme.primary} />
             <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 4 }}>Uploading media...</Text>
          </View>
        )}

        <View style={[styles.inputRow, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          
          <TouchableOpacity onPress={handlePickImage} disabled={isRecording} style={styles.iconBtn}>
            <Camera color={theme.textMuted} size={24} />
          </TouchableOpacity>

          <TouchableOpacity onPress={isRecording ? stopRecording : startRecording} style={styles.iconBtn}>
            {isRecording ? <Square color="#E53935" size={24} fill="#E53935" /> : <Mic color={theme.textMuted} size={24} />}
          </TouchableOpacity>

          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
            placeholder={isRecording ? "Recording..." : "Message..."}
            placeholderTextColor={isRecording ? "#E53935" : theme.textMuted}
            value={text}
            onChangeText={handleTextChange}
            multiline
            editable={!isRecording}
          />
          
          <TouchableOpacity style={styles.sendBtn} onPress={handleSendText} disabled={sending || !text.trim()}>
            {sending ? <ActivityIndicator color={theme.primary} size="small" /> : <Send color={theme.primary} size={24} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* FULL SCREEN IMAGE VIEWER MODAL */}
      <Modal visible={viewerVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity 
            style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 }}
            onPress={() => setViewerVisible(false)}
          >
            <X color="#fff" size={32} />
          </TouchableOpacity>
          
          {viewerImage && (
            <Image 
              source={{ uri: viewerImage }} 
              style={{ width: '100%', height: '80%' }} 
              resizeMode="contain" 
            />
          )}
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 20 },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 12 },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: '#C65D3B', borderBottomRightRadius: 4 },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: '#E6E6E6', borderBottomLeftRadius: 4 },
  msgText: { fontSize: 16, lineHeight: 22 },
  msgTextMine: { color: '#fff' },
  messageImage: { width: 200, height: 200, borderRadius: 8, marginBottom: 4, resizeMode: 'cover' },
  time: { fontSize: 11, marginTop: 4, textAlign: 'right' },
  timeMine: { color: 'rgba(255,255,255,0.7)' },
  typingContainer: { paddingHorizontal: 16, paddingVertical: 8 },
  typingText: { fontSize: 13, fontStyle: 'italic' },
  inputRow: { flexDirection: 'row', padding: 12, borderTopWidth: 1, alignItems: 'center' },
  iconBtn: { padding: 8, marginRight: 4 },
  input: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100 },
  sendBtn: { marginLeft: 8, padding: 8, minWidth: 44, alignItems: 'center' },
});