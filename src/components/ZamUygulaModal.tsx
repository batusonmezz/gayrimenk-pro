import { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

interface ZamUygulaModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (p: { yeniTutarKurus: number; baslangicDonem: string }) => void;
  baslik: string;
  mevcutTutarKurus: number;
  odemeler: Array<{ tip: string; donem: string | null; durum: string; dekontVar: boolean }>;
}

// OdemePlanModal.tsx ile aynı desen — kasıtlı kod tekrarı, ikisi de "YYYY-MM-01" sözleşmesine bağlı
function ilkDonemToDate(ilkDonem: string): Date {
  const [y, m] = ilkDonem.split('-').map(Number);
  return new Date(y, m - 1, 1);
}

function dateToIlkDonem(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function bugununIlkDonemi(): string {
  return dateToIlkDonem(new Date());
}

function ayEkle(ilkDonem: string, delta: number): string {
  const d = ilkDonemToDate(ilkDonem);
  d.setMonth(d.getMonth() + delta);
  return dateToIlkDonem(d);
}

function ayFarki(ilkDonem: string): number {
  const d = ilkDonemToDate(ilkDonem);
  const now = new Date();
  return (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
}

function formatTL(kurus: number): string {
  const tl = Math.floor(kurus / 100);
  const krs = (kurus % 100).toString().padStart(2, '0');
  return `${tl.toLocaleString('tr-TR')},${krs} ₺`;
}

export default function ZamUygulaModal({ visible, onClose, onConfirm, baslik, mevcutTutarKurus, odemeler }: ZamUygulaModalProps) {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const insets = useSafeAreaInsets();

  const [tutarStr, setTutarStr] = useState('');
  const [secilenDonem, setSecilenDonem] = useState(bugununIlkDonemi());

  useEffect(() => {
    if (!visible) return;
    setTutarStr('');
    setSecilenDonem(ayEkle(bugununIlkDonemi(), 1));
  }, [visible]);

  const handleChangeTutar = (val: string) => {
    const temiz = val.replace(/\D/g, '');
    const formatli = temiz.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    setTutarStr(formatli);
  };

  const yeniTutarKurus = useMemo(() => {
    const rakam = tutarStr.replace(/\D/g, '');
    if (!rakam) return 0;
    return parseInt(rakam, 10) * 100;
  }, [tutarStr]);

  const secilenDonemTarih = ilkDonemToDate(secilenDonem);
  const farkGeri = ayFarki(secilenDonem) <= -24;
  const farkIleri = ayFarki(secilenDonem) >= 24;
  const handleOnceki = () => { if (!farkGeri) setSecilenDonem(ayEkle(secilenDonem, -1)); };
  const handleSonraki = () => { if (!farkIleri) setSecilenDonem(ayEkle(secilenDonem, 1)); };

  const { guncellenecekSayi, haricSayi } = useMemo(() => {
    let g = 0, h = 0;
    for (const p of odemeler) {
      if (p.tip !== 'kira' || !p.donem || p.donem < secilenDonem) continue;
      if (p.durum === 'beklemede' && !p.dekontVar) g++; else h++;
    }
    return { guncellenecekSayi: g, haricSayi: h };
  }, [odemeler, secilenDonem]);

  const gecerli = yeniTutarKurus > 0 && guncellenecekSayi > 0;

  const handleUygula = () => {
    onConfirm({ yeniTutarKurus, baslangicDonem: secilenDonem });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>{baslik}</Text>
            {mevcutTutarKurus > 0 && (
              <Text style={styles.headerSub}>Mevcut: {formatTL(mevcutTutarKurus)} / ay</Text>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 32 }}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Yeni Kira Tutarı</Text>
            <TextInput
              style={styles.tutarInput}
              value={tutarStr}
              onChangeText={handleChangeTutar}
              keyboardType="numeric"
              placeholder="15.000"
              placeholderTextColor={colors.textFaint}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hangi Aydan İtibaren</Text>
            <View style={styles.ayRow}>
              <TouchableOpacity onPress={handleOnceki} disabled={farkGeri} style={styles.okBtn}>
                <Text style={[styles.okText, farkGeri && styles.okTextDisabled]}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.ayLabel}>{AYLAR[secilenDonemTarih.getMonth()]} {secilenDonemTarih.getFullYear()}</Text>
              <TouchableOpacity onPress={handleSonraki} disabled={farkIleri} style={styles.okBtn}>
                <Text style={[styles.okText, farkIleri && styles.okTextDisabled]}>›</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.onizlemeKutu}>
            {guncellenecekSayi > 0 ? (
              <Text style={styles.onizlemeText}>
                {AYLAR[secilenDonemTarih.getMonth()]} {secilenDonemTarih.getFullYear()} ve sonrası — {guncellenecekSayi} satır güncellenecek
                {yeniTutarKurus > 0 ? `: ${formatTL(mevcutTutarKurus)} → ${formatTL(yeniTutarKurus)}` : ''}
              </Text>
            ) : (
              <Text style={styles.onizlemeText}>Bu tarihten itibaren güncellenebilecek satır yok.</Text>
            )}
            {haricSayi > 0 && (
              <Text style={styles.onizlemeText}>{haricSayi} satır ödenmiş veya dekontlu olduğu için değişmeyecek.</Text>
            )}
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 16 }]}>
          <TouchableOpacity style={styles.vazgecBtn} onPress={onClose}>
            <Text style={styles.vazgecText}>Vazgeç</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.olusturBtn, !gecerli && styles.olusturBtnDisabled]}
            onPress={handleUygula}
            disabled={!gecerli}
          >
            <Text style={styles.olusturText}>Uygula</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) => StyleSheet.create({
  container:          { flex: 1, backgroundColor: colors.background },
  header:             { backgroundColor: isDark ? colors.primaryAccent : colors.primary, paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  headerText:         { flex: 1 },
  headerTitle:        { fontSize: 16, fontWeight: '500', color: colors.textOnPrimary },
  headerSub:          { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  closeBtn:           { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeText:          { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  content:            { flex: 1, padding: 16 },
  section:            { marginBottom: 22 },
  sectionTitle:       { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 10, letterSpacing: 0.3 },
  tutarInput:         { fontSize: 20, fontWeight: '600', color: colors.text, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 0.5, borderColor: colors.border, paddingVertical: 12, paddingHorizontal: 14 },
  ayRow:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 0.5, borderColor: colors.border, paddingVertical: 12 },
  okBtn:              { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  okText:             { fontSize: 22, color: colors.text },
  okTextDisabled:     { color: colors.textFaint },
  ayLabel:            { fontSize: 15, fontWeight: '500', color: colors.text, minWidth: 130, textAlign: 'center' },
  onizlemeKutu:       { backgroundColor: colors.infoSurface, borderRadius: 10, borderWidth: 0.5, borderColor: colors.border, padding: 14, gap: 4 },
  onizlemeText:       { fontSize: 13, color: colors.text },
  footer:             { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 16, borderTopWidth: 0.5, borderTopColor: colors.border, backgroundColor: colors.background },
  vazgecBtn:          { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8, backgroundColor: colors.surfaceSubtle },
  vazgecText:         { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
  olusturBtn:         { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8, backgroundColor: isDark ? colors.primaryAccent : colors.primary },
  olusturBtnDisabled: { opacity: 0.5 },
  olusturText:        { fontSize: 14, fontWeight: '600', color: colors.textOnPrimary },
});
