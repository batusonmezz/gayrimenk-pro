import { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Modal, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../storage/supabaseClient';
import * as ImagePicker from 'expo-image-picker';
import { getRole } from '../services/authState';
import { getCurrentUser } from '../services/auth';
import { WebView } from 'react-native-webview';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

type Payment = {
  id: string;
  tip: string;
  donem: string | null;
  tutar_kurus: number | null;
  vade_tarihi: string | null;
  durum: string;
  dekont_var: boolean;
};

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function parseYerelTarih(str: string): Date {
  const parts = str.split('-');
  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
}

function formatDonem(donem: string): string {
  const parts = donem.split('-');
  return `${AYLAR[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
}

function formatTarih(tarih: string): string {
  const parts = tarih.split('-');
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function formatTL(kurus: number): string {
  const tl = Math.floor(kurus / 100);
  const krs = (kurus % 100).toString().padStart(2, '0');
  return `${tl.toLocaleString('tr-TR')},${krs} ₺`;
}

function hesaplaDepozitoDurum(durum: string): { label: string; renk: string } {
  if (durum === 'odendi')     return { label: 'Onaylandı',  renk: '#27ae60' };
  if (durum === 'reddedildi') return { label: 'Reddedildi', renk: '#7f8c8d' };
  return { label: 'Bekliyor', renk: '#f39c12' };
}

function hesaplaEtiket(p: Payment, bugun: Date): { label: string; renk: string } {
  if (p.durum === 'odendi') return { label: 'Ödendi', renk: '#27ae60' };
  if (p.durum === 'reddedildi') return { label: 'Reddedildi', renk: '#7f8c8d' };
  const vade = parseYerelTarih(p.vade_tarihi!);
  return vade < bugun ? { label: 'Gecikti', renk: '#e74c3c' } : { label: 'Bekliyor', renk: '#f39c12' };
}

function dekontHtml(b64: string, mime: string | null): string {
  const isPdf = mime === 'application/pdf';
  if (!isPdf) {
    const m = mime && mime.startsWith('image/') ? mime : 'image/jpeg';
    return '<!DOCTYPE html><html><head>'
      + '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=6, user-scalable=yes">'
      + '</head><body style="margin:0;background:#1a1a1a;display:flex;align-items:center;justify-content:center;min-height:100vh;">'
      + '<img src="data:' + m + ';base64,' + b64 + '" style="max-width:100%;height:auto;" />'
      + '</body></html>';
  }
  return '<!DOCTYPE html><html><head>'
    + '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=6, user-scalable=yes">'
    + '<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>'
    + '</head><body style="margin:0;background:#1a1a1a;"><div id="c"></div><script>'
    + 'pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";'
    + 'var b64="' + b64 + '";var raw=atob(b64);var arr=new Uint8Array(raw.length);'
    + 'for(var i=0;i<raw.length;i++){arr[i]=raw.charCodeAt(i);}'
    + 'pdfjsLib.getDocument({data:arr}).promise.then(function(pdf){'
    + 'var render=function(n){if(n>pdf.numPages)return;'
    + 'pdf.getPage(n).then(function(page){var vp=page.getViewport({scale:2});'
    + 'var cv=document.createElement("canvas");cv.width=vp.width;cv.height=vp.height;'
    + 'cv.style.width="100%";cv.style.display="block";cv.style.marginBottom="8px";'
    + 'document.getElementById("c").appendChild(cv);'
    + 'page.render({canvasContext:cv.getContext("2d"),viewport:vp}).promise.then(function(){render(n+1);});});};'
    + 'render(1);}).catch(function(e){document.body.innerHTML="<p style=\\"color:#fff;padding:20px;\\">PDF görüntülenemedi</p>";});'
    + '</script></body></html>';
}

export default function OdemeTakipScreen({ navigation, route }: any) {
  const { contractId, baslik } = route.params as { contractId: string; baslik: string };
  const [odemeler, setOdemeler] = useState<Payment[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [role, setRoleState] = useState<string | null>(null);
  const [yukleniyorId, setYukleniyorId] = useState<string | null>(null);
  const [dekontModalId, setDekontModalId] = useState<string | null>(null);
  const [dekontBase64, setDekontBase64] = useState<string | null>(null);
  const [dekontYukleniyor, setDekontYukleniyor] = useState(false);
  const [dekontMime, setDekontMime] = useState<string | null>(null);

  const bugun = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  useEffect(() => {
    const cached = getRole();
    if (cached) {
      setRoleState(cached);
    } else {
      getCurrentUser().then(u => setRoleState(u?.role ?? null));
    }
  }, []);

  const depozito = useMemo(
    () => odemeler.find(p => p.tip === 'depozito') ?? null,
    [odemeler]
  );
  const kiralar = useMemo(
    () => odemeler.filter(p => p.tip === 'kira'),
    [odemeler]
  );

  useFocusEffect(useCallback(() => {
    setYukleniyor(true);
    setHata(null);
    supabase
      .from('payments')
      .select('id, tip, donem, tutar_kurus, vade_tarihi, durum, dekont_var')
      .eq('contract_id', contractId)
      .order('donem', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          setHata('Ödemeler yüklenemedi.');
        } else {
          setOdemeler((data ?? []) as Payment[]);
        }
      })
      .finally(() => setYukleniyor(false));
  }, [contractId]));

  const handleDekontYukle = (paymentId: string) => {
    Alert.alert('Dekont Yükle', 'Dosya türünü seçin', [
      { text: 'Fotoğraf', onPress: () => dekontFotoSec(paymentId) },
      { text: 'PDF / Dosya', onPress: () => dekontPdfSec(paymentId) },
      { text: 'İptal', style: 'cancel' },
    ]);
  };

  const dekontGonder = async (paymentId: string, base64: string, mime: string) => {
    setYukleniyorId(paymentId);
    try {
      const { error } = await supabase.rpc('upload_dekont', {
        p_payment_id: paymentId, p_dekont: base64, p_mime: mime,
      });
      if (error) throw error;
      setOdemeler(prev => prev.map(p => p.id === paymentId
        ? { ...p, dekont_var: true, durum: 'beklemede' } : p));
      Alert.alert('Başarılı', 'Dekont yüklendi.');
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Dekont yüklenemedi.');
    } finally { setYukleniyorId(null); }
  };

  const dekontFotoSec = async (paymentId: string) => {
    const izin = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!izin.granted) {
      Alert.alert('İzin gerekli', 'Fotoğraf seçmek için galeri izni gerekli.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, exif: false, quality: 0.5,
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    const asset = result.assets[0];
    await dekontGonder(paymentId, asset.base64!, asset.mimeType ?? 'image/jpeg');
  };

  const dekontPdfSec = async (paymentId: string) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf', copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const base64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await dekontGonder(paymentId, base64, 'application/pdf');
  };

  const handleDekontGor = async (paymentId: string) => {
    setDekontModalId(paymentId);
    setDekontBase64(null);
    setDekontYukleniyor(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('dekont_url, dekont_mime')
        .eq('id', paymentId)
        .single();
      if (error) throw error;
      setDekontBase64(data?.dekont_url ?? null);
      setDekontMime(data?.dekont_mime ?? null);
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Dekont yüklenemedi.');
      setDekontModalId(null);
    } finally {
      setDekontYukleniyor(false);
    }
  };

  const dekontAksiyon = (p: Payment) => {
    if (yukleniyorId === p.id) {
      return <ActivityIndicator size="small" color="#1a6fa8" style={{ marginTop: 8 }} />;
    }
    if (p.dekont_var) {
      return (
        <TouchableOpacity style={styles.dekontGorBtn} onPress={() => handleDekontGor(p.id)}>
          <Text style={styles.dekontGorText}>Dekontu Gör</Text>
        </TouchableOpacity>
      );
    }
    if (role === 'kiraci' || role === 'emlakci') {
      return (
        <TouchableOpacity style={styles.dekontYukleBtn} onPress={() => handleDekontYukle(p.id)}>
          <Text style={styles.dekontYukleText}>Dekont Yükle</Text>
        </TouchableOpacity>
      );
    }
    return null;
  };

  const ozet = useMemo(() => {
    let odendiSay = 0, bekliyorSay = 0, geciktiSay = 0;
    let odendiKurus = 0, toplamKurus = 0;

    for (const p of kiralar) {
      toplamKurus += p.tutar_kurus!;
      if (p.durum === 'odendi') {
        odendiSay++;
        odendiKurus += p.tutar_kurus!;
      } else if (p.durum === 'beklemede') {
        const vade = parseYerelTarih(p.vade_tarihi!);
        if (vade < bugun) {
          geciktiSay++;
        } else {
          bekliyorSay++;
        }
      }
      // reddedildi: toplamKurus'a dahil, rozet kümeleri dışında
    }

    return {
      odendiSay,
      bekliyorSay,
      geciktiSay,
      tahsilKurus: odendiKurus,
      kalanKurus: toplamKurus - odendiKurus,
    };
  }, [kiralar, bugun]);

  const renderItem = ({ item }: { item: Payment }) => {
    const { label, renk } = hesaplaEtiket(item, bugun);
    const aksiyon = dekontAksiyon(item);
    return (
      <View style={styles.row}>
        <View style={styles.rowInner}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowDonem}>{formatDonem(item.donem!)}</Text>
            <Text style={styles.rowVade}>Vade: {formatTarih(item.vade_tarihi!)}</Text>
          </View>
          <View style={styles.rowRight}>
            <Text style={[styles.rowEtiket, { color: renk }]}>{label}</Text>
            <Text style={styles.rowTutar}>{formatTL(item.tutar_kurus!)}</Text>
          </View>
        </View>
        {aksiyon}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Ödeme Takibi</Text>
          {baslik ? <Text style={styles.headerSub} numberOfLines={1}>{baslik}</Text> : null}
        </View>
      </View>

      {yukleniyor ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0f6e56" />
        </View>
      ) : hata ? (
        <View style={styles.center}>
          <Text style={styles.hataText}>{hata}</Text>
        </View>
      ) : odemeler.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.bosText}>Henüz ödeme planı yok</Text>
        </View>
      ) : (
        <>
          <View style={styles.ozetCard}>
            <View style={styles.ozetRow}>
              <View style={styles.ozetItem}>
                <Text style={styles.ozetLabel}>TAHSİL EDİLEN</Text>
                <Text style={[styles.ozetTutar, { color: '#27ae60' }]}>{formatTL(ozet.tahsilKurus)}</Text>
              </View>
              <View style={styles.ozetDivider} />
              <View style={styles.ozetItem}>
                <Text style={styles.ozetLabel}>KALAN</Text>
                <Text style={[styles.ozetTutar, { color: ozet.kalanKurus > 0 ? '#e74c3c' : '#27ae60' }]}>
                  {formatTL(ozet.kalanKurus)}
                </Text>
              </View>
            </View>
            <View style={styles.ozetSep} />
            <View style={styles.ozetBadgeRow}>
              <View style={[styles.badge, { backgroundColor: '#e8f8f0' }]}>
                <Text style={[styles.badgeNum, { color: '#27ae60' }]}>{ozet.odendiSay}</Text>
                <Text style={[styles.badgeLabel, { color: '#27ae60' }]}>Ödendi</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: '#fef9e7' }]}>
                <Text style={[styles.badgeNum, { color: '#f39c12' }]}>{ozet.bekliyorSay}</Text>
                <Text style={[styles.badgeLabel, { color: '#f39c12' }]}>Bekliyor</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: '#fdf0f0' }]}>
                <Text style={[styles.badgeNum, { color: '#e74c3c' }]}>{ozet.geciktiSay}</Text>
                <Text style={[styles.badgeLabel, { color: '#e74c3c' }]}>Gecikti</Text>
              </View>
            </View>
          </View>

          <FlatList
            data={kiralar}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            ListHeaderComponent={() => {
              if (!depozito) return null;
              const { label, renk } = hesaplaDepozitoDurum(depozito.durum);
              const aksiyon = dekontAksiyon(depozito);
              return (
                <View style={styles.depozitRow}>
                  <View style={styles.rowInner}>
                    <View style={styles.rowLeft}>
                      <Text style={styles.depozitLabel}>Depozito</Text>
                      <Text style={styles.depozitAlt}>Detay sözleşmede</Text>
                    </View>
                    <View style={styles.rowRight}>
                      <Text style={[styles.rowEtiket, { color: renk }]}>{label}</Text>
                    </View>
                  </View>
                  {aksiyon}
                </View>
              );
            }}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={true}
            style={{ flex: 1 }}
          />
        </>
      )}

      <Modal
        visible={dekontModalId !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setDekontModalId(null); setDekontBase64(null); setDekontMime(null); }}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Dekont</Text>
            <TouchableOpacity
              onPress={() => { setDekontModalId(null); setDekontBase64(null); setDekontMime(null); }}
              style={styles.closeBtn}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            {dekontYukleniyor ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color="#0f6e56" />
              </View>
            ) : dekontBase64 ? (
              <WebView
                originWhitelist={['*']}
                javaScriptEnabled
                domStorageEnabled
                source={{ html: dekontHtml(dekontBase64, dekontMime) }}
                style={styles.dekontWeb}
              />
            ) : (
              <View style={styles.center}>
                <Text style={styles.bosText}>Dekont bulunamadı</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0' },
  header: { backgroundColor: '#1a2e1a', paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 28, color: '#fff', lineHeight: 32 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '500', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hataText: { fontSize: 14, color: '#e74c3c' },
  bosText: { fontSize: 14, color: '#888' },
  ozetCard: { backgroundColor: '#fff', margin: 12, borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: '#e0e0e0' },
  ozetRow: { flexDirection: 'row', alignItems: 'center' },
  ozetItem: { flex: 1, alignItems: 'center', gap: 4 },
  ozetLabel: { fontSize: 10, color: '#aaa', fontWeight: '600', letterSpacing: 0.5 },
  ozetTutar: { fontSize: 16, fontWeight: '700' },
  ozetDivider: { width: 1, height: 40, backgroundColor: '#f0f0f0' },
  ozetSep: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 10 },
  ozetBadgeRow: { flexDirection: 'row', gap: 6 },
  badge: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  badgeNum: { fontSize: 20, fontWeight: '700' },
  badgeLabel: { fontSize: 10, fontWeight: '600', marginTop: 1, letterSpacing: 0.3 },
  list: { paddingHorizontal: 12, paddingBottom: 24 },
  row: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 6, flexDirection: 'column', borderWidth: 0.5, borderColor: '#e8e8e8' },
  rowLeft: { flex: 1, gap: 4 },
  rowDonem: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  rowVade: { fontSize: 11, color: '#aaa' },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  rowEtiket: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  rowTutar: { fontSize: 14, fontWeight: '500', color: '#333' },
  depozitRow: { backgroundColor: '#eef4ff', borderRadius: 10, padding: 12, marginBottom: 6, flexDirection: 'column', borderWidth: 0.5, borderColor: '#b3cdf5' },
  depozitLabel: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  depozitAlt: { fontSize: 11, color: '#aaa' },
  rowInner:        { flexDirection: 'row', alignItems: 'center' },
  dekontGorBtn:    { marginTop: 8, paddingVertical: 6, alignItems: 'center', borderRadius: 6, backgroundColor: '#e8f4fd' },
  dekontGorText:   { fontSize: 12, color: '#1a6fa8', fontWeight: '500' },
  dekontYukleBtn:  { marginTop: 8, paddingVertical: 6, alignItems: 'center', borderRadius: 6, backgroundColor: '#f0f0f0' },
  dekontYukleText: { fontSize: 12, color: '#555', fontWeight: '500' },
  modal:           { flex: 1, backgroundColor: '#f5f5f0' },
  modalHeader:     { backgroundColor: '#1a2e1a', paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  modalTitle:      { flex: 1, fontSize: 16, fontWeight: '500', color: '#fff' },
  closeBtn:        { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeText:       { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  modalContent:    { flex: 1 },
  dekontWeb:       { flex: 1, backgroundColor: '#1a1a1a' },
});
