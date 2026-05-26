import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { sozlesmeleriGetir, SozlesmeKayit } from '../services/storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function MalSahibiScreen({ navigation }: any) {
  const [malSahipleri, setMalSahipleri] = useState<{ ad: string; kayitlar: SozlesmeKayit[] }[]>([]);
  const [secili, setSecili] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    sozlesmeleriGetir().then(data => {
      const gruplar: Record<string, SozlesmeKayit[]> = {};
      data.forEach(k => {
        const ad = k.kiraya_veren_ad || 'Bilinmeyen';
        if (!gruplar[ad]) gruplar[ad] = [];
        gruplar[ad].push(k);
      });
      setMalSahipleri(Object.entries(gruplar).map(([ad, kayitlar]) => ({ ad, kayitlar })));
    });
  }, []));

  const raporAl = async (ad: string, kayitlar: SozlesmeKayit[]) => {
    const toplamKira = kayitlar.reduce((sum, k) => sum + parseInt(k.aylik_kira?.replace(/\./g, '') || '0'), 0);

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 15mm; size: A4; }
  body { font-family: Arial, sans-serif; font-size: 10pt; }
  h1 { text-align: center; font-size: 14pt; margin-bottom: 4px; }
  h2 { font-size: 11pt; margin-bottom: 16px; text-align: center; color: #555; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #1a2e1a; color: #fff; padding: 8px; font-size: 9pt; text-align: left; }
  td { border: 1px solid #ddd; padding: 6px 8px; font-size: 9pt; }
  tr:nth-child(even) { background: #f9f9f9; }
  .toplam { font-weight: bold; background: #e1f5ee; }
  .footer { text-align: center; font-size: 8pt; color: #888; margin-top: 20px; }
</style>
</head>
<body>
<h1>MAL SAHİBİ KİRA RAPORU</h1>
<h2>${ad}</h2>

<table>
  <tr>
    <th>Daire</th>
    <th>Kiracı</th>
    <th>Aylık Kira</th>
    <th>Başlangıç</th>
    <th>Bitiş</th>
    <th>Durum</th>
  </tr>
  ${kayitlar.map(k => {
    const bitis = k.formData?.bitis_tarihi || '';
    const bugun = new Date();
    const bitisDate = bitis ? new Date(bitis.split('.').reverse().join('-')) : null;
    const kalanGun = bitisDate ? Math.floor((bitisDate.getTime() - bugun.getTime()) / (1000 * 60 * 60 * 24)) : 999;
    const durum = kalanGun < 0 ? 'Süresi Geçmiş' : kalanGun <= 60 ? 'Bitiyor' : 'Aktif';
    const renkStyle = kalanGun < 0 ? 'color:red' : kalanGun <= 60 ? 'color:orange' : 'color:green';
    return `<tr>
      <td>${k.formData?.kapi_no || '-'}</td>
      <td>${k.kiraci_ad || '-'}</td>
      <td>${k.aylik_kira || '-'} TL</td>
      <td>${k.formData?.baslangic_tarihi || '-'}</td>
      <td>${bitis || '-'}</td>
      <td style="${renkStyle}"><b>${durum}</b></td>
    </tr>`;
  }).join('')}
  <tr class="toplam">
    <td colspan="2"><b>TOPLAM AYLIK KİRA GELİRİ</b></td>
    <td colspan="4"><b>${toplamKira.toLocaleString('tr-TR')} TL</b></td>
  </tr>
</table>

<p class="footer">Gayrimenk.com tarafından hazırlanmıştır • ${new Date().toLocaleDateString('tr-TR')}</p>
</body>
</html>`;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
  };

  const seciliKayitlar = malSahipleri.find(m => m.ad === secili)?.kayitlar || [];
  const toplamKira = seciliKayitlar.reduce((sum, k) => sum + parseInt(k.aylik_kira?.replace(/\./g, '') || '0'), 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mal Sahipleri</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.liste}>
          <Text style={styles.listeBaslik}>MAL SAHİPLERİ</Text>
          <ScrollView scrollEnabled={true} nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
            {malSahipleri.map(m => (
              <TouchableOpacity
                key={m.ad}
                style={[styles.malSahibiKart, secili === m.ad && styles.secili]}
                onPress={() => setSecili(m.ad)}
              >
                <Text style={[styles.malSahibiAd, secili === m.ad && { color: '#fff' }]}>{m.ad}</Text>
                <Text style={[styles.malSahibiAdet, secili === m.ad && { color: 'rgba(255,255,255,0.7)' }]}>{m.kayitlar.length} mülk</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.detay}>
          {secili ? (
            <>
              <View style={styles.detayBaslik}>
                <Text style={styles.detayAd}>{secili}</Text>
                <TouchableOpacity style={styles.raporBtn} onPress={() => raporAl(secili, seciliKayitlar)}>
                  <Text style={styles.raporBtnText}>📄 Rapor Al</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.ozet}>
                <View style={styles.ozetKart}>
                  <Text style={styles.ozetSayi}>{seciliKayitlar.length}</Text>
                  <Text style={styles.ozetLabel}>Mülk</Text>
                </View>
                <View style={styles.ozetKart}>
                  <Text style={styles.ozetSayi}>{toplamKira.toLocaleString('tr-TR')}</Text>
                  <Text style={styles.ozetLabel}>TL/ay</Text>
                </View>
              </View>
              <ScrollView scrollEnabled={true} nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                {seciliKayitlar.map(k => {
                  const bitis = k.formData?.bitis_tarihi || '';
                  const bugun = new Date();
                  const bitisDate = bitis ? new Date(bitis.split('.').reverse().join('-')) : null;
                  const kalanGun = bitisDate ? Math.floor((bitisDate.getTime() - bugun.getTime()) / (1000 * 60 * 60 * 24)) : 999;
                  const durum = kalanGun < 0 ? '🔴' : kalanGun <= 60 ? '🟡' : '🟢';

                  return (
                    <TouchableOpacity
                      key={k.id}
                      style={styles.daire}
                      onPress={() => navigation.navigate('Preview', {
                        sozlesme: k.sozlesmeMetni,
                        title: k.tur,
                        formData: k.formData,
                        kayitId: k.id,
                        ozelMaddeler: k.ozelMaddeler || [],
                        genelMaddeler: k.genelMaddeler || [],
                        esyaListesi: k.esyaListesi || [],
                      })}
                    >
                      <View style={styles.daireBaslik}>
                        <Text style={styles.daireNo}>{k.formData?.kapi_no || '-'}</Text>
                        <Text>{durum}</Text>
                      </View>
                      <Text style={styles.daireKiraci}>{k.kiraci_ad}</Text>
                      <Text style={styles.daireKira}>{k.aylik_kira} TL/ay</Text>
                      <Text style={styles.daireTarih}>{k.formData?.baslangic_tarihi} → {k.formData?.bitis_tarihi}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          ) : (
            <View style={styles.bosDetay}>
              <Text style={styles.bosDetayText}>Sol taraftan mal sahibi seç</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0', overflow: 'auto' as any },
  header: { backgroundColor: '#1a2e1a', paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 28, color: '#fff', lineHeight: 32 },
  headerTitle: { fontSize: 16, fontWeight: '500', color: '#fff' },
  content: { flex: 1, flexDirection: 'row' },
  liste: { width: 130, backgroundColor: '#fff', borderRightWidth: 0.5, borderRightColor: '#e0e0e0' },
  listeBaslik: { fontSize: 9, letterSpacing: 1, color: '#888', padding: 10, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0', fontWeight: '500' },
  malSahibiKart: { padding: 12, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  secili: { backgroundColor: '#1a2e1a' },
  malSahibiAd: { fontSize: 12, fontWeight: '500', color: '#1a1a1a', marginBottom: 2 },
  malSahibiAdet: { fontSize: 10, color: '#888' },
  detay: { flex: 1, padding: 10 },
  detayBaslik: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  detayAd: { fontSize: 13, fontWeight: '500', color: '#1a1a1a', flex: 1 },
  raporBtn: { backgroundColor: '#1a2e1a', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  raporBtnText: { color: '#fff', fontSize: 11, fontWeight: '500' },
  ozet: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  ozetKart: { flex: 1, backgroundColor: '#e1f5ee', borderRadius: 8, padding: 10, alignItems: 'center' },
  ozetSayi: { fontSize: 16, fontWeight: '500', color: '#0f6e56' },
  ozetLabel: { fontSize: 10, color: '#0f6e56' },
  daire: { backgroundColor: '#fff', borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 0.5, borderColor: '#e0e0e0' },
  daireBaslik: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  daireNo: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
  daireKiraci: { fontSize: 12, color: '#555', marginBottom: 2 },
  daireKira: { fontSize: 13, fontWeight: '500', color: '#0f6e56', marginBottom: 2 },
  daireTarih: { fontSize: 10, color: '#aaa' },
  bosDetay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bosDetayText: { fontSize: 13, color: '#aaa' },
});
