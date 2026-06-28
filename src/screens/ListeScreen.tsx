import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { sozlesmeleriGetir, SozlesmeKayit } from '../services/storage';
import { useTheme } from '../theme';

type Filtre = 'Hepsi' | 'Aktif' | 'Bitiyor' | 'Süresi Geçmiş';

function getDurum(bitis: string): { durum: Filtre; durumKey: 'aktif' | 'bitiyor' | 'gecmis'; kalanGun: number } {
  if (!bitis) return { durum: 'Aktif', durumKey: 'aktif', kalanGun: 999 };
  const parts = bitis.split('.');
  if (parts.length !== 3) return { durum: 'Aktif', durumKey: 'aktif', kalanGun: 999 };
  const bitisDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  const kalanGun = Math.floor((bitisDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (kalanGun < 0) return { durum: 'Süresi Geçmiş', durumKey: 'gecmis', kalanGun };
  if (kalanGun <= 60) return { durum: 'Bitiyor', durumKey: 'bitiyor', kalanGun };
  return { durum: 'Aktif', durumKey: 'aktif', kalanGun };
}

export default function ListeScreen({ navigation }: any) {
  const [kayitlar, setKayitlar] = useState<SozlesmeKayit[]>([]);
  const [filtre, setFiltre] = useState<Filtre>('Hepsi');
  const [arama, setArama] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);

  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const durumRenk: Record<string, string> = {
    aktif: colors.success,
    bitiyor: colors.warning,
    gecmis: colors.error,
  };

  useFocusEffect(useCallback(() => {
    setYukleniyor(true);
    sozlesmeleriGetir()
      .then(setKayitlar)
      .catch(() => {})
      .finally(() => setYukleniyor(false));
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
        <View style={[styles.ozetKart, { backgroundColor: colors.successSurface }]}>
          <Text style={[styles.ozetSayi, { color: colors.success }]}>{sayilar.aktif}</Text>
          <Text style={styles.ozetLabel}>Aktif</Text>
        </View>
        <View style={[styles.ozetKart, { backgroundColor: colors.warningSurface }]}>
          <Text style={[styles.ozetSayi, { color: colors.warning }]}>{sayilar.bitiyor}</Text>
          <Text style={styles.ozetLabel}>Bitiyor</Text>
        </View>
        <View style={[styles.ozetKart, { backgroundColor: colors.errorSurface }]}>
          <Text style={[styles.ozetSayi, { color: colors.error }]}>{sayilar.gecmis}</Text>
          <Text style={styles.ozetLabel}>Geçmiş</Text>
        </View>
        <View style={[styles.ozetKart, { backgroundColor: colors.background }]}>
          <Text style={[styles.ozetSayi, { color: colors.text }]}>{kayitlar.length}</Text>
          <Text style={styles.ozetLabel}>Toplam</Text>
        </View>
      </View>

      <View style={styles.aramaRow}>
        <TextInput
          style={styles.aramaInput}
          placeholder="Kiracı, mal sahibi, daire ara..."
          value={arama}
          onChangeText={setArama}
          placeholderTextColor={colors.textMuted}
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
              const { durum, durumKey } = getDurum(bitis);
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
                  <Text style={[styles.td, { width: 80, color: durumRenk[durumKey], fontWeight: '600' }]} numberOfLines={1}>{durum}</Text>
                </TouchableOpacity>
              );
            })}
            {yukleniyor ? (
              <View style={styles.bosView}>
                <ActivityIndicator size="large" color={colors.primaryAccent} />
              </View>
            ) : filtrelenmis.length === 0 && (
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

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, overflow: 'auto' as any },
    header: { backgroundColor: colors.primary, paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
    backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    backText: { fontSize: 28, color: colors.textOnPrimary, lineHeight: 32 },
    headerTitle: { fontSize: 16, fontWeight: '500', color: colors.textOnPrimary },
    ozet: { flexDirection: 'row', padding: 10, gap: 8 },
    ozetKart: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
    ozetSayi: { fontSize: 18, fontWeight: '600' },
    ozetLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
    aramaRow: { paddingHorizontal: 10, paddingBottom: 8 },
    aramaInput: { backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, borderWidth: 0.5, borderColor: colors.border, color: colors.text },
    filtreSatiri: { maxHeight: 44, paddingLeft: 10 },
    filtreRow: { flexDirection: 'row', gap: 8, paddingRight: 10, paddingBottom: 8 },
    filtreBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 0.5, borderColor: colors.border },
    filtreBtnAktif: { backgroundColor: isDark ? colors.primaryAccent : colors.primary, borderColor: colors.primary },
    filtreText: { fontSize: 12, color: colors.textMuted },
    filtreTextAktif: { color: colors.textOnPrimary, fontWeight: '500' },
    tableHeader: { flexDirection: 'row', backgroundColor: colors.primary, paddingVertical: 8 },
    th: { color: colors.textOnPrimary, fontSize: 11, fontWeight: '600', paddingHorizontal: 8 },
    tableRow: { flexDirection: 'row', paddingVertical: 10, backgroundColor: colors.surface, borderBottomWidth: 0.5, borderBottomColor: colors.border },
    tableRowAlt: { backgroundColor: colors.surfaceAlt },
    td: { fontSize: 12, color: colors.text, paddingHorizontal: 8 },
    bosView: { padding: 40, alignItems: 'center' },
    bosText: { color: colors.textMuted, fontSize: 14 },
  });
