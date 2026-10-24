import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, 
  ActivityIndicator, KeyboardAvoidingView, Platform, Image, Alert, Modal 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Camera, Mic, Play, Pause, Square, X, Users } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAudioRecorder, AudioModule, RecordingPresets, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { apiRequest, getAuthToken, API_BASE, getAuthenticatedMediaSource } from '../lib/api';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTheme } from '../lib/theme';
import { timeAgo } from '../lib/timeAgo';
import { useAppContext } from '../lib/AppContext';

const MEDIA_BASE = API_BASE.replace('/api', '');

// --- AUDIO PLAYER COMPONENT ---
const AudioMessage = ({ messageId, isMine, theme }) => {
  const authToken = getAuthToken();
  const source = useMemo(
    () => getAuthenticatedMediaSource(`media.php?kind=message&id=${encodeURIComponent(messageId)}`),
    [messageId, authToken]
  );
  const player = useAudioPlayer(source);
  const status = useAudioPlayerStatus(player);

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
        {status.error ? 'Voice note unavailable' : status.playing ? 'Playing...' : 'Voice Note'}
      </Text>
    </TouchableOpacity>
  );
};

// --- VIDEO MESSAGE COMPONENT ---
const VideoMessage = ({ messageId, lowDataMode }) => {
  const authToken = getAuthToken();
  const source = useMemo(
    () => getAuthenticatedMediaSource(`media.php?kind=message&id=${encodeURIComponent(messageId)}`),
    [messageId, authToken]
  );
  const [loaded, setLoaded] = useState(lowDataMode === false);
  if (!loaded) {
    return (
      <TouchableOpacity onPress={() => setLoaded(true)} style={styles.loadVideoButton}>
        <Text style={{ color: '#fff', fontWeight: '600' }}>Tap to load video</Text>
      </TouchableOpacity>
    );
  }
  return <LoadedVideoMessage source={source} />;
};

const LoadedVideoMessage = ({ source }) => {
  const player = useVideoPlayer(source);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const subscription = player.addListener('statusChange', ({ status }) => {
      setFailed(status === 'error');
    });
    return () => subscription.remove();
  }, [player]);

  if (failed) {
    return <Text style={{ color: '#888' }}>Video unavailable. Check your connection or sign in again.</Text>;
  }

  return (
    <VideoView
      player={player}
      style={{ width: 240, height: 180, borderRadius: 8, overflow: 'hidden' }}
      nativeControls
      allowsFullscreen
    />
  );
};

export default function ChatScreen({ route, navigation }) {
  // Extract avatar and username from params
  const { id, name, isGroup, avatar, username } = route.params || { id: null, name: 'Chat', isGroup: false, avatar: null, username: null }; 
  
  const theme = useTheme();
  const { lowDataMode } = useAppContext();
  const flatListRef = useRef();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [myId, setMyId] = useState(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messageError, setMessageError] = useState('');
  const [otherIsTyping, setOtherIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImage, setViewerImage] = useState(null);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);

  const getMediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${MEDIA_BASE}/${path.replace(/^\//, '')}`;
  };

  const getMessageMediaSource = (message) => getAuthenticatedMediaSource(
    `media.php?kind=message&id=${encodeURIComponent(message.id)}`
  );

  const fetchMessages = async () => {
    try {
      const res = await apiRequest(`messages_fetch.php?conversation_id=${id}`);
      if (res.success) {
        setMessages(res.messages);
        setMyId(res.me);
        setOtherIsTyping(res.is_typing);
        setMessageError('');
      } else {
        setMessageError(res.error || 'Could not load messages.');
      }
    } catch (e) {
      console.error(e);
      setMessageError('Network error. Could not load messages.');
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

    // CUSTOM CLICKABLE HEADER
    navigation.setOptions({
      headerTitle: () => (
        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'center' }}
          onPress={() => {
            if (!isGroup && username) {
              navigation.navigate('Profile', { username });
            }
          }}
          disabled={isGroup || !username}
        >
          {!isGroup && avatar ? (
            <Image 
              source={{ uri: getMediaUrl(avatar) }} 
              style={{ width: 34, height: 34, borderRadius: 17, marginRight: 10 }} 
            />
          ) : !isGroup && name ? (
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>{name.charAt(0)}</Text>
            </View>
          ) : null}
          
          <Text style={{ color: theme.headerText || '#fff', fontSize: 18, fontWeight: '700' }}>
            {name || 'Chat'}
          </Text>
        </TouchableOpacity>
      ),
      headerRight: isGroup ? () => (
        <TouchableOpacity
          accessibilityLabel="Group details"
          onPress={() => navigation.navigate('GroupDetails', { id, name })}
          style={{ paddingHorizontal: 8 }}
        >
          <Users color={theme.headerText || '#fff'} size={22} />
        </TouchableOpacity>
      ) : undefined,
    });
    
    const initialFetch = setTimeout(fetchMessages, 0);
    const interval = setInterval(fetchMessages, 3000);
    return () => {
      clearTimeout(initialFetch);
      clearInterval(interval);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [id, isGroup, name, navigation, theme.headerText, avatar, username]);

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
          } else {
            Alert.alert('Could not delete message', res.error || 'Please try again.');
          }
      }}
    ]);
  };

  const handleReact = (message) => {
    if (message.is_deleted || (message.message_type || message.type) === 'system') return;
    const emojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
    Alert.alert('React to message', 'Choose a reaction. Tap the same reaction again to remove it.', [
      ...emojis.map((emoji) => ({
        text: emoji,
        onPress: async () => {
          const result = await apiRequest('message_react.php', {
            method: 'POST',
            json: { message_id: message.id, emoji },
          });
          if (result.success) {
            setMessages((current) => current.map((item) => (
              item.id === message.id ? { ...item, reactions: result.reactions } : item
            )));
          } else {
            Alert.alert('Reaction failed', result.error || 'Could not update the reaction.');
          }
        },
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const renderMessage = ({ item }) => {
    const isMine = item.sender_id === myId;
    const msgType = item.message_type || item.type; 
    const mediaSource = !item.is_deleted && ['image', 'voice', 'video'].includes(msgType)
      ? getMessageMediaSource(item)
      : null;
    const isImage = msgType === 'image' || (item.body && item.body.match(/\.(jpeg|jpg|gif|png)$/i));
    const isVoice = msgType === 'voice' || (item.body && item.body.match(/\.(m4a|mp3|wav)$/i));
    const isVideo = msgType === 'video';

    const senderAvatar = item.sender_avatar;
    const senderName = item.sender_name || 'User';

    return (
      <View style={[styles.messageRow, isMine ? styles.rowRight : styles.rowLeft]}>
        
        {/* Clickable Avatar for other user */}
        {!isMine && (
          <TouchableOpacity 
            style={styles.avatarWrapper}
            onPress={() => {
              if (item.sender_username) {
                navigation.navigate('Profile', { username: item.sender_username });
              }
            }}
          >
            {senderAvatar ? (
              <Image source={{ uri: getMediaUrl(senderAvatar) }} style={styles.chatAvatar} />
            ) : (
              <View style={[styles.chatAvatarPlaceholder, { backgroundColor: theme.primary }]}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{senderName.charAt(0)}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          activeOpacity={0.8} 
          onLongPress={() => handleLongPress(item)} 
          style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}
        >
          {isGroup && !isMine && msgType !== 'system' && item.sender_name ? (
            <Text style={[styles.senderName, { color: theme.primary }]} numberOfLines={1}>
              {item.sender_name}
            </Text>
          ) : null}

          {isImage && !item.is_deleted ? (
            <TouchableOpacity onPress={() => {
              setViewerImage(mediaSource);
              setViewerVisible(true);
            }}>
              <Image
                source={mediaSource}
                style={styles.messageImage}
                onError={() => Alert.alert('Media unavailable', 'This image could not be loaded.')}
              />
            </TouchableOpacity>
          ) : 
          
          isVoice && !item.is_deleted ? (
            <AudioMessage messageId={item.id} isMine={isMine} theme={theme} />
          ) : 
          
          isVideo && !item.is_deleted ? (
            <VideoMessage key={`${item.id}-${lowDataMode}`} messageId={item.id} lowDataMode={lowDataMode} />
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
          {!item.is_deleted && msgType !== 'system' && (
            <View style={styles.reactionsRow}>
              {(item.reactions || []).map((reaction) => (
                <TouchableOpacity
                  key={reaction.emoji}
                  onPress={() => handleReact(item)}
                  style={[styles.reactionChip, reaction.mine && styles.myReactionChip]}
                >
                  <Text style={styles.reactionText}>{reaction.emoji} {reaction.count}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => handleReact(item)} style={styles.addReaction}>
                <Text style={{ color: isMine ? '#fff' : theme.textMuted }}>+</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </View>
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
        {messageError ? (
          <Text style={{ color: '#E53935', paddingHorizontal: 16, paddingBottom: 8 }}>
            {messageError}
          </Text>
        ) : null}
        
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
              source={viewerImage}
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
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12, maxWidth: '100%' },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  avatarWrapper: { marginRight: 8, marginBottom: 2 },
  chatAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E6E6E6' },
  chatAvatarPlaceholder: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '75%', padding: 12, borderRadius: 16 },
  bubbleMine: { backgroundColor: '#C65D3B', borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: '#E6E6E6', borderBottomLeftRadius: 4 },
  senderName: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  msgText: { fontSize: 16, lineHeight: 22 },
  msgTextMine: { color: '#fff' },
  messageImage: { width: 200, height: 200, borderRadius: 8, marginBottom: 4, resizeMode: 'cover' },
  time: { fontSize: 11, marginTop: 4, textAlign: 'right' },
  timeMine: { color: 'rgba(255,255,255,0.7)' },
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5, marginTop: 5 },
  reactionChip: { backgroundColor: 'rgba(127,127,127,0.18)', borderRadius: 12, paddingHorizontal: 7, paddingVertical: 3 },
  myReactionChip: { borderWidth: 1, borderColor: '#8EA7FF' },
  reactionText: { fontSize: 12 },
  addReaction: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(127,127,127,0.18)' },
  typingContainer: { paddingHorizontal: 16, paddingVertical: 8 },
  typingText: { fontSize: 13, fontStyle: 'italic' },
  inputRow: { flexDirection: 'row', padding: 12, borderTopWidth: 1, alignItems: 'center' },
  iconBtn: { padding: 8, marginRight: 4 },
  input: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100 },
  sendBtn: { marginLeft: 8, padding: 8, minWidth: 44, alignItems: 'center' },
  loadVideoButton: { width: 240, height: 180, borderRadius: 8, backgroundColor: '#444', alignItems: 'center', justifyContent: 'center' },
});