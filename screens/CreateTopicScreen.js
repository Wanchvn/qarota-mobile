import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest } from '../lib/api';
import { useTheme } from '../lib/theme';

export default function CreateTopicScreen({ navigation }) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const createTopic = async () => {
    if (saving) return;
    setSaving(true);
    const result = await apiRequest('create_topic.php', {
      method: 'POST',
      json: { name: name.trim(), description: description.trim() },
    });
    setSaving(false);
    if (!result.success) {
      Alert.alert('Could not create topic', result.error || 'Please check the topic details.');
      return;
    }
    navigation.replace('TopicDetail', { topicName: result.topic.name });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Create a topic</Text>
      </View>
      <Text style={[styles.description, { color: theme.textMuted }]}>
        Topics are community-owned spaces. You will become the curator and can help keep the discussion on topic.
      </Text>
      <TextInput
        value={name}
        onChangeText={setName}
        maxLength={50}
        placeholder="Topic name"
        placeholderTextColor={theme.textMuted}
        autoCapitalize="words"
        style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
      />
      <TextInput
        value={description}
        onChangeText={setDescription}
        maxLength={280}
        placeholder="Description (optional)"
        placeholderTextColor={theme.textMuted}
        multiline
        textAlignVertical="top"
        style={[styles.input, styles.descriptionInput, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
      />
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.primary, opacity: saving ? 0.7 : 1 }]}
        disabled={saving}
        onPress={createTopic}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create topic</Text>}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 18, borderBottomWidth: 1 },
  title: { fontSize: 22, fontWeight: '800' },
  description: { margin: 18, lineHeight: 21 },
  input: { marginHorizontal: 16, marginBottom: 14, padding: 14, borderWidth: 1, borderRadius: 10, fontSize: 16 },
  descriptionInput: { minHeight: 110 },
  button: { margin: 16, marginTop: 4, padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
});
