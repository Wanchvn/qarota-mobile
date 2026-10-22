import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, Image, TouchableOpacity, Alert, 
  ActivityIndicator, Platform, Dimensions, Animated, PanResponder, Modal 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient'; // <-- Make sure to install this
import { apiRequest, MEDIA_BASE, getAuthenticatedMediaSource } from '../lib/api';
import { ShieldCheck, Settings, Heart, X, RotateCcw } from 'lucide-react-native'; 
import { useTheme } from '../lib/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH;
const SWIPE_OUT_DURATION = 250;

export default function DatingScreen({ navigation }) {
  const theme = useTheme();
  
  const [candidate, setCandidate] = useState(null);
  const [nextCandidate, setNextCandidate] = useState(null); // For the card stack effect
  const [loading, setLoading] = useState(true);
  const [matchData, setMatchData] = useState(null);
  const position = useRef(new Animated.ValueXY()).current;
  const getCandidateImageSource = (profile) => {
    if (profile?.primary_photo_id) {
      return getAuthenticatedMediaSource(`media.php?kind=dating_photo&id=${encodeURIComponent(profile.primary_photo_id)}`);
    }
    if (!profile?.avatar) return null;
    return { uri: profile.avatar.startsWith('http') ? profile.avatar : `${MEDIA_BASE}/${profile.avatar}` };
  };

  const fetchNext = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    position.setValue({ x: 0, y: 0 }); 
    
    try {
      const res = await apiRequest('dating_next.php');
      if (res.success && res.candidate) {
        if (candidate) {
          // If we already have a candidate, move it to the background
          setNextCandidate(candidate);
          setCandidate(res.candidate);
        } else {
          setCandidate(res.candidate);
        }
      } else {
        setCandidate(null);
        setNextCandidate(null);
        if (!res.success && res.error) {
          Alert.alert('Dating unavailable', res.error);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Reset state when coming back to the tab
      setCandidate(null);
      setNextCandidate(null);
      fetchNext(true);
    });
    return unsubscribe;
  }, [navigation]);

  const forceSwipe = (direction) => {
    const x = direction === 'right' ? SCREEN_WIDTH + 100 : -SCREEN_WIDTH - 100;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: false, // Must be false for layout/rotate interpolation
    }).start(() => onSwipeComplete(direction));
  };

  const onSwipeComplete = async (direction) => {
    const action = direction === 'right' ? 'like' : 'pass';
    const targetId = candidate.user_id;

    // Immediately load the next card
    setCandidate(nextCandidate);
    setNextCandidate(null);
    fetchNext();

    try {
      const res = await apiRequest('dating_swipe.php', {
        method: 'POST',
        json: { target_id: targetId, action }
      });

      if (res.success && res.matched) {
        setMatchData(res.match);
      } else if (!res.success) {
        Alert.alert('Error', res.error);
      }
    } catch (e) {
      console.error("Swipe error", e);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (evt, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          forceSwipe('right');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          forceSwipe('left');
        } else {
          Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  // --- Animations ---
  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
    outputRange: ['-30deg', '0deg', '30deg'],
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_WIDTH / 4],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 4, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Card tilt based on swipe position
  const nextCardScale = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [1, 0.95, 1],
    extrapolate: 'clamp',
  });

  if (loading) {
    return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.header }]}>
        <Text style={[styles.logo, { color: theme.headerText }]}>Qarota Dating</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          <TouchableOpacity onPress={() => navigation.navigate('DatingMatches')}>
            <Heart color={theme.headerText} size={24} fill={theme.headerText} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('DatingProfile')}>
            <Settings color={theme.headerText} size={24} />
          </TouchableOpacity>
        </View>
      </View>

      {!candidate ? (
        // EMPTY STATE
        <View style={[styles.center, { backgroundColor: theme.background }]}>
          <View style={[styles.emptyIconBg, { backgroundColor: theme.primary + '20' }]}>
            <Heart color={theme.primary} size={60} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>You're all caught up</Text>
          <Text style={[styles.emptySub, { color: theme.textMuted }]}>No more profiles in your area right now. Check back later!</Text>
          <TouchableOpacity style={[styles.refreshBtn, { backgroundColor: theme.primary }]} onPress={() => fetchNext(true)}>
            <RotateCcw color="#fff" size={20} style={{ marginRight: 8 }} />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.deckArea}>
          
          {/* NEXT CARD (Background Stack Effect) */}
          {nextCandidate && (
            <Animated.View style={[styles.card, { transform: [{ scale: nextCardScale }], backgroundColor: theme.surface }]}>
               <Image 
                source={getCandidateImageSource(nextCandidate)}
                style={styles.image} 
              />
            </Animated.View>
          )}

          {/* CURRENT CARD */}
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.card, 
              { 
                backgroundColor: theme.surface,
                transform: [{ translateX: position.x }, { rotate }] 
              }
            ]}
          >
            {/* LIKE / NOPE Stamps */}
            <Animated.View style={[styles.overlayLabel, styles.likeLabel, { opacity: likeOpacity }]}>
              <Text style={styles.likeText}>LIKE</Text>
            </Animated.View>
            <Animated.View style={[styles.overlayLabel, styles.nopeLabel, { opacity: nopeOpacity }]}>
              <Text style={styles.nopeText}>NOPE</Text>
            </Animated.View>

            {/* Candidate Image */}
            <Image 
              source={getCandidateImageSource(candidate)}
              style={styles.image} 
            />

            {/* Gradient Overlay & Info */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.85)']}
              style={styles.gradientOverlay}
            >
              <View style={styles.infoBlock}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.name}>{candidate.name}, {candidate.age}</Text>
                  {candidate.is_verified && (
                    <ShieldCheck color={theme.primary} size={22} style={{ marginLeft: 8 }} />
                  )}
                </View>
                {candidate.location ? <Text style={styles.detail}>{candidate.location}</Text> : null}
                {candidate.bio ? <Text style={styles.bio} numberOfLines={3}>{candidate.bio}</Text> : null}
              </View>
            </LinearGradient>
          </Animated.View>

          {/* ACTION BUTTONS */}
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: theme.surface }]} 
              onPress={() => forceSwipe('left')}
            >
              <X color="#E53935" size={32} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: theme.surface }]} 
              onPress={() => forceSwipe('right')}
            >
              <Heart color={theme.primary} size={32} fill={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* MATCH MODAL */}
      <Modal visible={!!matchData} transparent animationType="fade">
        <View style={styles.matchOverlay}>
          <View style={[styles.matchCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.matchTitle, { color: theme.primary }]}>It's a Match! 🎉</Text>
            <Text style={[styles.matchSub, { color: theme.textMuted }]}>You and {candidate?.name} liked each other.</Text>
            
            <TouchableOpacity 
              style={[styles.matchBtn, { backgroundColor: theme.primary }]}
              onPress={() => {
                const convId = matchData.conversation_id;
                setMatchData(null);
                navigation.navigate('Chat', { id: convId, name: candidate?.name, avatar: candidate?.avatar });
              }}
            >
              <Text style={styles.matchBtnText}>Send a Message</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.matchCancel} onPress={() => setMatchData(null)}>
              <Text style={[styles.matchCancelText, { color: theme.textMuted }]}>Keep Swiping</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  header: { paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo: { fontSize: 22, fontWeight: '800' },
  
  deckArea: { flex: 1, alignItems: 'center', marginTop: 20, paddingBottom: 100 },
  card: {
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_HEIGHT * 0.65,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8,
    position: 'absolute',
  },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  
  gradientOverlay: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    height: '50%',
    justifyContent: 'flex-end',
    padding: 20,
    paddingBottom: 30,
  },
  infoBlock: { width: '100%' },
  name: { fontSize: 28, fontWeight: '800', color: '#fff' },
  detail: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  bio: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 8, lineHeight: 20 },

  overlayLabel: { position: 'absolute', top: 40, zIndex: 10, borderWidth: 4, borderRadius: 8, padding: 10 },
  likeLabel: { left: 30, borderColor: '#4CAF50', transform: [{ rotate: '-15deg' }] },
  likeText: { color: '#4CAF50', fontSize: 36, fontWeight: '900', textTransform: 'uppercase' },
  nopeLabel: { right: 30, borderColor: '#E53935', transform: [{ rotate: '15deg' }] },
  nopeText: { color: '#E53935', fontSize: 36, fontWeight: '900', textTransform: 'uppercase' },

  actions: { 
    flexDirection: 'row', 
    position: 'absolute', 
    bottom: 20, 
    justifyContent: 'space-evenly', 
    width: '100%' 
  },
  actionBtn: { 
    width: 70, height: 70, borderRadius: 35, 
    alignItems: 'center', justifyContent: 'center', 
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 5 
  },

  emptyIconBg: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  emptySub: { fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  refreshBtn: { flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  refreshText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  matchOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  matchCard: { width: '85%', borderRadius: 24, padding: 32, alignItems: 'center' },
  matchTitle: { fontSize: 32, fontWeight: '900', marginBottom: 8 },
  matchSub: { fontSize: 16, marginBottom: 32, textAlign: 'center' },
  matchBtn: { width: '100%', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  matchBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  matchCancel: { padding: 8 },
  matchCancelText: { fontSize: 15, fontWeight: '500' },
});