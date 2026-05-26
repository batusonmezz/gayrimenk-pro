import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';

export default function ResearchScreen({ navigation }: any) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const runResearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult('');
    try {
      const { hukukArastir } = await import('../services/anthropic');
      const res = await hukukArastir(query);
      setResult(res);
    } catch {
      setResult('Hata oluştu, lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hukuk Araştırma</Text>
      </View>
      <ScrollView style={styles.content} scrollEnabled={true} nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
        <View style={styles.queryBox}>
          <Text style={styles.queryLabel}>ARAŞTIRMA KONUSU</Text>
          <TextInput
            style={styles.queryInput}
            placeholder="Örn: 2026 kira artış oranı sınırı nedir?"
            placeholderTextColor="#bbb"
            value={query}
            onChangeText={setQuery}
            multiline
            numberOfLines={3}
          />
        </View>
        <TouchableOpacity style={styles.researchBtn} onPress={runResearch} disabled={loading} activeOpacity={0.8}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.researchBtnText}>🔍 Mevzuat Araştır</Text>}
        </TouchableOpacity>
        {result ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>✓ Araştırma Sonucu</Text>
            <Text style={styles.resultText}>{result}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0', overflow: 'auto' as any },
  header: { backgroundColor: '#fff', paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 0.5, borderBottomColor: '#e0e0e0' },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 28, color: '#555', lineHeight: 32 },
  headerTitle: { fontSize: 16, fontWeight: '500', color: '#1a1a1a' },
  content: { flex: 1, padding: 12 },
  queryBox: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 10, borderWidth: 0.5, borderColor: '#e0e0e0', overflow: 'hidden' },
  queryLabel: { fontSize: 11, letterSpacing: 1.5, color: '#888', fontWeight: '500', padding: 12, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  queryInput: { padding: 12, fontSize: 14, color: '#1a1a1a', minHeight: 80, textAlignVertical: 'top' },
  researchBtn: { backgroundColor: '#1a2e1a', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 10 },
  researchBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  resultCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: '#e0e0e0', marginBottom: 32 },
  resultTitle: { fontSize: 13, fontWeight: '500', color: '#0f6e56', marginBottom: 10 },
  resultText: { fontSize: 13, lineHeight: 22, color: '#444' },
});
