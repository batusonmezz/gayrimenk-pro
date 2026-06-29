import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Modal, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../storage/supabaseClient';
import { getOrganizationId, getRole } from '../services/authState';
import { useTheme } from '../theme';

type Building = {
  id: string;
  ad: string;
  il_ilce: string | null;
  mahalle: string | null;
  cadde_sokak: string | null;
  kapi_no: string | null;
};

const BOSH_FORM = { ad: '', il_ilce: '', mahalle: '', cadde_sokak: '', kapi_no: '' };

export default function SitelerScreen({ navigation }: any) {
  const role = getRole();
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(BOSH_FORM);
  const [kaydediyor, setKaydediyor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const listeyiYenile = async () => {
    const { data } = await supabase
      .from('buildings')
      .select('id, ad, il_ilce, mahalle, cadde_sokak, kapi_no')
      .order('ad');
    setBuildings((data ?? []) as Building[]);
  };

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    (async () => {
      setYukleniyor(true);
      try {
        const { data, error } = await supabase
          .from('buildings')
          .select('id, ad, il_ilce, mahalle, cadde_sokak, kapi_no')
          .order('ad');
        if (!cancelled && !error) setBuildings((data ?? []) as Building[]);
      } finally {
        if (!cancelled) setYukleniyor(false);
      }
    })();
    return () => { cancelled = true; };
  }, []));

  if (role !== 'emlakci') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Siteler / Mülkler</Text>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Bu bölüme erişim yetkiniz yok.</Text>
        </View>
      </View>
    );
  }

  const handleKaydet = async () => {
    if (!form.ad.trim()) {
      Alert.alert('Hata', 'Site adı zorunludur.');
      return;
    }
    setKaydediyor(true);
    try {
      const alanlar = {
        ad: form.ad.trim(),
        il_ilce: form.il_ilce.trim() || null,
        mahalle: form.mahalle.trim() || null,
        cadde_sokak: form.cadde_sokak.trim() || null,
        kapi_no: form.kapi_no.trim() || null,
      };
      if (editingId) {
        const { error } = await supabase.from('buildings').update(alanlar).eq('id', editingId);
        if (error) throw error;
      } else {
        const orgId = getOrganizationId();
        if (!orgId) { Alert.alert('Hata', 'Oturum bilgisi eksik.'); return; }
        const { error } = await supabase.from('buildings').insert({ organization_id: orgId, ...alanlar });
        if (error) throw error;
      }
      setModalVisible(false);
      setForm(BOSH_FORM);
      setEditingId(null);
      await listeyiYenile();
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Site kaydedilemedi.');
    } finally {
      setKaydediyor(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Siteler / Mülkler</Text>
        <TouchableOpacity style={styles.ekleBtn} onPress={() => { setEditingId(null); setForm(BOSH_FORM); setModalVisible(true); }}>
          <Text style={styles.ekleBtnText}>+ Ekle</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} scrollEnabled nestedScrollEnabled showsVerticalScrollIndicator>
        {yukleniyor ? (
          <View style={styles.empty}>
            <ActivityIndicator size="large" color={colors.primaryAccent} />
          </View>
        ) : buildings.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏘️</Text>
            <Text style={styles.emptyText}>Henüz kayıtlı site yok</Text>
            <Text style={styles.emptySub}>Sağ üstteki "+ Ekle" ile site ekleyebilirsiniz.</Text>
          </View>
        ) : (
          buildings.map(b => (
            <View key={b.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardAd}>{b.ad}</Text>
                  {(b.il_ilce || b.mahalle) ? (
                    <Text style={styles.cardSub}>{[b.il_ilce, b.mahalle].filter(Boolean).join(' · ')}</Text>
                  ) : null}
                  {b.cadde_sokak ? (
                    <Text style={styles.cardAlt}>{b.cadde_sokak}{b.kapi_no ? ` No: ${b.kapi_no}` : ''}</Text>
                  ) : null}
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.duzenleBtn}
                    onPress={() => {
                      setForm({ ad: b.ad, il_ilce: b.il_ilce ?? '', mahalle: b.mahalle ?? '', cadde_sokak: b.cadde_sokak ?? '', kapi_no: b.kapi_no ?? '' });
                      setEditingId(b.id);
                      setModalVisible(true);
                    }}
                  >
                    <Text style={styles.duzenleText}>Düzenle</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.silBtn}
                    onPress={() => {
                      Alert.alert('Site Sil', 'Bu siteyi silmek istediğinize emin misiniz?', [
                        { text: 'İptal', style: 'cancel' },
                        { text: 'Sil', style: 'destructive', onPress: async () => {
                          try {
                            const { error } = await supabase.from('buildings').delete().eq('id', b.id);
                            if (error) throw error;
                            await listeyiYenile();
                          } catch (e: any) {
                            Alert.alert('Hata', e?.message ?? 'Silinemedi.');
                          }
                        }},
                      ]);
                    }}
                  >
                    <Text style={styles.silText}>Sil</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingId ? 'Site Düzenle' : 'Yeni Site Ekle'}</Text>
            <TouchableOpacity onPress={() => { setModalVisible(false); setForm(BOSH_FORM); setEditingId(null); }} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            {([
              { key: 'ad',          label: 'Site / Bina Adı *', placeholder: 'Yeşilbahçe Sitesi' },
              { key: 'il_ilce',     label: 'İl / İlçe',         placeholder: 'İstanbul / Kadıköy' },
              { key: 'mahalle',     label: 'Mahalle',            placeholder: 'Moda Mahallesi' },
              { key: 'cadde_sokak', label: 'Cadde / Sokak',     placeholder: 'Bahariye Caddesi' },
              { key: 'kapi_no',     label: 'Kapı / Ada Parsel', placeholder: 'No:12' },
            ] as const).map(f => (
              <View key={f.key} style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder={f.placeholder}
                  placeholderTextColor={colors.placeholder}
                  value={form[f.key]}
                  onChangeText={v => setForm(prev => ({ ...prev, [f.key]: v }))}
                />
              </View>
            ))}
            <TouchableOpacity
              style={[styles.saveBtn, kaydediyor && { opacity: 0.6 }]}
              onPress={handleKaydet}
              disabled={kaydediyor}
            >
              {kaydediyor
                ? <ActivityIndicator color={colors.textOnPrimary} />
                : <Text style={styles.saveBtnText}>Kaydet</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, overflow: 'auto' as any },
    header: { backgroundColor: colors.primary, paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
    backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    backText: { fontSize: 28, color: colors.textOnPrimary, lineHeight: 32 },
    headerTitle: { flex: 1, fontSize: 16, fontWeight: '500', color: colors.textOnPrimary },
    ekleBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    ekleBtnText: { color: colors.textOnPrimary, fontSize: 13, fontWeight: '500' },
    content: { flex: 1, padding: 12 },
    empty: { alignItems: 'center', marginTop: 80, gap: 10 },
    emptyIcon: { fontSize: 48 },
    emptyText: { fontSize: 15, color: colors.textMuted },
    emptySub: { fontSize: 12, color: colors.placeholder, textAlign: 'center', paddingHorizontal: 32 },
    card: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 0.5, borderColor: colors.border },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
    cardAd: { fontSize: 15, fontWeight: '500', color: colors.text, marginBottom: 2 },
    cardSub: { fontSize: 12, color: colors.primaryAccent, marginBottom: 2 },
    cardAlt: { fontSize: 12, color: colors.textMuted },
    cardActions: { flexDirection: 'column', gap: 6, marginLeft: 10 },
    duzenleBtn: { backgroundColor: colors.accentSurface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    duzenleText: { fontSize: 11, color: colors.primaryAccent, fontWeight: '500' },
    silBtn: { backgroundColor: colors.errorSurface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    silText: { fontSize: 11, color: colors.error, fontWeight: '500' },
    modal: { flex: 1, backgroundColor: colors.background },
    modalHeader: { backgroundColor: colors.primary, paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
    modalTitle: { flex: 1, fontSize: 16, fontWeight: '500', color: colors.textOnPrimary },
    closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    closeText: { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
    modalContent: { flex: 1, padding: 12 },
    fieldRow: { backgroundColor: colors.surface, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 0.5, borderColor: colors.border },
    fieldLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '500', marginBottom: 4 },
    fieldInput: { fontSize: 14, color: colors.text },
    saveBtn: { backgroundColor: isDark ? colors.primaryAccent : colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 32 },
    saveBtnText: { color: colors.textOnPrimary, fontSize: 15, fontWeight: '500' },
  });
