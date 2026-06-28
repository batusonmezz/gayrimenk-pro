import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, Modal, Alert, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { supabase } from '../storage/supabaseClient';
import { getRole } from '../services/authState';
import { useTheme } from '../theme';

type PersonRow = {
  id: string;
  ad_soyad: string;
  telefon: string | null;
  user_id: string | null;
};

function normalizePhone(tel: string | null | undefined): string {
  if (!tel) return '';
  let d = tel.replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);   // uluslararası önek temizle
  if (d.startsWith('90')) return d;
  if (d.startsWith('0'))  return '90' + d.slice(1);
  if (d.startsWith('5'))  return '90' + d;
  return d;
}

export default function KisilerScreen({ navigation }: any) {
  const role = getRole();
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);

  const [persons,      setPersons]      = useState<PersonRow[]>([]);
  const [yukleniyor,   setYukleniyor]   = useState(true);
  const [davetModal,   setDavetModal]   = useState(false);
  const [secilenKisi,  setSecilenKisi]  = useState<PersonRow | null>(null);
  const [inviteEmail,  setInviteEmail]  = useState('');
  const [inviteRole,   setInviteRole]   = useState<'kiraci' | 'mal_sahibi' | null>(null);
  const [gonderiyor,   setGonderiyor]   = useState(false);
  const [sonuc,        setSonuc]        = useState<{ email: string; password: string } | null>(null);

  const listeyiYenile = async () => {
    const { data } = await supabase
      .from('persons')
      .select('id, ad_soyad, telefon, user_id')
      .order('ad_soyad');
    setPersons((data ?? []) as PersonRow[]);
  };

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    (async () => {
      setYukleniyor(true);
      try {
        const { data } = await supabase
          .from('persons')
          .select('id, ad_soyad, telefon, user_id')
          .order('ad_soyad');
        if (!cancelled) setPersons((data ?? []) as PersonRow[]);
      } finally {
        if (!cancelled) setYukleniyor(false);
      }
    })();
    return () => { cancelled = true; };
  }, []));

  const resetDavetForm = () => {
    setInviteEmail('');
    setInviteRole(null);
    setSonuc(null);
    setSecilenKisi(null);
  };

  const handleDavet = async () => {
    if (!secilenKisi || !inviteRole) return;
    const emailTrimmed = inviteEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      Alert.alert('Hata', 'Geçerli bir e-posta giriniz.');
      return;
    }
    setGonderiyor(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { email: emailTrimmed, role: inviteRole, person_id: secilenKisi.id },
      });
      if (error) {
        let errMsg = 'Davet gönderilemedi';
        let status = 0;
        try {
          const ctx = (error as any).context;
          status = ctx?.status ?? 0;
          const body = await ctx?.json?.();
          errMsg = body?.error ?? (error as any).message ?? errMsg;
        } catch { /* ignore */ }
        if (status === 409) errMsg = 'Bu e-posta adresi zaten kayıtlı.';
        Alert.alert('Hata', errMsg);
        return;
      }
      if (!data?.email || !data?.password) {
        Alert.alert('Hata', 'Davet oluşturuldu ancak bilgiler alınamadı.');
        return;
      }
      setSonuc({ email: data.email, password: data.password });
      await listeyiYenile();
    } finally {
      setGonderiyor(false);
    }
  };

  const handleWhatsapp = async (tel: string | null, email: string, password: string) => {
    const no = normalizePhone(tel);
    if (!no) return;
    const mesaj =
      `Merhaba,\n\nGayrimenk uygulamasına davet edildiniz.\n\n` +
      `E-posta: ${email}\nGeçici şifre: ${password}\n\n` +
      `Uygulamadan giriş yapıp ilk girişte şifrenizi değiştirin.`;
    try {
      await Linking.openURL(`https://wa.me/${no}?text=${encodeURIComponent(mesaj)}`);
    } catch {
      Alert.alert('Hata', `WhatsApp açılamadı. Bilgileri not alın:\n\nE-posta: ${email}\nŞifre: ${password}`);
    }
  };

  if (role !== 'emlakci') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kişiler</Text>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Bu bölüme erişim yetkiniz yok.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kişiler</Text>
      </View>

      <ScrollView style={styles.content} scrollEnabled nestedScrollEnabled showsVerticalScrollIndicator>
        {yukleniyor ? (
          <View style={styles.empty}>
            <ActivityIndicator size="large" color={colors.primaryAccent} />
          </View>
        ) : persons.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👤</Text>
            <Text style={styles.emptyText}>Henüz kayıtlı kişi yok</Text>
            <Text style={styles.emptySub}>Sözleşme eklerken kişiler otomatik oluşturulur.</Text>
          </View>
        ) : (
          persons.map(kisi => (
            <View key={kisi.id} style={styles.card}>
              <View style={styles.cardLeft}>
                <Text style={styles.cardAd}>{kisi.ad_soyad}</Text>
                {kisi.telefon ? (
                  <Text style={styles.cardTel}>{kisi.telefon}</Text>
                ) : null}
              </View>
              <View style={styles.cardRight}>
                {kisi.user_id ? (
                  <View style={styles.bagliRozet}>
                    <Text style={styles.bagliText}>Bağlı</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.davetBtn}
                    onPress={() => { setSecilenKisi(kisi); setDavetModal(true); }}
                  >
                    <Text style={styles.davetBtnText}>Davet Et</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={davetModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { resetDavetForm(); setDavetModal(false); }}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Davet Gönder</Text>
            <TouchableOpacity
              onPress={() => { resetDavetForm(); setDavetModal(false); }}
              style={styles.closeBtn}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            {secilenKisi ? (
              <Text style={styles.kisiAd}>{secilenKisi.ad_soyad}</Text>
            ) : null}

            {sonuc === null ? (
              <>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>E-POSTA</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="ornek@mail.com"
                    placeholderTextColor={colors.placeholder}
                    value={inviteEmail}
                    onChangeText={setInviteEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <Text style={styles.fieldLabel2}>ROL</Text>
                <View style={styles.rolRow}>
                  <TouchableOpacity
                    style={[styles.rolBtn, inviteRole === 'kiraci' && styles.rolBtnSecili]}
                    onPress={() => setInviteRole('kiraci')}
                  >
                    <Text style={[styles.rolBtnText, inviteRole === 'kiraci' && styles.rolBtnTextSecili]}>
                      Kiracı
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rolBtn, inviteRole === 'mal_sahibi' && styles.rolBtnSecili]}
                    onPress={() => setInviteRole('mal_sahibi')}
                  >
                    <Text style={[styles.rolBtnText, inviteRole === 'mal_sahibi' && styles.rolBtnTextSecili]}>
                      Mal Sahibi
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    (!inviteEmail.trim() || !inviteRole || gonderiyor) && styles.saveBtnDisabled,
                  ]}
                  onPress={handleDavet}
                  disabled={!inviteEmail.trim() || !inviteRole || gonderiyor}
                >
                  {gonderiyor
                    ? <ActivityIndicator color={colors.textOnPrimary} />
                    : <Text style={styles.saveBtnText}>Davet Oluştur</Text>
                  }
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.sonucKart}>
                  <Text style={styles.sonucBaslik}>Davet Oluşturuldu ✓</Text>
                  <View style={styles.sonucSatir}>
                    <Text style={styles.sonucEtiket}>E-posta</Text>
                    <Text style={styles.sonucDeger}>{sonuc.email}</Text>
                  </View>
                  <View style={styles.sonucSatir}>
                    <Text style={styles.sonucEtiket}>Geçici Şifre</Text>
                    <Text style={styles.sonucSifre}>{sonuc.password}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.whatsappBtn,
                    !normalizePhone(secilenKisi?.telefon) && styles.whatsappBtnDisabled,
                  ]}
                  onPress={() => handleWhatsapp(secilenKisi?.telefon ?? null, sonuc.email, sonuc.password)}
                  disabled={!normalizePhone(secilenKisi?.telefon)}
                >
                  <Text style={styles.whatsappBtnText}>WhatsApp ile Gönder</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.kapatBtn}
                  onPress={() => { resetDavetForm(); setDavetModal(false); }}
                >
                  <Text style={styles.kapatBtnText}>Kapat</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container:       { flex: 1, backgroundColor: colors.background, overflow: 'auto' as any },
    header:          { backgroundColor: colors.primary, paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
    backBtn:         { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    backText:        { fontSize: 28, color: colors.textOnPrimary, lineHeight: 32 },
    headerTitle:     { flex: 1, fontSize: 16, fontWeight: '500', color: colors.textOnPrimary },
    content:         { flex: 1, padding: 12 },
    empty:           { alignItems: 'center', marginTop: 80, gap: 10 },
    emptyIcon:       { fontSize: 48 },
    emptyText:       { fontSize: 15, color: colors.textMuted },
    emptySub:        { fontSize: 12, color: colors.placeholder, textAlign: 'center', paddingHorizontal: 32 },
    card:            { backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 0.5, borderColor: colors.border, flexDirection: 'row', alignItems: 'center' },
    cardLeft:        { flex: 1, gap: 3 },
    cardAd:          { fontSize: 15, fontWeight: '500', color: colors.text },
    cardTel:         { fontSize: 12, color: colors.textMuted },
    cardRight:       { marginLeft: 10 },
    bagliRozet:      { backgroundColor: colors.accentSurface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    bagliText:       { fontSize: 11, color: colors.primaryAccent, fontWeight: '600' },
    davetBtn:        { backgroundColor: isDark ? colors.primaryAccent : colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    davetBtnText:    { fontSize: 12, color: colors.textOnPrimary, fontWeight: '500' },
    modal:           { flex: 1, backgroundColor: colors.background },
    modalHeader:     { backgroundColor: colors.primary, paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
    modalTitle:      { flex: 1, fontSize: 16, fontWeight: '500', color: colors.textOnPrimary },
    closeBtn:        { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    closeText:       { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
    modalContent:    { flex: 1, padding: 12 },
    kisiAd:          { fontSize: 13, color: colors.textMuted, marginBottom: 12, marginTop: 4 },
    fieldRow:        { backgroundColor: colors.surface, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 0.5, borderColor: colors.border },
    fieldLabel:      { fontSize: 11, color: colors.textMuted, fontWeight: '500', marginBottom: 4 },
    fieldLabel2:     { fontSize: 11, color: colors.textMuted, fontWeight: '500', marginBottom: 8, marginLeft: 4 },
    fieldInput:      { fontSize: 14, color: colors.text },
    rolRow:          { flexDirection: 'row', gap: 8, marginBottom: 16 },
    rolBtn:          { flex: 1, padding: 12, borderRadius: 10, backgroundColor: colors.background, borderWidth: 0.5, borderColor: colors.border, alignItems: 'center' },
    rolBtnSecili:    { backgroundColor: isDark ? colors.primaryAccent : colors.primary, borderColor: colors.primary },
    rolBtnText:      { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
    rolBtnTextSecili:{ color: colors.textOnPrimary },
    saveBtn:         { backgroundColor: isDark ? colors.primaryAccent : colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 32 },
    saveBtnDisabled: { opacity: 0.4 },
    saveBtnText:     { color: colors.textOnPrimary, fontSize: 15, fontWeight: '500' },
    sonucKart:       { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 0.5, borderColor: colors.border },
    sonucBaslik:     { fontSize: 15, fontWeight: '600', color: colors.primaryAccent, marginBottom: 12 },
    sonucSatir:      { marginBottom: 8 },
    sonucEtiket:     { fontSize: 11, color: colors.textMuted, fontWeight: '500', marginBottom: 2 },
    sonucDeger:      { fontSize: 14, color: colors.text },
    sonucSifre:      { fontSize: 16, color: colors.text, fontFamily: 'monospace' as any, letterSpacing: 1 },
    whatsappBtn:     { backgroundColor: '#25D366', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 8 },
    whatsappBtnDisabled: { opacity: 0.4 },
    whatsappBtnText: { color: colors.textOnPrimary, fontSize: 15, fontWeight: '500' },
    kapatBtn:        { backgroundColor: colors.background, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 32, borderWidth: 0.5, borderColor: colors.border },
    kapatBtnText:    { color: colors.textSecondary, fontSize: 15, fontWeight: '500' },
  });
