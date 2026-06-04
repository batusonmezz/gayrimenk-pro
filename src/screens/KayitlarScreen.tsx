import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { sozlesmeleriGetir, sozlesmeSil, SozlesmeKayit } from '../services/storage';

export default function KayitlarScreen({ navigation }: any) {
  const [kayitlar, setKayitlar] = useState<SozlesmeKayit[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  useFocusEffect(useCallback(() => {
    setYukleniyor(true);
    sozlesmeleriGetir()
      .then(setKayitlar)
      .catch(() => {})
      .finally(() => setYukleniyor(false));
  }, []));

  const handleSil = (id: string, ad: string) => {
    Alert.alert('Sil', `"${ad}" sözleşmesi silinsin mi?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        await sozlesmeSil(id);
        setKayitlar(prev => prev.filter(s => s.id !== id));
      }},
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kayıtlı Sözleşmeler</Text>
        <Text style={styles.count}>{kayitlar.length} adet</Text>
      </View>

      <ScrollView style={styles.content} scrollEnabled={true} nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
        {yukleniyor ? (
          <View style={styles.empty}>
            <ActivityIndicator size="large" color="#0f6e56" />
          </View>
        ) : kayitlar.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📄</Text>
            <Text style={styles.emptyText}>Henüz kayıtlı sözleşme yok</Text>
          </View>
        ) : (
          kayitlar.map(kayit => (
            <TouchableOpacity
              key={kayit.id}
              style={styles.card}
              onPress={() => navigation.navigate('Preview', {
                sozlesme: kayit.sozlesmeMetni,
                title: kayit.tur,
                formData: kayit.formData,
                kayitId: kayit.id,
                ozelMaddeler: kayit.ozelMaddeler || [],
                genelMaddeler: kayit.genelMaddeler || [],
                fotograflar: kayit.fotograflar || {},
                esyaListesi: kayit.esyaListesi || [],
              })}
              activeOpacity={0.7}
            >
              <View style={styles.cardLeft}>
                <Text style={styles.cardTur}>{kayit.tur}</Text>
                <Text style={styles.cardAd}>{kayit.kiraya_veren_ad} → {kayit.kiraci_ad}</Text>
                <Text style={styles.cardKira}>{kayit.aylik_kira} TL/ay</Text>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.cardTarih}>{kayit.tarih}</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Form', {
                    type: kayit.tur === 'Kira Sözleşmesi' ? 'kira' : kayit.tur,
                    title: kayit.tur,
                    formData: kayit.formData,
                    kayitId: kayit.id,
                    fotograflar: kayit.fotograflar,
                    esyaListesi: kayit.esyaListesi,
                  })}
                  style={styles.duzenleBtn}
                >
                  <Text style={styles.duzenleText}>Düzenle</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleSil(kayit.id, kayit.kiraci_ad)}
                  style={styles.silBtn}
                >
                  <Text style={styles.silText}>Sil</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0', overflow: 'auto' as any },
  header: { backgroundColor: '#1a2e1a', paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 28, color: '#fff', lineHeight: 32 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '500', color: '#fff' },
  count: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  content: { flex: 1, padding: 12 },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15, color: '#888' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 0.5, borderColor: '#e0e0e0', flexDirection: 'row', alignItems: 'center' },
  cardLeft: { flex: 1, gap: 3 },
  cardTur: { fontSize: 11, color: '#0f6e56', fontWeight: '500', letterSpacing: 0.5 },
  cardAd: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  cardKira: { fontSize: 12, color: '#888' },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  cardTarih: { fontSize: 11, color: '#aaa' },
  duzenleBtn: { backgroundColor: '#e1f5ee', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 4 },
  duzenleText: { fontSize: 11, color: '#0f6e56', fontWeight: '500' },
  silBtn: { backgroundColor: '#fee2e2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  silText: { fontSize: 11, color: '#dc2626', fontWeight: '500' },
});
