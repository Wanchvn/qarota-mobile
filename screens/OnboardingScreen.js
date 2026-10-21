import React, { useState, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  useWindowDimensions, Image 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShieldCheck, Globe, Megaphone, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../lib/theme';

const SLIDES = [
  {
    id: '1',
    icon: <ShieldCheck color="#C65D3B" size={100} />,
    title: 'Your Data Stays Home',
    description: 'Qarota is built in Ghana, for Africa. Your data lives on our local servers and is never sold to third parties.'
  },
  {
    id: '2',
    icon: <Globe color="#C65D3B" size={100} />,
    title: 'Your Language is First-Class',
    description: 'Speak your mind in Twi, Dagbani, English, or French. Qarota celebrates African languages, not as an afterthought, but by default.'
  },
  {
    id: '3',
    icon: <Megaphone color="#C65D3B" size={100} />,
    title: 'No Silent Bans',
    description: 'Every moderation action on Qarota is public and logged. You will always know why a post was removed, and who made the decision.'
  }
];

export default function OnboardingScreen({ onFinish }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef();

  const handleNext = async () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToOffset({ offset: width * (currentIndex + 1), animated: true });
    } else {
      // Mark as completed and finish
      await AsyncStorage.setItem('@qarota_onboarded', 'true');
      onFinish();
    }
  };

  const handleScroll = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      
      {/* SKIP BUTTON */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={async () => {
            await AsyncStorage.setItem('@qarota_onboarded', 'true');
            onFinish();
          }}
        >
          <Text style={{ color: theme.textMuted, fontSize: 16, fontWeight: '600' }}>Skip</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={styles.iconContainer}>
              {item.icon}
            </View>
            <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
            <Text style={[styles.description, { color: theme.textMuted }]}>{item.description}</Text>
          </View>
        )}
      />

      {/* PAGINATION DOTS */}
      <View style={styles.pagination}>
        {SLIDES.map((_, index) => (
          <View 
            key={index} 
            style={[
              styles.dot, 
              { 
                backgroundColor: currentIndex === index ? theme.primary : theme.border,
                width: currentIndex === index ? 24 : 8
              }
            ]} 
          />
        ))}
      </View>

      {/* NEXT / GET STARTED BUTTON */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.nextBtn, { backgroundColor: theme.primary }]} 
          onPress={handleNext}
        >
          <Text style={styles.nextBtnText}>
            {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          {currentIndex !== SLIDES.length - 1 && (
            <ChevronRight color="#fff" size={20} style={{ marginLeft: 8 }} />
          )}
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, alignItems: 'flex-end' },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  iconContainer: { marginBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  description: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
  
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  dot: { height: 8, borderRadius: 4, marginHorizontal: 4 },
  
  footer: { paddingHorizontal: 32, paddingBottom: 20 },
  nextBtn: { flexDirection: 'row', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  nextBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});