import { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { sozlesmeleriGetir, sozlesmeSil, SozlesmeKayit } from '../services/storage';
import { getRole } from '../services/authState';
import { getCurrentUser } from '../services/auth';
import { supabase } from '../storage/supabaseClient';
import { useTheme } from '../theme';

export default function KayitlarScreen({ navigation }: any) {
  const [kayitlar, setKayitlar] = useState<SozlesmeKayit[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [role, setRoleState] = useState<string | null>(null);
  const [odemeCount, setOdemeCount] = useState<Record<string, number>>({});
  const [rpcYukleniyor, setRpcYukleniyor] = useState<string | null>(null);

  const insets = useSafeAreaInsets();
  const isEmlakci = role === 'emlakci';
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);

  // Rol: cache'ten hızlı yükle, soğuk başlangıçta async çöz
  useEffect(() => {
    const cached = getRole();
    if (cached) {
      setRoleState(cached);
    } else {
      getCurrentUser().then(u => setRoleState(u?.role ?? null));
    }
  }, []);

  // Sözleşme listesi: ekran odaklandığında yenile
  useFocusEffect(useCallback(() => {
    setYukleniyor(true);
    sozlesmeleriGetir()
      .then(setKayitlar)
      .catch(() => {})
      .finally(() => setYukleniyor(false));
  }, []));

  // Ödeme sayıları: role veya kayitlar değişince yenile (soğuk başlangıç güvenli)
  useEffect(() => {
    if (role === null || kayitlar.length === 0) {
      setOdemeCount({});
      return;
    }
    const ids = kayitlar.map(k => k.id);
    supabase
      .from('payments')
      .select('contract_id')
      .in('contract_id', ids)
      .then(({ data: pData }) => {
        const counts: Record<string, number> = {};
        (pData ?? []).forEach((p: { contract_id: string }) => {
          counts[p.contract_id] = (counts[p.contract_id] ?? 0) + 1;
        });
        setOdemeCount(counts);
      });
  }, [role, kayitlar]);

  const handleSil = (id: string, ad: string) => {
    Alert.alert('Sil', `"${ad}" sözleşmesi silinsin mi?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        await sozlesmeSil(id);
        setKayitlar(prev => prev.filter(s => s.id !== id));
      }},
    ]);
  };

  const handleOdemeTablosuOlustur = async (contractId: string) => {
    setRpcYukleniyor(contractId);
    try {
      const { data, error } = await supabase.rpc('create_payment_schedule', {
        p_contract_id: contractId,
      });
      if (error) throw error;
      if (data === 0) {
        Alert.alert('Bilgi', 'Ödeme tablosu zaten mevcut.');
      } else {
        Alert.alert('Başarılı', `${data} aylık ödeme planı oluşturuldu.`);
        setOdemeCount(prev => ({ ...prev, [contractId]: data as number }));
      }
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Ödeme planı oluşturulamadı.');
    } finally {
      setRpcYukleniyor(null);
    }
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

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} scrollEnabled={true} nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
        {yukleniyor ? (
          <View style={styles.empty}>
            <ActivityIndicator size="large" color={colors.primaryAccent} />
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
              <View style={styles.cardRow}>
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
                      kiraciPersonId: kayit.kiraci_person_id ?? null,
                      buildingId: kayit.building_id ?? null,
                      malSahibiPersonId: kayit.mal_sahibi_person_id ?? null,
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
              </View>

              {(isEmlakci || (odemeCount[kayit.id] ?? 0) > 0) && (
                <View style={styles.cardSeparator} />
              )}
              {isEmlakci && (odemeCount[kayit.id] ?? 0) === 0 && (
                <TouchableOpacity
                  onPress={() => handleOdemeTablosuOlustur(kayit.id)}
                  disabled={rpcYukleniyor === kayit.id}
                  style={[styles.odemeBtn, rpcYukleniyor === kayit.id && styles.odemeBtnDisabled]}
                >
                  <Text style={styles.odemeBtnText}>
                    {rpcYukleniyor === kayit.id ? '...' : 'Ödeme Tablosu Oluştur'}
                  </Text>
                </TouchableOpacity>
              )}
              {(odemeCount[kayit.id] ?? 0) > 0 && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('OdemeTakip', {
                    contractId: kayit.id,
                    baslik: `${kayit.kiraya_veren_ad} → ${kayit.kiraci_ad}`,
                  })}
                  style={styles.odemeBtn}
                >
                  <Text style={styles.odemeBtnText}>Ödeme Takibi</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], _isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, overflow: 'auto' as any },
    header: { backgroundColor: colors.primary, paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
    backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    backText: { fontSize: 28, color: colors.textOnPrimary, lineHeight: 32 },
    headerTitle: { flex: 1, fontSize: 16, fontWeight: '500', color: colors.textOnPrimary },
    count: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
    content: { flex: 1, padding: 12 },
    empty: { alignItems: 'center', marginTop: 80, gap: 12 },
    emptyIcon: { fontSize: 48 },
    emptyText: { fontSize: 15, color: colors.textMuted },
    card: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 0.5, borderColor: colors.border, flexDirection: 'column' },
    cardRow: { flexDirection: 'row', alignItems: 'center' },
    cardLeft: { flex: 1, gap: 3 },
    cardTur: { fontSize: 11, color: colors.primaryAccent, fontWeight: '500', letterSpacing: 0.5 },
    cardAd: { fontSize: 14, fontWeight: '500', color: colors.text },
    cardKira: { fontSize: 12, color: colors.textMuted },
    cardRight: { alignItems: 'flex-end', gap: 8 },
    cardTarih: { fontSize: 11, color: colors.textMuted },
    duzenleBtn: { backgroundColor: colors.accentSurface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 4 },
    duzenleText: { fontSize: 11, color: colors.primaryAccent, fontWeight: '500' },
    silBtn: { backgroundColor: colors.errorSurface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    silText: { fontSize: 11, color: colors.error, fontWeight: '500' },
    cardSeparator: { height: 1, backgroundColor: colors.border, marginTop: 10 },
    odemeBtn: { paddingVertical: 8, alignItems: 'center', borderRadius: 6, marginTop: 8, backgroundColor: colors.infoSurface },
    odemeBtnDisabled: { opacity: 0.5 },
    odemeBtnText: { fontSize: 12, color: colors.info, fontWeight: '500' },
  });
