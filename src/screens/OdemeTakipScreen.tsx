import { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Modal, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../storage/supabaseClient';
import * as ImagePicker from 'expo-image-picker';
import { getRole, getOrganizationId } from '../services/authState';
import { decode } from 'base64-arraybuffer';
import { getCurrentUser } from '../services/auth';
import { WebView } from 'react-native-webview';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '../theme';

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

function hesaplaDepozitoDurum(durum: string): { label: string; durumKey: string } {
  if (durum === 'odendi')     return { label: 'Onaylandı',  durumKey: 'success' };
  if (durum === 'reddedildi') return { label: 'Reddedildi', durumKey: 'muted' };
  return { label: 'Bekliyor', durumKey: 'warning' };
}

function hesaplaEtiket(p: Payment, bugun: Date): { label: string; durumKey: string } {
  if (p.durum === 'odendi')     return { label: 'Ödendi',     durumKey: 'success' };
  if (p.durum === 'reddedildi') return { label: 'Reddedildi', durumKey: 'muted' };
  const vade = parseYerelTarih(p.vade_tarihi!);
  return vade < bugun ? { label: 'Gecikti', durumKey: 'error' } : { label: 'Bekliyor', durumKey: 'warning' };
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
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const DURUM_RENK: Record<string, string> = {
    success: colors.success,
    warning: colors.warning,
    error:   colors.error,
    muted:   colors.textMuted,
  };
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
    (async () => {
      setYukleniyor(true);
      setHata(null);
      try {
        const { data, error } = await supabase
          .from('payments')
          .select('id, tip, donem, tutar_kurus, vade_tarihi, durum, dekont_var')
          .eq('contract_id', contractId)
          .order('donem', { ascending: true });
        if (error) setHata('Ödemeler yüklenemedi.');
        else setOdemeler((data ?? []) as Payment[]);
      } finally {
        setYukleniyor(false);
      }
    })();
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
      const orgId = getOrganizationId();
      if (!orgId) throw new Error('Oturum bilgisi eksik.');
      const ext = mime === 'application/pdf' ? 'pdf' : mime === 'image/png' ? 'png' : 'jpg';
      const path = `${orgId}/${contractId}/${paymentId}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('dekontlar')
        .upload(path, decode(base64), { contentType: mime, upsert: true });
      if (upErr) throw upErr;
      const { error: rpcErr } = await supabase.rpc('record_dekont', {
        p_payment_id: paymentId, p_path: path, p_mime: mime,
      });
      if (rpcErr) throw rpcErr;
      setOdemeler(prev => prev.map(p => p.id === paymentId
        ? { ...p, dekont_var: true, durum: 'beklemede' } : p));
      Alert.alert('Başarılı', 'Dekont yüklendi.');
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Dekont yüklenemedi.');
    } finally {
      setYukleniyorId(null);
    }
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
      const path = data?.dekont_url;
      if (!path) throw new Error('Dekont bulunamadı.');
      const { data: blob, error: dlErr } = await supabase.storage
        .from('dekontlar')
        .download(path);
      if (dlErr) throw dlErr;
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob!);
      });
      setDekontBase64(base64);
      setDekontMime(data?.dekont_mime ?? null);
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Dekont yüklenemedi.');
      setDekontModalId(null);
    } finally {
      setDekontYukleniyor(false);
    }
  };

  const odemeDurumDegistir = async (paymentId: string, rpc: 'approve_payment' | 'reject_payment', yeniDurum: string) => {
    setYukleniyorId(paymentId);
    try {
      const { error } = await supabase.rpc(rpc, { p_payment_id: paymentId });
      if (error) throw error;
      setOdemeler(prev => prev.map(p => p.id === paymentId ? { ...p, durum: yeniDurum } : p));
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'İşlem başarısız.');
    } finally { setYukleniyorId(null); }
  };

  const handleOnayla = (paymentId: string) => {
    Alert.alert('Onayla', 'Bu ödemeyi onaylıyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Onayla', onPress: () => odemeDurumDegistir(paymentId, 'approve_payment', 'odendi') },
    ]);
  };

  const handleReddet = (paymentId: string) => {
    Alert.alert('Reddet', 'Bu dekontu reddediyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Reddet', style: 'destructive', onPress: () => odemeDurumDegistir(paymentId, 'reject_payment', 'reddedildi') },
    ]);
  };

  const dekontAksiyon = (p: Payment) => {
    if (yukleniyorId === p.id) {
      return <ActivityIndicator size="small" color={colors.info} style={{ marginTop: 8 }} />;
    }
    const buttons = [];
    if (p.dekont_var) {
      buttons.push(
        <TouchableOpacity key="gor" style={styles.dekontGorBtn} onPress={() => handleDekontGor(p.id)}>
          <Text style={styles.dekontGorText}>Dekontu Gör</Text>
        </TouchableOpacity>
      );
    }
    if ((role === 'kiraci' || role === 'emlakci') && p.durum !== 'odendi' && (!p.dekont_var || p.durum === 'reddedildi')) {
      buttons.push(
        <TouchableOpacity key="yukle" style={styles.dekontYukleBtn} onPress={() => handleDekontYukle(p.id)}>
          <Text style={styles.dekontYukleText}>{p.durum === 'reddedildi' ? 'Yeniden Yükle' : 'Dekont Yükle'}</Text>
        </TouchableOpacity>
      );
    }
    if ((role === 'mal_sahibi' || role === 'emlakci') && p.durum !== 'odendi') {
      buttons.push(
        <TouchableOpacity key="onayla" style={styles.onayBtn} onPress={() => handleOnayla(p.id)}>
          <Text style={styles.onayText}>Onayla</Text>
        </TouchableOpacity>
      );
    }
    if ((role === 'mal_sahibi' || role === 'emlakci') && p.durum === 'beklemede') {
      buttons.push(
        <TouchableOpacity key="reddet" style={styles.redBtn} onPress={() => handleReddet(p.id)}>
          <Text style={styles.redText}>Reddet</Text>
        </TouchableOpacity>
      );
    }
    if (buttons.length === 0) return null;
    return <View style={styles.aksiyonRow}>{buttons}</View>;
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
    const { label, durumKey } = hesaplaEtiket(item, bugun);
    const aksiyon = dekontAksiyon(item);
    return (
      <View style={styles.row}>
        <View style={styles.rowInner}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowDonem}>{formatDonem(item.donem!)}</Text>
            <Text style={styles.rowVade}>Vade: {formatTarih(item.vade_tarihi!)}</Text>
          </View>
          <View style={styles.rowRight}>
            <Text style={[styles.rowEtiket, { color: DURUM_RENK[durumKey] }]}>{label}</Text>
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
          <ActivityIndicator size="large" color={colors.primaryAccent} />
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
                <Text style={[styles.ozetTutar, { color: colors.success }]}>{formatTL(ozet.tahsilKurus)}</Text>
              </View>
              <View style={styles.ozetDivider} />
              <View style={styles.ozetItem}>
                <Text style={styles.ozetLabel}>KALAN</Text>
                <Text style={[styles.ozetTutar, { color: ozet.kalanKurus > 0 ? colors.error : colors.success }]}>
                  {formatTL(ozet.kalanKurus)}
                </Text>
              </View>
            </View>
            <View style={styles.ozetSep} />
            <View style={styles.ozetBadgeRow}>
              <View style={[styles.badge, { backgroundColor: colors.successSurface }]}>
                <Text style={[styles.badgeNum, { color: colors.success }]}>{ozet.odendiSay}</Text>
                <Text style={[styles.badgeLabel, { color: colors.success }]}>Ödendi</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: colors.warningSurface }]}>
                <Text style={[styles.badgeNum, { color: colors.warning }]}>{ozet.bekliyorSay}</Text>
                <Text style={[styles.badgeLabel, { color: colors.warning }]}>Bekliyor</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: colors.errorSurface }]}>
                <Text style={[styles.badgeNum, { color: colors.error }]}>{ozet.geciktiSay}</Text>
                <Text style={[styles.badgeLabel, { color: colors.error }]}>Gecikti</Text>
              </View>
            </View>
          </View>

          <FlatList
            data={kiralar}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            ListHeaderComponent={() => {
              if (!depozito) return null;
              const { label, durumKey } = hesaplaDepozitoDurum(depozito.durum);
              const aksiyon = dekontAksiyon(depozito);
              return (
                <View style={styles.depozitRow}>
                  <View style={styles.rowInner}>
                    <View style={styles.rowLeft}>
                      <Text style={styles.depozitLabel}>Depozito</Text>
                      <Text style={styles.depozitAlt}>Detay sözleşmede</Text>
                    </View>
                    <View style={styles.rowRight}>
                      <Text style={[styles.rowEtiket, { color: DURUM_RENK[durumKey] }]}>{label}</Text>
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
                <ActivityIndicator size="large" color={colors.primaryAccent} />
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

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.background },
  header:           { backgroundColor: isDark ? colors.primaryAccent : colors.primary, paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn:          { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backText:         { fontSize: 28, color: colors.textOnPrimary, lineHeight: 32 },
  headerText:       { flex: 1 },
  headerTitle:      { fontSize: 16, fontWeight: '500', color: colors.textOnPrimary },
  headerSub:        { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hataText:         { fontSize: 14, color: colors.error },
  bosText:          { fontSize: 14, color: colors.textMuted },
  ozetCard:         { backgroundColor: colors.surface, margin: 12, borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: colors.border },
  ozetRow:          { flexDirection: 'row', alignItems: 'center' },
  ozetItem:         { flex: 1, alignItems: 'center', gap: 4 },
  ozetLabel:        { fontSize: 10, color: colors.textFaint, fontWeight: '600', letterSpacing: 0.5 },
  ozetTutar:        { fontSize: 16, fontWeight: '700' },
  ozetDivider:      { width: 1, height: 40, backgroundColor: colors.borderLight },
  ozetSep:          { height: 1, backgroundColor: colors.borderLight, marginVertical: 10 },
  ozetBadgeRow:     { flexDirection: 'row', gap: 6 },
  badge:            { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  badgeNum:         { fontSize: 20, fontWeight: '700' },
  badgeLabel:       { fontSize: 10, fontWeight: '600', marginTop: 1, letterSpacing: 0.3 },
  list:             { paddingHorizontal: 12, paddingBottom: 24 },
  row:              { backgroundColor: colors.surface, borderRadius: 10, padding: 12, marginBottom: 6, flexDirection: 'column', borderWidth: 0.5, borderColor: colors.border },
  rowLeft:          { flex: 1, gap: 4 },
  rowDonem:         { fontSize: 14, fontWeight: '500', color: colors.text },
  rowVade:          { fontSize: 11, color: colors.textFaint },
  rowRight:         { alignItems: 'flex-end', gap: 4 },
  rowEtiket:        { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  rowTutar:         { fontSize: 14, fontWeight: '500', color: colors.text },
  depozitRow:       { backgroundColor: colors.infoSurface, borderRadius: 10, padding: 12, marginBottom: 6, flexDirection: 'column', borderWidth: 0.5, borderColor: colors.border },
  depozitLabel:     { fontSize: 14, fontWeight: '600', color: colors.text },
  depozitAlt:       { fontSize: 11, color: colors.textFaint },
  rowInner:         { flexDirection: 'row', alignItems: 'center' },
  aksiyonRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  dekontGorBtn:     { paddingVertical: 6, paddingHorizontal: 10, alignItems: 'center', borderRadius: 6, backgroundColor: colors.infoSurface },
  dekontGorText:    { fontSize: 12, color: colors.info, fontWeight: '500' },
  dekontYukleBtn:   { paddingVertical: 6, paddingHorizontal: 10, alignItems: 'center', borderRadius: 6, backgroundColor: colors.surfaceSubtle },
  dekontYukleText:  { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  onayBtn:          { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, backgroundColor: colors.successSurface },
  onayText:         { fontSize: 12, color: colors.success, fontWeight: '600' },
  redBtn:           { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, backgroundColor: colors.errorSurface },
  redText:          { fontSize: 12, color: colors.error, fontWeight: '600' },
  modal:            { flex: 1, backgroundColor: colors.background },
  modalHeader:      { backgroundColor: isDark ? colors.primaryAccent : colors.primary, paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  modalTitle:       { flex: 1, fontSize: 16, fontWeight: '500', color: colors.textOnPrimary },
  closeBtn:         { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeText:        { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  modalContent:     { flex: 1 },
  dekontWeb:        { flex: 1, backgroundColor: '#1a1a1a' },
});
