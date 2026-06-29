import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme';

export default function ResearchScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);

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
            placeholderTextColor={colors.placeholder}
            value={query}
            onChangeText={setQuery}
            multiline
            numberOfLines={3}
          />
        </View>
        <TouchableOpacity style={styles.researchBtn} onPress={runResearch} disabled={loading} activeOpacity={0.8}>
          {loading ? <ActivityIndicator color={colors.textOnPrimary} /> : <Text style={styles.researchBtnText}>🔍 Mevzuat Araştır</Text>}
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

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, overflow: 'auto' as any },
  header: { backgroundColor: colors.surface, paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 28, color: colors.textSecondary, lineHeight: 32 },
  headerTitle: { fontSize: 16, fontWeight: '500', color: colors.text },
  content: { flex: 1, padding: 12 },
  queryBox: { backgroundColor: colors.surface, borderRadius: 12, marginBottom: 10, borderWidth: 0.5, borderColor: colors.border, overflow: 'hidden' },
  queryLabel: { fontSize: 11, letterSpacing: 1.5, color: colors.textMuted, fontWeight: '500', padding: 12, borderBottomWidth: 0.5, borderBottomColor: colors.surfaceSubtle },
  queryInput: { padding: 12, fontSize: 14, color: colors.text, minHeight: 80, textAlignVertical: 'top' },
  researchBtn: { backgroundColor: isDark ? colors.primaryAccent : colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 10 },
  researchBtnText: { color: colors.textOnPrimary, fontSize: 15, fontWeight: '500' },
  resultCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: colors.border, marginBottom: 32 },
  resultTitle: { fontSize: 13, fontWeight: '500', color: colors.primaryAccent, marginBottom: 10 },
  resultText: { fontSize: 13, lineHeight: 22, color: colors.textSecondary },
});
