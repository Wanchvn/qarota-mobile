import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as Haptics from 'expo-haptics'; 
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, Modal, 
  useWindowDimensions, Share, Dimensions, Pressable, ActivityIndicator 
} from 'react-native';
import { Image } from 'expo-image'; // <-- ADDED THIS
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { 
  Heart, MessageCircle, MoreHorizontal, Mic, Play, Bookmark, Share2, X, Download, Flag, Trash2, Pencil 
} from 'lucide-react-native'; 
import { timeAgo } from '../lib/timeAgo';
import { apiRequest, MEDIA_BASE, getAuthenticatedMediaSource, getAuthToken } from '../lib/api';
import { useTheme } from '../lib/theme';
import LikesModal from './LikesModal'; 

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PostCard({ post, isVisible, onLike, onComment, onProfilePress, onDelete, onTopicPress, onEdit, isMine, navigation }) {
  const theme = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false); 
  const [likesModalVisible, setLikesModalVisible] = useState(false); 
  const [isBookmarked, setIsBookmarked] = useState(post.is_bookmarked || false);
  const [isSaving, setIsSaving] = useState(false); 
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [videoLoadFailed, setVideoLoadFailed] = useState(false);

  const [isExpanded, setIsExpanded] = useState(false);
  const [showReadMore, setShowReadMore] = useState(false);

  const lastTap = useRef(null);
  const [showHeart, setShowHeart] = useState(false);

  const { width } = useWindowDimensions();
  const mediaHeight = width * 0.75; 

  const getMediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const cleanPath = path.replace(/^\//, '');
    return `${MEDIA_BASE}/${cleanPath}`;
  };

  const isImage = post.media_type === 'image' || post.media_type === 'photo';
  const isVideo = post.media_type === 'video';
  const isVoice = post.media_type === 'voice';

  const authToken = getAuthToken();
  const postMediaSource = useMemo(
    () => getAuthenticatedMediaSource(`media.php?kind=post&id=${encodeURIComponent(post.id)}`),
    [post.id, authToken]
  );
  const videoSource = isVideo ? postMediaSource : null;
  
  const videoPlayer = useVideoPlayer(videoSource, player => {
    player.loop = true;
    player.muted = true;
  });
  useEffect(() => {
    setImageLoadFailed(false);
    setVideoLoadFailed(false);
  }, [post.id]);

  useEffect(() => {
    const subscription = videoPlayer.addListener('statusChange', ({ status }) => {
      setVideoLoadFailed(status === 'error');
    });
    return () => subscription.remove();
  }, [videoPlayer]);

  useEffect(() => {
    if (videoSource && videoPlayer) {
      if (isVisible) {
        videoPlayer.play();
      } else {
        videoPlayer.pause();
      }
    }
  }, [isVisible, videoSource, videoPlayer]);

  const audioSource = isVoice ? postMediaSource : null;
  const audioPlayer = useAudioPlayer(audioSource);
  const audioStatus = useAudioPlayerStatus(audioPlayer);

  const handleDelete = () => {
    setMenuVisible(false);
    Alert.alert(
      "Delete Post",
      "Are you sure you want to permanently delete this post?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            const res = await apiRequest('post_delete.php', {
              method: 'POST',
              json: { post_id: post.id }
            });
            if (res.success) {
              onDelete(post.id);
            } else {
              Alert.alert('Error', res.error);
            }
          }
        }
      ]
    );
  };

  const playAudio = () => {
    if (audioPlayer) {
      audioPlayer.play();
    }
  };

  const toggleBookmark = async () => {
    const newState = !isBookmarked;
    setIsBookmarked(newState); 

    try {
      const res = await apiRequest('bookmark.php', {
        method: 'POST',
        json: { post_id: post.id }
      });
      
      if (!res.success) {
        setIsBookmarked(!newState); 
        Alert.alert('Error', 'Could not save post.');
      }
    } catch (e) {
      setIsBookmarked(!newState);
      Alert.alert('Error', 'Network error.');
    }
  };

  const onShare = async () => {
    try {
      const shareUrl = `https://qarota.com/post/${post.id}`; 
      await Share.share({
        message: `Check out this post by @${post.author.username} on Qarota!\n\n"${post.content || 'Photo/Video'}"\n\n${shareUrl}`,
      });
    } catch (error) {
      Alert.alert(error.message);
    }
  };

  const handleSaveImage = async () => {
    setMenuVisible(false);
    setIsSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        setIsSaving(false);
        return Alert.alert('Permission needed', 'Please allow Qarota to save photos to your gallery.');
      }

      const extension = post.media_path?.match(/\.(jpe?g|png|webp)$/i)?.[1]?.toLowerCase() || 'jpg';
      const fileUri = FileSystem.cacheDirectory + `qarota_${post.id}.${extension}`;
      const { uri } = await FileSystem.downloadAsync(postMediaSource.uri, fileUri, {
        headers: postMediaSource.headers,
      });
      
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Success', 'Image saved to your gallery!');
    } catch (error) {
      Alert.alert('Error', 'Could not save image.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReportPost = () => {
    setMenuVisible(false);
    Alert.alert(
      "Report Post",
      "Why are you reporting this post?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Spam", onPress: () => submitReport('spam') },
        { text: "Harassment", onPress: () => submitReport('harassment') },
        { text: "Misinformation", onPress: () => submitReport('misinformation') },
        { text: "Other", onPress: () => submitReport('other') }
      ]
    );
  };

  const submitReport = async (reason) => {
    try {
      const res = await apiRequest('report.php', {
        method: 'POST',
        json: { post_id: post.id, reason: reason, details: 'Reported from app' }
      });
      if (res.success) {
        Alert.alert('Reported', 'Thank you. Our moderators will review this post.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error.');
    }
  };

  const handleImagePress = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    
    if (lastTap.current && (now - lastTap.current) < DOUBLE_PRESS_DELAY) {
      if (!post.stats.liked_by_me) {
        handleLikePress(); 
      }
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800); 
    } else {
      lastTap.current = now;
      setTimeout(() => {
        if (lastTap.current === now) {
          setImageModalVisible(true); 
        }
      }, DOUBLE_PRESS_DELAY);
    }
  };

  const handleLikePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onLike();
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeft} onPress={onProfilePress}>
          {post.author.avatar ? (
            <Image
              source={{ uri: getMediaUrl(post.author.avatar) }} 
              style={styles.avatar} 
              contentFit="cover" 
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>{post.author.name.charAt(0)}</Text>
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={[styles.authorName, { color: theme.text }]}>
              {post.author.name}
              {post.author.is_verified && <Text style={styles.verifiedBadge}> ✓</Text>}
            </Text>
            <Text style={[styles.time, { color: theme.textMuted }]}>
              {timeAgo(post.created_at)}
              {post.edited_at && <Text style={{ fontStyle: 'italic' }}> · Edited</Text>}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuBtn} onPress={() => setMenuVisible(true)}>
          {isSaving ? <ActivityIndicator size="small" color={theme.primary} /> : <MoreHorizontal color={theme.textMuted} size={20} />}
        </TouchableOpacity>
      </View>

      {/* Content with Read More */}
      {post.content ? (
        <View style={{ marginBottom: 12 }}>
          <Text 
            style={[styles.content, { color: theme.text }]}
            numberOfLines={isExpanded ? undefined : 4}
            onTextLayout={(e) => {
              if (e.nativeEvent.lines.length > 4 && !isExpanded) {
                setShowReadMore(true);
              }
            }}
          >
            {post.content}
          </Text>
          {showReadMore && !isExpanded && (
            <TouchableOpacity onPress={() => setIsExpanded(true)} style={{ marginTop: 4 }}>
              <Text style={{ color: theme.primary, fontWeight: '600' }}>Read more</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {/* Render Topics */}
      {post.topics && post.topics.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {post.topics.map((topic, index) => (
            <TouchableOpacity 
              key={index}
              style={[styles.topicPill, { backgroundColor: theme.background, borderColor: theme.primary }]}
              onPress={() => onTopicPress && onTopicPress(topic)}
            >
              <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '600' }}>
                #{topic}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Image with Double Tap to Like */}
      {isImage && post.media_path ? (
        <Pressable onPress={handleImagePress} style={{ position: 'relative' }}>
          {imageLoadFailed ? (
            <View style={[styles.postImage, { height: mediaHeight, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ color: theme.textMuted }}>Media unavailable. Check your connection or sign in again.</Text>
            </View>
          ) : (
            <Image
              source={postMediaSource}
              style={[styles.postImage, { height: mediaHeight }]}
              contentFit="cover"
              onError={() => setImageLoadFailed(true)}
            />
          )}
          {showHeart && (
            <View style={StyleSheet.absoluteFillObject}>
              <View style={styles.heartOverlay}>
                <Heart color="#fff" fill={theme.primary} size={80} />
              </View>
            </View>
          )}
        </Pressable>
      ) : null}

      {/* Video */}
      {videoSource ? (
        <View style={[styles.postImage, { height: mediaHeight, overflow: 'hidden', position: 'relative' }]}>
          {videoLoadFailed ? (
            <Text style={{ color: theme.textMuted, textAlign: 'center', margin: 16 }}>
              Video unavailable. Check your connection or sign in again.
            </Text>
          ) : (
            <VideoView
              style={{ width: '100%', height: '100%' }}
              player={videoPlayer}
              allowsFullscreen
              allowsPictureInPicture
              nativeControls
            />
          )}
        </View>
      ) : null}

      {/* Voice Note */}
      {isVoice && audioSource ? (
        <TouchableOpacity 
          style={[styles.voiceContainer, { backgroundColor: theme.background }]} 
          onPress={playAudio}
        >
          <Mic color={theme.primary} size={20} style={{ marginRight: 12 }} />
          <Text style={{ color: theme.text, flex: 1, fontWeight: '600' }}>
            {audioStatus.error ? 'Voice note unavailable' : `Voice Note (${post.media_duration || 0}s)`}
          </Text>
          <Play color={theme.primary} size={16} fill={theme.primary} />
        </TouchableOpacity>
      ) : null}

      {/* Actions */}
      <View style={[styles.actions, { borderTopColor: theme.border }]}>
        
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleLikePress}>
            <Heart 
              color={post.stats.liked_by_me ? theme.primary : theme.textMuted} 
              fill={post.stats.liked_by_me ? theme.primary : 'transparent'} 
              size={18} 
              style={{ marginRight: 6 }}
            />
            <TouchableOpacity onPress={() => setLikesModalVisible(true)}>
              <Text style={[styles.actionText, { color: theme.textMuted }]}>{post.stats.likes}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionBtn} onPress={onComment}>
            <MessageCircle color={theme.textMuted} size={18} style={{ marginRight: 6 }} />
            <Text style={[styles.actionText, { color: theme.textMuted }]}>{post.stats.comments}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={onShare}>
            <Share2 color={theme.textMuted} size={18} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={{ padding: 4 }} onPress={toggleBookmark}>
          <Bookmark 
            color={isBookmarked ? theme.primary : theme.textMuted} 
            fill={isBookmarked ? theme.primary : 'transparent'} 
            size={20} 
          />
        </TouchableOpacity>

      </View>

      {/* FULL SCREEN IMAGE MODAL */}
      <Modal visible={imageModalVisible} transparent animationType="fade">
        <View style={styles.fullScreenContainer}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setImageModalVisible(false)}>
            <X color="#fff" size={32} />
          </TouchableOpacity>
          {imageLoadFailed ? (
            <Text style={{ color: '#fff' }}>Media unavailable. Check your connection or sign in again.</Text>
          ) : (
            <Image
              source={postMediaSource}
              style={styles.fullScreenImage}
              contentFit="contain"
              onError={() => setImageLoadFailed(true)}
            />
          )}
        </View>
      </Modal>

      {/* ACTION SHEET MODAL */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={[styles.actionSheet, { backgroundColor: theme.surface }]}>
            
            {isImage && (
              <TouchableOpacity style={[styles.sheetBtn, { borderBottomColor: theme.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }]} onPress={handleSaveImage}>
                <Download color={theme.text} size={18} />
                <Text style={[styles.sheetBtnText, { color: theme.text }]}>Save Image</Text>
              </TouchableOpacity>
            )}

            {isMine && (
              <>
                <TouchableOpacity style={[styles.sheetBtn, { borderBottomColor: theme.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }]} onPress={() => { setMenuVisible(false); if (onEdit) onEdit(); }}>
                  <Pencil color={theme.text} size={18} />
                  <Text style={[styles.sheetBtnText, { color: theme.text }]}>Edit Post</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.sheetBtn, { borderBottomColor: theme.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }]} onPress={handleDelete}>
                  <Trash2 color="#c0392b" size={18} />
                  <Text style={styles.sheetBtnTextDanger}>Delete Post</Text>
                </TouchableOpacity>
              </>
            )}

            {!isMine && (
              <TouchableOpacity style={[styles.sheetBtn, { borderBottomColor: theme.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }]} onPress={handleReportPost}>
                <Flag color="#E53935" size={18} />
                <Text style={[styles.sheetBtnTextDanger]}>Report Post</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.sheetBtn} onPress={() => setMenuVisible(false)}>
              <Text style={[styles.sheetBtnText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* LIKES MODAL */}
      <LikesModal 
        visible={likesModalVisible} 
        postId={post.id} 
        onClose={() => setLikesModalVisible(false)} 
        navigation={navigation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: '#E6E6E6' },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  headerText: { flex: 1 },
  authorName: { fontSize: 16, fontWeight: '700' },
  verifiedBadge: { color: '#4CAF50' },
  time: { fontSize: 12 },
  menuBtn: { padding: 8 },
  content: { fontSize: 15, lineHeight: 22 },
  topicPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, borderWidth: 1 },
  postImage: { width: '100%', borderRadius: 8, marginBottom: 16, backgroundColor: '#E6E6E6' },
  voiceContainer: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 16 },
  actions: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 12, justifyContent: 'space-between', alignItems: 'center' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 24 },
  actionText: { fontSize: 14, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  actionSheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 30, paddingTop: 10 },
  sheetBtn: { padding: 16, borderBottomWidth: 1, alignItems: 'center' },
  sheetBtnText: { fontSize: 16, fontWeight: '500' },
  sheetBtnTextDanger: { fontSize: 16, color: '#c0392b', fontWeight: '700' },
  fullScreenContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  fullScreenImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.8 },
  closeBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  heartOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 8 }
});