import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { apiRequest } from '../lib/api';
import { useTheme } from '../lib/theme';

export default function EditPostScreen({ route, navigation }) {
  const { post, onPostUpdated } = route.params;
  const theme = useTheme();
  
  const [content, setContent] = useState(post.content || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) {
      return Alert.alert('Empty post', 'Post content cannot be empty.');
    }

    setLoading(true);
    try {
      const res = await apiRequest('edit_post.php', {
        method: 'POST',
        json: { 
          post_id: post.id, 
          content: content.trim() 
        }
      });

      if (res.success) {
        if (onPostUpdated) onPostUpdated();
        navigation.goBack();
      } else {
        Alert.alert('Error', res.error || 'Failed to edit post.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Text style={{ color: theme.textMuted, fontSize: 16 }}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Edit Post</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading} style={{ padding: 4 }}>
          {loading ? (
            <ActivityIndicator color={theme.primary} size="small" />
          ) : (
            <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '700' }}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ padding: 20 }}>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={500}
            autoFocus
          />
          <Text style={[styles.counter, { color: content.length >= 500 ? '#E53935' : theme.textMuted }]}>
            {500 - content.length} characters left
          </Text>
        </View>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '700' },
  input: { 
    borderWidth: 1, 
    borderRadius: 12, 
    padding: 16, 
    fontSize: 16, 
    minHeight: 150, 
    textAlignVertical: 'top' 
  },
  counter: { textAlign: 'right', fontSize: 12, marginTop: 8 },
});