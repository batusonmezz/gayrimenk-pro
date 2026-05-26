import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { sozlesmeKaydet, sozlesmeGuncelle } from '../services/storage';
import { VARSAYILAN_OZEL_MADDELER, VARSAYILAN_GENEL_MADDELER } from '../constants/prompts';

export default function PreviewScreen({ navigation, route }: any) {
  const { sozlesme, title, formData, kayitId } = route.params;
  const insets = useSafeAreaInsets();
  const fotograflar = route.params?.fotograflar || {};
  const esyaListesi: { ad: string; marka: string; adet: string }[] = route.params?.esyaListesi || [];
  const esyaVar = formData?.simdiki_durum === 'Eşyalı' && esyaListesi.length > 0;
  const [currentSozlesme, setCurrentSozlesme] = useState(sozlesme);
  const [ozelMaddeler, setOzelMaddeler] = useState<string[]>(
    route.params?.ozelMaddeler?.length > 0
      ? route.params.ozelMaddeler
      : VARSAYILAN_OZEL_MADDELER(formData || {})
  );
  const [genelMaddeler, setGenelMaddeler] = useState<string[]>(
    route.params?.genelMaddeler?.length > 0
      ? route.params.genelMaddeler
      : VARSAYILAN_GENEL_MADDELER(esyaVar, formData)
  );
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([{ role: 'ai', text: 'Sözleşmeyi inceledim. "özel koşullar" veya "genel koşullar" belirterek değişiklik yapabilirsiniz.' }]);
  const [loading, setLoading] = useState(false);

  const sendChat = async () => {
    if (!chatInput.trim() || loading) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);
    try {
      const { maddeleriDuzenle } = await import('../services/anthropic');
      const bolum = userMsg.toLowerCase().includes('genel') ? 'genel' : 'ozel';
      if (bolum === 'genel') {
        const yeniMaddeler = await maddeleriDuzenle(genelMaddeler, userMsg);
        setGenelMaddeler(yeniMaddeler);
        setMessages(prev => [...prev, { role: 'ai', text: `✓ Genel koşullar güncellendi. ${yeniMaddeler.length} madde var.` }]);
      } else {
        const yeniMaddeler = await maddeleriDuzenle(ozelMaddeler, userMsg);
        setOzelMaddeler(yeniMaddeler);
        setMessages(prev => [...prev, { role: 'ai', text: `✓ Özel koşullar güncellendi. ${yeniMaddeler.length} madde var.` }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Hata oluştu, tekrar deneyin.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handlePDF = async () => {
    console.log('Platform:', Platform.OS);
    console.log('handlePDF çağrıldı');
    const { generateKiraSozlesmesiHTML } = await import('../services/pdfTemplate');
    const html = generateKiraSozlesmesiHTML(formData, ozelMaddeler, genelMaddeler, fotograflar, esyaListesi);

    if (Platform.OS === 'web') {
      const yeniPencere = window.open('', '_blank');
      if (yeniPencere) {
        yeniPencere.document.write(html);
        yeniPencere.document.close();
        yeniPencere.focus();
        setTimeout(() => { yeniPencere.print(); }, 500);
      }
      if (kayitId) {
        await sozlesmeGuncelle(kayitId, formData, JSON.stringify(ozelMaddeler), ozelMaddeler, genelMaddeler, fotograflar, esyaListesi);
      } else {
        await sozlesmeKaydet({
          tur: title,
          kiraci_ad: formData?.kiraci_ad || '',
          kiraya_veren_ad: formData?.kiraya_veren_ad || '',
          aylik_kira: formData?.aylik_kira || '',
          formData: formData || {},
          sozlesmeMetni: JSON.stringify(ozelMaddeler),
          ozelMaddeler,
          genelMaddeler,
          fotograflar,
          esyaListesi,
        });
      }
      navigation.navigate('Home');
      return;
    }

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      if (kayitId) {
        await sozlesmeGuncelle(kayitId, formData, JSON.stringify(ozelMaddeler), ozelMaddeler, genelMaddeler, fotograflar, esyaListesi);
      } else {
        await sozlesmeKaydet({
          tur: title,
          kiraci_ad: formData?.kiraci_ad || '',
          kiraya_veren_ad: formData?.kiraya_veren_ad || '',
          aylik_kira: formData?.aylik_kira || '',
          formData: formData || {},
          sozlesmeMetni: JSON.stringify(ozelMaddeler),
          ozelMaddeler,
          genelMaddeler,
          fotograflar,
          esyaListesi,
        });
      }
      navigation.navigate('Home');
    } catch (e) {
      console.log('PDF hatası:', e);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sözleşme Önizleme</Text>
      </View>
      <ScrollView style={styles.content} scrollEnabled={true} nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
        <View style={styles.contractBox}>
          <Text style={styles.contractBrand}>GAYRİMENK.COM</Text>
          <Text style={styles.contractText}>{currentSozlesme}</Text>
        </View>
        <View style={styles.chatBox}>
          <Text style={styles.chatLabel}>SÖZLEŞMEYI DÜZENLE</Text>
          <ScrollView style={styles.chatMessages} scrollEnabled={true} nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
            {messages.map((msg, i) => (
              <View key={i} style={[styles.chatMsg, msg.role === 'user' ? styles.userMsg : styles.aiMsg]}>
                <Text style={[styles.chatMsgText, msg.role === 'user' && { color: '#fff' }]}>{msg.text}</Text>
              </View>
            ))}
            {loading && <ActivityIndicator style={{ margin: 8 }} color="#1a2e1a" />}
          </ScrollView>
          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              placeholder="Örn: 3. maddeyi değiştir..."
              placeholderTextColor="#bbb"
              value={chatInput}
              onChangeText={setChatInput}
              onSubmitEditing={sendChat}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={sendChat}>
              <Text style={styles.sendText}>↑</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={[styles.actionRow, { paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity style={styles.actionBtn} onPress={handlePDF}>
            <Text style={styles.actionText}>📄 PDF İndir & Kaydet</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0', overflow: 'auto' as any },
  header: { backgroundColor: '#fff', paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 0.5, borderBottomColor: '#e0e0e0' },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 28, color: '#555', lineHeight: 32 },
  headerTitle: { fontSize: 16, fontWeight: '500', color: '#1a1a1a' },
  content: { flex: 1, padding: 12 },
  contractBox: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 0.5, borderColor: '#e0e0e0' },
  contractBrand: { textAlign: 'center', fontSize: 10, letterSpacing: 2, color: '#aaa', marginBottom: 12 },
  contractText: { fontSize: 13, lineHeight: 22, color: '#333' },
  chatBox: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 10, borderWidth: 0.5, borderColor: '#e0e0e0', overflow: 'hidden' },
  chatLabel: { fontSize: 11, letterSpacing: 1.5, color: '#888', fontWeight: '500', padding: 12, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  chatMessages: { padding: 10, maxHeight: 160 },
  chatMsg: { borderRadius: 10, padding: 10, marginBottom: 6, maxWidth: '85%' },
  aiMsg: { backgroundColor: '#f5f5f0', alignSelf: 'flex-start' },
  userMsg: { backgroundColor: '#1a2e1a', alignSelf: 'flex-end' },
  chatMsgText: { fontSize: 13, color: '#333', lineHeight: 18 },
  chatInputRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: 0.5, borderTopColor: '#f0f0f0', gap: 8 },
  chatInput: { flex: 1, fontSize: 13, color: '#1a1a1a' },
  sendBtn: { width: 28, height: 28, backgroundColor: '#1a2e1a', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: '#fff', fontSize: 16 },
  actionRow: { marginBottom: 32 },
  actionBtn: { backgroundColor: '#1a2e1a', borderRadius: 12, padding: 16, alignItems: 'center' },
  actionText: { color: '#fff', fontSize: 15, fontWeight: '500' },
});
