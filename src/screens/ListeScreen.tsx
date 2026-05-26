import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { sozlesmeleriGetir, SozlesmeKayit } from '../services/storage';

type Filtre = 'Hepsi' | 'Aktif' | 'Bitiyor' | 'Süresi Geçmiş';

function getDurum(bitis: string): { durum: Filtre; renk: string; kalanGun: number } {
  if (!bitis) return { durum: 'Aktif', renk: '#2e7d32', kalanGun: 999 };
  const parts = bitis.split('.');
  if (parts.length !== 3) return { durum: 'Aktif', renk: '#2e7d32', kalanGun: 999 };
  const bitisDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  const kalanGun = Math.floor((bitisDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (kalanGun < 0) return { durum: 'Süresi Geçmiş', renk: '#c62828', kalanGun };
  if (kalanGun <= 60) return { durum: 'Bitiyor', renk: '#e65100', kalanGun };
  return { durum: 'Aktif', renk: '#2e7d32', kalanGun };
}

export default function ListeScreen({ navigation }: any) {
  const [kayitlar, setKayitlar] = useState<SozlesmeKayit[]>([]);
  const [filtre, setFiltre] = useState<Filtre>('Hepsi');
  const [arama, setArama] = useState('');

  useFocusEffect(useCallback(() => {
    sozlesmeleriGetir().then(setKayitlar);
  }, []));

  const filtrelenmis = kayitlar.filter(k => {
    const bitis = k.formData?.bitis_tarihi || '';
    const { durum } = getDurum(bitis);
    if (filtre !== 'Hepsi' && durum !== filtre) return false;
    if (arama) {
      const q = arama.toLowerCase();
      return (
        k.kiraci_ad?.toLowerCase().includes(q) ||
        k.kiraya_veren_ad?.toLowerCase().includes(q) ||
        k.formData?.kapi_no?.toLowerCase().includes(q) ||
        k.formData?.cadde_sokak?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const sayilar = {
    aktif: kayitlar.filter(k => getDurum(k.formData?.bitis_tarihi || '').durum === 'Aktif').length,
    bitiyor: kayitlar.filter(k => getDurum(k.formData?.bitis_tarihi || '').durum === 'Bitiyor').length,
    gecmis: kayitlar.filter(k => getDurum(k.formData?.bitis_tarihi || '').durum === 'Süresi Geçmiş').length,
  };

  const FILTRELER: Filtre[] = ['Hepsi', 'Aktif', 'Bitiyor', 'Süresi Geçmiş'];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sözleşme Listesi</Text>
      </View>

      <View style={styles.ozet}>
        <View style={[styles.ozetKart, { backgroundColor: '#e8f5e9' }]}>
          <Text style={[styles.ozetSayi, { color: '#2e7d32' }]}>{sayilar.aktif}</Text>
          <Text style={styles.ozetLabel}>Aktif</Text>
        </View>
        <View style={[styles.ozetKart, { backgroundColor: '#fff3e0' }]}>
          <Text style={[styles.ozetSayi, { color: '#e65100' }]}>{sayilar.bitiyor}</Text>
          <Text style={styles.ozetLabel}>Bitiyor</Text>
        </View>
        <View style={[styles.ozetKart, { backgroundColor: '#ffebee' }]}>
          <Text style={[styles.ozetSayi, { color: '#c62828' }]}>{sayilar.gecmis}</Text>
          <Text style={styles.ozetLabel}>Geçmiş</Text>
        </View>
        <View style={[styles.ozetKart, { backgroundColor: '#f5f5f5' }]}>
          <Text style={[styles.ozetSayi, { color: '#333' }]}>{kayitlar.length}</Text>
          <Text style={styles.ozetLabel}>Toplam</Text>
        </View>
      </View>

      <View style={styles.aramaRow}>
        <TextInput
          style={styles.aramaInput}
          placeholder="Kiracı, mal sahibi, daire ara..."
          value={arama}
          onChangeText={setArama}
          placeholderTextColor="#aaa"
        />
      </View>

      <ScrollView horizontal scrollEnabled={true} nestedScrollEnabled={true} showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={true} style={styles.filtreSatiri}>
        <View style={styles.filtreRow}>
          {FILTRELER.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filtreBtn, filtre === f && styles.filtreBtnAktif]}
              onPress={() => setFiltre(f)}
            >
              <Text style={[styles.filtreText, filtre === f && styles.filtreTextAktif]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ScrollView horizontal scrollEnabled={true} nestedScrollEnabled={true} showsHorizontalScrollIndicator={true} showsVerticalScrollIndicator={true}>
        <View>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { width: 80 }]}>Daire</Text>
            <Text style={[styles.th, { width: 120 }]}>Kiracı</Text>
            <Text style={[styles.th, { width: 130 }]}>Mal Sahibi</Text>
            <Text style={[styles.th, { width: 90 }]}>Kira (TL)</Text>
            <Text style={[styles.th, { width: 90 }]}>Başlangıç</Text>
            <Text style={[styles.th, { width: 90 }]}>Bitiş</Text>
            <Text style={[styles.th, { width: 80 }]}>Durum</Text>
          </View>
          <ScrollView scrollEnabled={true} nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
            {filtrelenmis.map((k, idx) => {
              const bitis = k.formData?.bitis_tarihi || '';
              const { durum, renk } = getDurum(bitis);
              return (
                <TouchableOpacity
                  key={k.id}
                  style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}
                  onPress={() => navigation.navigate('Preview', {
                    sozlesme: k.sozlesmeMetni,
                    title: k.tur,
                    formData: k.formData,
                    kayitId: k.id,
                    ozelMaddeler: k.ozelMaddeler || [],
                    genelMaddeler: k.genelMaddeler || [],
                  })}
                >
                  <Text style={[styles.td, { width: 80 }]}>{k.formData?.kapi_no || '-'}</Text>
                  <Text style={[styles.td, { width: 120 }]} numberOfLines={1}>{k.kiraci_ad || '-'}</Text>
                  <Text style={[styles.td, { width: 130 }]} numberOfLines={1}>{k.kiraya_veren_ad || '-'}</Text>
                  <Text style={[styles.td, { width: 90 }]}>{k.aylik_kira || '-'}</Text>
                  <Text style={[styles.td, { width: 90 }]}>{k.formData?.baslangic_tarihi || '-'}</Text>
                  <Text style={[styles.td, { width: 90 }]}>{bitis || '-'}</Text>
                  <Text style={[styles.td, { width: 80, color: renk, fontWeight: '600' }]} numberOfLines={1}>{durum}</Text>
                </TouchableOpacity>
              );
            })}
            {filtrelenmis.length === 0 && (
              <View style={styles.bosView}>
                <Text style={styles.bosText}>Kayıt bulunamadı</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0', overflow: 'auto' as any },
  header: { backgroundColor: '#1a2e1a', paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 28, color: '#fff', lineHeight: 32 },
  headerTitle: { fontSize: 16, fontWeight: '500', color: '#fff' },
  ozet: { flexDirection: 'row', padding: 10, gap: 8 },
  ozetKart: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  ozetSayi: { fontSize: 18, fontWeight: '600' },
  ozetLabel: { fontSize: 10, color: '#666', marginTop: 2 },
  aramaRow: { paddingHorizontal: 10, paddingBottom: 8 },
  aramaInput: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, borderWidth: 0.5, borderColor: '#ddd', color: '#1a1a1a' },
  filtreSatiri: { maxHeight: 44, paddingLeft: 10 },
  filtreRow: { flexDirection: 'row', gap: 8, paddingRight: 10, paddingBottom: 8 },
  filtreBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#ddd' },
  filtreBtnAktif: { backgroundColor: '#1a2e1a', borderColor: '#1a2e1a' },
  filtreText: { fontSize: 12, color: '#555' },
  filtreTextAktif: { color: '#fff', fontWeight: '500' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#1a2e1a', paddingVertical: 8 },
  th: { color: '#fff', fontSize: 11, fontWeight: '600', paddingHorizontal: 8 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  tableRowAlt: { backgroundColor: '#fafafa' },
  td: { fontSize: 12, color: '#333', paddingHorizontal: 8 },
  bosView: { padding: 40, alignItems: 'center' },
  bosText: { color: '#aaa', fontSize: 14 },
});
