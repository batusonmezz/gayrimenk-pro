import { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

interface OdemePlanModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (p: { odemeGunu: number; ilkDonem: string; aySayisi: number; depozitoDahil: boolean }) => void;
  baslik: string;
  kiraTutariKurus: number;
  sozlesmeBaslangic?: string | null;
}

function parseYerelTarih(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

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

function hesaplaVadeler(ilkDonem: string, odemeGunu: number, aySayisi: number): Date[] {
  const [y0, m0] = ilkDonem.split('-').map(Number);
  const vadeler: Date[] = [];
  for (let i = 0; i < aySayisi; i++) {
    const d = new Date(y0, (m0 - 1) + i, 1);
    const ayninSonGunu = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const gun = odemeGunu === 32 ? ayninSonGunu : Math.min(odemeGunu, ayninSonGunu);
    vadeler.push(new Date(d.getFullYear(), d.getMonth(), gun));
  }
  return vadeler;
}

function formatTL(kurus: number): string {
  const tl = Math.floor(kurus / 100);
  const krs = (kurus % 100).toString().padStart(2, '0');
  return `${tl.toLocaleString('tr-TR')},${krs} ₺`;
}

function formatGunAy(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

export default function OdemePlanModal({ visible, onClose, onConfirm, baslik, kiraTutariKurus, sozlesmeBaslangic }: OdemePlanModalProps) {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const insets = useSafeAreaInsets();

  const [odemeGunu, setOdemeGunu] = useState(1);
  const [ilkDonem, setIlkDonem] = useState(bugununIlkDonemi());
  const [aySayisi, setAySayisi] = useState(12);
  const [depozitoDahil, setDepozitoDahil] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let varsayilanGun = 1;
    if (sozlesmeBaslangic) {
      try {
        varsayilanGun = parseYerelTarih(sozlesmeBaslangic).getDate();
      } catch {
        varsayilanGun = 1;
      }
    }
    setOdemeGunu(varsayilanGun);
    setIlkDonem(bugununIlkDonemi());
    setAySayisi(12);
    setDepozitoDahil(false);
  }, [visible, sozlesmeBaslangic]);

  const secimStyle = (secili: boolean) => ({
    backgroundColor: secili ? (isDark ? colors.primaryAccent : colors.primary) : colors.surfaceSubtle,
    borderColor: secili ? colors.primary : colors.border,
  });
  const secimTextStyle = (secili: boolean) => ({
    color: secili ? colors.textOnPrimary : colors.textSecondary,
  });

  const vadeler = useMemo(
    () => hesaplaVadeler(ilkDonem, odemeGunu, aySayisi),
    [ilkDonem, odemeGunu, aySayisi]
  );
  const ilkVade = vadeler[0];
  const sonVade = vadeler[vadeler.length - 1];
  const toplamKurus = kiraTutariKurus * aySayisi;

  const ilkDonemTarih = ilkDonemToDate(ilkDonem);
  const farkGeri = ayFarki(ilkDonem) <= -24;
  const farkIleri = ayFarki(ilkDonem) >= 24;

  const handleOnceki = () => { if (!farkGeri) setIlkDonem(ayEkle(ilkDonem, -1)); };
  const handleSonraki = () => { if (!farkIleri) setIlkDonem(ayEkle(ilkDonem, 1)); };

  const handleOlustur = () => {
    const gun = Math.min(32, Math.max(1, odemeGunu));
    onConfirm({ odemeGunu: gun, ilkDonem, aySayisi, depozitoDahil });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>{baslik}</Text>
            {kiraTutariKurus > 0 && (
              <Text style={styles.headerSub}>{formatTL(kiraTutariKurus)} / ay</Text>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 32 }}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ödeme Günü</Text>
            <View style={styles.grid}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map(gun => (
                <TouchableOpacity
                  key={gun}
                  style={[styles.gunBtn, secimStyle(odemeGunu === gun)]}
                  onPress={() => setOdemeGunu(gun)}
                >
                  <Text style={[styles.gunText, secimTextStyle(odemeGunu === gun)]}>{gun}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.sonGunBtn, secimStyle(odemeGunu === 32)]}
              onPress={() => setOdemeGunu(32)}
            >
              <Text style={[styles.sonGunText, secimTextStyle(odemeGunu === 32)]}>Ayın son günü</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>İlk Dönem</Text>
            <View style={styles.ayRow}>
              <TouchableOpacity onPress={handleOnceki} disabled={farkGeri} style={styles.okBtn}>
                <Text style={[styles.okText, farkGeri && styles.okTextDisabled]}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.ayLabel}>{AYLAR[ilkDonemTarih.getMonth()]} {ilkDonemTarih.getFullYear()}</Text>
              <TouchableOpacity onPress={handleSonraki} disabled={farkIleri} style={styles.okBtn}>
                <Text style={[styles.okText, farkIleri && styles.okTextDisabled]}>›</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Süre</Text>
            <View style={styles.segmentRow}>
              {[6, 12, 24].map(ay => (
                <TouchableOpacity
                  key={ay}
                  style={[styles.segmentBtn, secimStyle(aySayisi === ay)]}
                  onPress={() => setAySayisi(ay)}
                >
                  <Text style={[styles.segmentText, secimTextStyle(aySayisi === ay)]}>{ay} ay</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setDepozitoDahil(prev => !prev)}
              activeOpacity={0.7}
            >
              <Text style={styles.toggleLabel}>Depozito satırı ekle</Text>
              <View style={[styles.toggleTrack, depozitoDahil && { backgroundColor: isDark ? colors.primaryAccent : colors.primary }]}>
                <View style={[styles.toggleThumb, depozitoDahil && styles.toggleThumbAktif]} />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.onizlemeKutu}>
            <Text style={styles.onizlemeText}>
              İlk vade {formatGunAy(ilkVade)} – son vade {formatGunAy(sonVade)}
            </Text>
            <Text style={styles.onizlemeText}>
              {aySayisi} ödeme{kiraTutariKurus > 0 ? ` · toplam ${formatTL(toplamKurus)}` : ''}
            </Text>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 16 }]}>
          <TouchableOpacity style={styles.vazgecBtn} onPress={onClose}>
            <Text style={styles.vazgecText}>Vazgeç</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.olusturBtn} onPress={handleOlustur}>
            <Text style={styles.olusturText}>Oluştur</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) => StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.background },
  header:           { backgroundColor: isDark ? colors.primaryAccent : colors.primary, paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  headerText:       { flex: 1 },
  headerTitle:      { fontSize: 16, fontWeight: '500', color: colors.textOnPrimary },
  headerSub:        { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  closeBtn:         { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeText:        { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  content:          { flex: 1, padding: 16 },
  section:          { marginBottom: 22 },
  sectionTitle:     { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 10, letterSpacing: 0.3 },
  grid:             { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gunBtn:           { width: '12%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1 },
  gunText:          { fontSize: 13, fontWeight: '500' },
  sonGunBtn:        { marginTop: 8, paddingVertical: 10, alignItems: 'center', borderRadius: 8, borderWidth: 1 },
  sonGunText:       { fontSize: 13, fontWeight: '500' },
  ayRow:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 0.5, borderColor: colors.border, paddingVertical: 12 },
  okBtn:            { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  okText:           { fontSize: 22, color: colors.text },
  okTextDisabled:   { color: colors.textFaint },
  ayLabel:          { fontSize: 15, fontWeight: '500', color: colors.text, minWidth: 130, textAlign: 'center' },
  segmentRow:       { flexDirection: 'row', gap: 8 },
  segmentBtn:       { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, borderWidth: 1 },
  segmentText:      { fontSize: 13, fontWeight: '500' },
  toggleRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: 10, borderWidth: 0.5, borderColor: colors.border, paddingVertical: 12, paddingHorizontal: 14 },
  toggleLabel:      { fontSize: 14, color: colors.text },
  toggleTrack:      { width: 44, height: 26, borderRadius: 13, backgroundColor: colors.surfaceSubtle, padding: 2, alignItems: 'flex-start' },
  toggleThumb:      { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surface },
  toggleThumbAktif: { alignSelf: 'flex-end' },
  onizlemeKutu:     { backgroundColor: colors.infoSurface, borderRadius: 10, borderWidth: 0.5, borderColor: colors.border, padding: 14, gap: 4 },
  onizlemeText:     { fontSize: 13, color: colors.text },
  footer:           { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 16, borderTopWidth: 0.5, borderTopColor: colors.border, backgroundColor: colors.background },
  vazgecBtn:        { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8, backgroundColor: colors.surfaceSubtle },
  vazgecText:       { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
  olusturBtn:       { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8, backgroundColor: isDark ? colors.primaryAccent : colors.primary },
  olusturText:      { fontSize: 14, fontWeight: '600', color: colors.textOnPrimary },
});
